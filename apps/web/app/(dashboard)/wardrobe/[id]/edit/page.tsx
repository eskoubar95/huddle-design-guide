'use client'

import { useState, useRef, useEffect, useCallback } from "react";
import * as React from "react";
import { useParams, useRouter } from "next/navigation";
// Removed unused imports: ArrowLeft, Loader2, Sparkles, CheckCircle2, Info, X
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
// Removed unused import: BadgeUI
import { useToast } from "@/hooks/use-toast";
import { useJersey, useUpdateJersey } from "@/lib/hooks/use-jerseys";
import { jerseyUpdateSchema, type JerseyUpdateInput } from "@/lib/validation/jersey-schemas";
// Removed unused import: JerseyDTO
import { useUser, useAuth } from "@clerk/nextjs";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { EditImageUpload } from "@/components/jersey/EditImageUpload";
// Removed unused import: Controller
import { useMetadataMatching } from "@/hooks/use-metadata-matching";
import { useQuery } from "@tanstack/react-query";
import { JerseyInfoSection } from "@/components/jersey/edit/JerseyInfoSection";
import { MetadataMatchingSection } from "@/components/jersey/edit/MetadataMatchingSection";
import { PlayerPrintSection } from "@/components/jersey/edit/PlayerPrintSection";
import { ConditionNotesSection } from "@/components/jersey/edit/ConditionNotesSection";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImageItem {
  id: string;
  url: string;
  isNew: boolean;
  file?: File;
  preview?: string;
  jerseyImageId?: string; // ID from jersey_images table for existing images
}


const EditJerseyPage = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();
  const { getToken } = useAuth();
  const jerseyId = params.id || "";
  const updateJersey = useUpdateJersey();

  const [images, setImages] = useState<ImageItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Metadata FK state
  const [clubId, setClubId] = useState<string>('');
  const [playerId, setPlayerId] = useState<string>('');
  const [seasonLabel, setSeasonLabel] = useState<string>(''); // Use label instead of UUID for direct display
  const [seasonId, setSeasonId] = useState<string>(''); // Keep UUID for database operations
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const [autoLinkSuccess, setAutoLinkSuccess] = useState(false);
  
  // Track original data to detect changes
  const [originalData, setOriginalData] = useState<{
    formData: JerseyUpdateInput;
    images: ImageItem[];
  } | null>(null);

  // Fetch jersey data
  const {
    data: jersey,
    isLoading: jerseyLoading,
  } = useJersey(jerseyId);

  // React Hook Form setup
  const form = useForm<JerseyUpdateInput>({
    resolver: zodResolver(jerseyUpdateSchema),
    defaultValues: {
      club: "",
      season: "",
      jerseyType: "Home",
      playerName: undefined,
      playerNumber: undefined,
      badges: undefined,
      conditionRating: 8,
      notes: undefined,
      visibility: "public",
    },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });

  // Initialize form and images when jersey data loads
  useEffect(() => {
    if (jersey) {
      const formData = {
        club: jersey.club,
        season: jersey.season,
        jerseyType: jersey.jersey_type as JerseyUpdateInput["jerseyType"],
        playerName: jersey.player_name || undefined,
        playerNumber: jersey.player_number || undefined,
        badges: jersey.competition_badges || undefined,
        conditionRating: jersey.condition_rating || undefined,
        notes: jersey.notes || undefined,
        visibility: jersey.visibility as "public" | "private",
        // Initialize metadata FK's if they exist
        clubId: jersey.club_id || undefined,
        playerId: jersey.player_id || undefined,
        seasonId: jersey.season_id || undefined,
      };
      
      form.reset(formData, { keepDefaultValues: false });

      // Initialize metadata FK state (convert null/undefined to empty string for consistency)
      setClubId(jersey.club_id || '');
      setPlayerId(jersey.player_id || '');
      const initialSeasonId = jersey.season_id || '';
      setSeasonId(initialSeasonId);
      // seasonLabel will be set by the query below

      // Initialize images from jersey (use original URLs from imageVariants if available)
      let initialImages: ImageItem[];
      if (jersey.imageVariants && jersey.imageVariants.length > 0) {
        initialImages = jersey.imageVariants.map((variant, index) => ({
          id: variant.id || `existing-${index}`,
          url: variant.originalUrl,
          isNew: false,
          jerseyImageId: variant.id,
        }));
      } else {
        // Fallback to legacy images array
        const imageUrls = jersey.images || [];
        initialImages = imageUrls.map((url, index) => ({
          id: `existing-${index}`,
          url,
          isNew: false,
        }));
      }
      setImages(initialImages);
      
      // Store original data for change detection
      // Use the same formData structure we just reset with
      setOriginalData({
        formData,
        images: initialImages,
      });
    }
  }, [jersey, form]);

  // Get form values for matching query
  const playerNumber = form.watch('playerNumber');
  const playerName = form.watch('playerName');
  const seasonText = form.watch('season');
  const club = form.watch('club');

  // Fetch seasons for dropdown
  const { data: seasonsData } = useQuery<{ seasons: Array<{ id: string; label: string; start_year: number; end_year: number }> }>({
    queryKey: ['metadata-seasons'],
    queryFn: async () => {
      const response = await fetch('/api/v1/metadata/seasons');
      if (!response.ok) throw new Error('Failed to fetch seasons');
      return response.json();
    },
  });

  // Fetch selected season if seasonId is set (always fetch if seasonId exists, even if in list)
  const { data: selectedSeasonData } = useQuery<{ seasons: Array<{ id: string; label: string; start_year: number; end_year: number }> }>({
    queryKey: ['metadata-season-by-id', seasonId],
    queryFn: async () => {
      if (!seasonId) return { seasons: [] };
      const response = await fetch(`/api/v1/metadata/seasons?id=${encodeURIComponent(seasonId)}`);
      if (!response.ok) return { seasons: [] };
      return response.json();
    },
    enabled: !!seasonId,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Set seasonLabel when season data is loaded
  React.useEffect(() => {
    if (selectedSeasonData?.seasons && selectedSeasonData.seasons.length > 0 && !seasonLabel) {
      setSeasonLabel(selectedSeasonData.seasons[0].label);
    }
  }, [selectedSeasonData, seasonLabel]);

  // Fetch selected player if playerId is set
  const { data: selectedPlayerData } = useQuery<{ player: { id: string; full_name: string; current_shirt_number?: number | null } }>({
    queryKey: ['metadata-player-by-id', playerId],
    queryFn: async () => {
      if (!playerId) return null;
      const response = await fetch(`/api/v1/metadata/players/${encodeURIComponent(playerId)}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!playerId,
    staleTime: 300000, // Cache for 5 minutes
  });

  // Combine seasons data (all seasons + selected season if not in list)
  const allSeasons = React.useMemo(() => {
    const seasons = seasonsData?.seasons || [];
    if (selectedSeasonData?.seasons && selectedSeasonData.seasons.length > 0) {
      const selectedSeason = selectedSeasonData.seasons[0];
      // Always include selected season at the top if it exists
      const filteredSeasons = seasons.filter((s) => s.id !== selectedSeason.id);
      return [selectedSeason, ...filteredSeasons];
    }
    return seasons;
  }, [seasonsData, selectedSeasonData]);

  // Player matching query (works with or without playerNumber)
  const matchingQuery = useMetadataMatching(
    clubId && (seasonId || seasonLabel || seasonText)
      ? {
          clubId,
          seasonId: seasonId || undefined,
          seasonLabel: seasonId ? undefined : (seasonLabel || seasonText),
          jerseyNumber: playerNumber ? parseInt(playerNumber, 10) : undefined,
          playerNameHint: playerName,
        }
      : null
  );

  // Deduplicate and sort player matching results by confidence score
  // Exclude currently selected player to avoid duplicate keys in SelectItem
  const uniquePlayerResults = React.useMemo(() => {
    if (!matchingQuery.data) return [];
    
    // Deduplicate by playerId (keep highest confidence score)
    const playerMap = new Map<string, typeof matchingQuery.data[0]>();
    for (const result of matchingQuery.data) {
      const existing = playerMap.get(result.playerId);
      if (!existing || result.confidenceScore > existing.confidenceScore) {
        playerMap.set(result.playerId, result);
      }
    }
    
    // Filter out currently selected player to prevent duplicate keys
    const results = Array.from(playerMap.values())
      .filter((result) => result.playerId !== playerId)
      .sort((a, b) => b.confidenceScore - a.confidenceScore);
    
    return results;
  }, [matchingQuery, playerId]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!originalData || !jersey) return false;
    
    // Quick check: if form is not dirty and no new images, no changes
    const hasNewImages = images.some(img => img.isNew);
    if (!form.formState.isDirty && !hasNewImages && images.length === originalData.images.length) {
      // Still need to check image order
      const originalUrls = originalData.images.map(img => img.url);
      const currentUrls = images.filter(img => !img.isNew).map(img => img.url);
      const orderChanged = currentUrls.some((url, idx) => url !== originalUrls[idx]);
      if (!orderChanged) return false;
    }
    
    const currentFormData = form.getValues();
    
    // Normalize form data for comparison (handle undefined vs null, arrays, etc.)
    const normalizeFormData = (data: JerseyUpdateInput): string => {
      const normalized: Record<string, unknown> = {};
      Object.keys(data).forEach(key => {
        const value = (data as Record<string, unknown>)[key];
        // Convert null to undefined for consistent comparison
        if (value === null) {
          normalized[key] = undefined;
        } else if (Array.isArray(value)) {
          // Sort arrays for comparison
          normalized[key] = [...value].sort();
        } else {
          normalized[key] = value;
        }
      });
      return JSON.stringify(normalized, Object.keys(normalized).sort());
    };
    
    const formChanged = normalizeFormData(currentFormData) !== normalizeFormData(originalData.formData);
    
    // Check if images changed (count, order, or new images)
    // Compare based on URLs and order, not IDs (since IDs are generated)
    const originalUrls = originalData.images.map(img => img.url);
    const currentUrls = images.filter(img => !img.isNew).map(img => img.url);
    
    const imagesChanged = 
      hasNewImages ||
      images.length !== originalData.images.length ||
      currentUrls.length !== originalUrls.length ||
      currentUrls.some((url, idx) => url !== originalUrls[idx]);
    
    return formChanged || imagesChanged;
  }, [originalData, jersey, images, form]);

  // Handle navigation with unsaved changes check
  // Note: handleNavigation is defined but not currently used - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleNavigation = useCallback((navigateFn: () => void) => {
    if (hasUnsavedChanges()) {
      setPendingNavigation(() => navigateFn);
      setShowUnsavedDialog(true);
    } else {
      navigateFn();
    }
  }, [hasUnsavedChanges]);

  // Handle browser refresh/close with beforeunload
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Update TopNav about unsaved changes state (shared between form watch and image handlers)
  const updateUnsavedChangesState = useCallback(() => {
    const hasChanges = hasUnsavedChanges();
    window.dispatchEvent(new CustomEvent('unsavedChangesUpdate', {
      detail: { hasChanges }
    }));
  }, [hasUnsavedChanges]);

  // Handle custom events from TopNav
  useEffect(() => {
    const handleCheckUnsavedChanges = (e: Event) => {
      const customEvent = e as CustomEvent<{ navigate: () => void }>;
      if (customEvent.detail?.navigate) {
        // Check if there are unsaved changes
        const hasChanges = hasUnsavedChanges();
        if (hasChanges) {
          setPendingNavigation(() => customEvent.detail.navigate);
          setShowUnsavedDialog(true);
        } else {
          // No unsaved changes, navigate immediately
          customEvent.detail.navigate();
        }
      }
    };

    const handleSave = () => {
      // Trigger form submit by finding the form and calling requestSubmit
      const formElement = document.querySelector('form');
      if (formElement && formElement.requestSubmit) {
        formElement.requestSubmit();
      }
    };

    // Initial update
    updateUnsavedChangesState();

    // Update when form values change
    const subscription = form.watch(() => {
      updateUnsavedChangesState();
    });

    window.addEventListener('checkUnsavedChanges', handleCheckUnsavedChanges);
    window.addEventListener('saveJersey', handleSave);
    
    return () => {
      window.removeEventListener('checkUnsavedChanges', handleCheckUnsavedChanges);
      window.removeEventListener('saveJersey', handleSave);
      subscription.unsubscribe();
    };
  }, [hasUnsavedChanges, form, updateUnsavedChangesState]);

  // Check if user is owner
  const isOwner = user?.id === jersey?.owner_id;

  // Redirect if not owner
  useEffect(() => {
    if (jersey && !isOwner) {
      toast({
        title: "Access Denied",
        description: "You can only edit your own jerseys",
        variant: "destructive",
      });
      router.push(`/wardrobe/${jerseyId}`);
    }
  }, [jersey, isOwner, router, jerseyId, toast]);

  // Image handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 5 - images.length;

    if (files.length > remainingSlots) {
      toast({
        title: "Too Many Images",
        description: `You can only upload ${remainingSlots} more image(s)`,
        variant: "destructive",
      });
      return;
    }

    const invalidFiles: string[] = [];
    files.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      toast({
        title: "File Too Large",
        description: `${invalidFiles.join(", ")} ${invalidFiles.length === 1 ? "is" : "are"} larger than 5MB`,
        variant: "destructive",
      });
    }

    const validFiles = files.filter((file) => file.size <= 5 * 1024 * 1024);
    const newImages: ImageItem[] = validFiles.map((file) => ({
      id: Math.random().toString(36),
      url: "",
      isNew: true,
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages([...images, ...newImages]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Update unsaved changes state when images change
    updateUnsavedChangesState();
  };

  const removeImage = (id: string) => {
    const image = images.find((img) => img.id === id);
    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }
    setImages(images.filter((img) => img.id !== id));
    // Update unsaved changes state when images change
    updateUnsavedChangesState();
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    setImages(newImages);
    setDraggedIndex(index);
    // Update unsaved changes state when images change
    updateUnsavedChangesState();
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);
    
    // Update sort_order in database when images are reordered
    if (!jersey || !user) return;
    
    // Only update if we have existing images (not new uploads)
    const existingImages = images.filter((img) => !img.isNew);
    if (existingImages.length === 0) return;

    try {
      const token = await getToken();
      if (!token) return;

      const imageUrls = existingImages.map((img) => img.url);
      
      const response = await fetch(`/api/v1/jerseys/${jerseyId}/reorder-images`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ imageUrls }),
      });

      if (!response.ok) {
        console.error("Failed to update image order:", await response.text());
        // Don't show error toast - this is a background operation
      }
    } catch (error) {
      console.error("Error updating image order:", error);
      // Don't show error toast - this is a background operation
    }
  };

  const toggleBadge = (badge: string) => {
    const currentBadges = form.getValues("badges") || [];
    if (currentBadges.includes(badge)) {
      form.setValue("badges", currentBadges.filter((b) => b !== badge));
    } else {
      form.setValue("badges", [...currentBadges, badge]);
    }
  };

  // Auto-link handler
  const handleAutoLink = async () => {
    if (!jersey || !club || !seasonText) {
      toast({
        title: "Missing information",
        description: "Please ensure club and season are filled in before auto-linking.",
        variant: "destructive",
      });
      return;
    }

    setIsAutoLinking(true);
    setAutoLinkSuccess(false);

    try {
      const token = await getToken();
      const response = await fetch(`/api/v1/jerseys/${jerseyId}/auto-link-metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Auto-link failed' } }));
        throw new Error(error.error?.message || 'Auto-link failed');
      }

      const result = await response.json();
      
      if (result.success) {
        setAutoLinkSuccess(true);
        
        // Update local state with linked metadata if available
        if (result.result) {
          if (result.result.clubId) setClubId(result.result.clubId);
          if (result.result.seasonId) setSeasonId(result.result.seasonId);
          if (result.result.playerId) setPlayerId(result.result.playerId);
        }

        toast({
          title: "Metadata linked",
          description: result.linked
            ? "Jersey has been linked to official data."
            : "Could not find a match with high confidence. Please select manually.",
          variant: result.linked ? "default" : "destructive",
        });
      }
    } catch (error) {
      console.error('Auto-link error:', error);
      toast({
        title: "Auto-link failed",
        description: error instanceof Error ? error.message : "Failed to auto-link metadata. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAutoLinking(false);
    }
  };

  // Submit handler
  const handleSubmit = async (data: JerseyUpdateInput) => {
    if (images.length < 1) {
      toast({
        title: "No Images",
        description: "Please keep at least 1 image",
        variant: "destructive",
      });
      return;
    }

    if (images.length > 5) {
      toast({
        title: "Too Many Images",
        description: "Maximum 5 images allowed",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Not Authenticated",
        description: "Please log in to update a jersey",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Get auth token from Clerk once at the start
      const token = await getToken();
      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      // Upload new images to storage
      const imageUrls: string[] = [];
      const newImagesToUpload = images.filter((img) => img.isNew && img.file);
      const totalImages = newImagesToUpload.length;

      if (newImagesToUpload.length > 0) {
        for (let i = 0; i < newImagesToUpload.length; i++) {
          const image = newImagesToUpload[i];
          if (!image.file) continue;

          // Create FormData for file upload
          const formData = new FormData();
          formData.append("file", image.file);

          // Upload via API route
          const response = await fetch("/api/v1/jerseys/upload-image", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
            
            // Handle both legacy format ({ error: "string" }) and new format ({ error: { message: "...", code: "..." } })
            let errorMessage = `Failed to upload ${image.file.name}`;
            if (errorData.error) {
              if (typeof errorData.error === "string") {
                errorMessage = `${errorMessage}: ${errorData.error}`;
              } else if (errorData.error.message) {
                errorMessage = `${errorMessage}: ${errorData.error.message}`;
                if (errorData.error.details) {
                  errorMessage += ` (${errorData.error.details})`;
                }
              }
            } else {
              errorMessage = `${errorMessage}: ${response.statusText}`;
            }
            
            throw new Error(errorMessage);
          }

          const responseData = await response.json();
          imageUrls.push(responseData.url);
          setUploadProgress(((i + 1) / totalImages) * 100);
        }
      }

      // Combine existing URLs with new URLs (maintain order)
      const existingUrls = images.filter((img) => !img.isNew).map((img) => img.url);
      const allImageUrls = [...existingUrls, ...imageUrls];

      // Update sort_order for all images based on final order
      if (token && allImageUrls.length > 0) {
        try {
          const response = await fetch(`/api/v1/jerseys/${jerseyId}/reorder-images`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ imageUrls: allImageUrls }),
          });

          if (!response.ok) {
            console.error("Failed to update image order:", await response.text());
            // Continue with jersey update even if reorder fails
          }
        } catch (error) {
          console.error("Error updating image order:", error);
          // Continue with jersey update even if reorder fails
        }
      }

      // Resolve seasonId from seasonLabel if needed
      let resolvedSeasonId = seasonId;
      if (seasonLabel && !seasonId) {
        // Find season by label to get UUID
        const season = allSeasons.find((s) => s.label === seasonLabel) || 
                      selectedSeasonData?.seasons?.find((s) => s.label === seasonLabel);
        if (season) {
          resolvedSeasonId = season.id;
        } else {
          // Try to fetch season by label from API
          try {
            const response = await fetch(`/api/v1/metadata/seasons?label=${encodeURIComponent(seasonLabel)}`);
            if (response.ok) {
              const data = await response.json();
              if (data.seasons && data.seasons.length > 0) {
                resolvedSeasonId = data.seasons[0].id;
              }
            }
          } catch (error) {
            console.error('Failed to resolve season by label:', error);
          }
        }
      }

      // Update jersey via API (include metadata FK's)
      await updateJersey.mutateAsync({
        id: jerseyId,
        data: {
          ...data,
          badges: data.badges && data.badges.length > 0 ? data.badges : undefined,
          images: allImageUrls,
          // Include metadata FK's
          clubId: clubId || undefined,
          playerId: playerId || undefined,
          seasonId: resolvedSeasonId || undefined,
        },
      });

      toast({
        title: "Jersey Updated!",
        description: "Your jersey has been updated successfully",
      });

      // Cleanup
      images.forEach((img) => {
        if (img.preview) {
          URL.revokeObjectURL(img.preview);
        }
      });

      // Update original data after successful save
      const savedImages: ImageItem[] = allImageUrls.map((url, index) => ({
        id: `saved-${index}`,
        url,
        isNew: false,
      }));
      
      setOriginalData({
        formData: data,
        images: savedImages,
      });

      // Navigate back to jersey detail
      router.push(`/wardrobe/${jerseyId}`);
    } catch (error) {
      console.error("Error updating jersey:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update jersey. Please try again.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (jerseyLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading jersey...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!jersey) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-xl font-bold mb-2">Jersey Not Found</h2>
            <p className="text-muted-foreground mb-4">This jersey doesn&apos;t exist or is private</p>
            <Button onClick={() => router.push("/wardrobe")}>Back to Wardrobe</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!isOwner) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You can only edit your own jerseys</p>
            <Button onClick={() => router.push(`/wardrobe/${jerseyId}`)}>Back to Jersey</Button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6">
        
          {/* Upload Progress */}
          {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mb-6">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Uploading images... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          {/* Layout: Image Gallery Left, Form Right on laptop+ */}
          <FormProvider {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Left: Image Upload */}
                <div className="lg:sticky lg:top-20 lg:self-start">
                  <EditImageUpload
                    images={images}
                    fileInputRef={fileInputRef}
                    onFileSelect={handleFileSelect}
                    onRemoveImage={removeImage}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  />
                </div>

                {/* Right: Form Fields */}
                <div className="space-y-6">
                  {/* Jersey Information */}
                  <JerseyInfoSection
                    control={form.control}
                    errors={form.formState.errors}
                  />

                  {/* Metadata Matching (Optional) */}
                  <MetadataMatchingSection
                    clubId={clubId}
                    playerId={playerId}
                    seasonLabel={seasonLabel}
                    seasonId={seasonId}
                    isAutoLinking={isAutoLinking}
                    autoLinkSuccess={autoLinkSuccess}
                    club={club || ''}
                    season={seasonText || ''}
                    playerNumber={playerNumber}
                    playerName={playerName}
                    allSeasons={allSeasons}
                    selectedSeasonData={selectedSeasonData}
                    selectedPlayerData={selectedPlayerData}
                    matchingQuery={matchingQuery}
                    uniquePlayerResults={uniquePlayerResults}
                    onClubChange={(value) => {
                      setClubId(value || '');
                      if (!value) {
                        setPlayerId('');
                        setSeasonId('');
                      }
                    }}
                    onSeasonChange={(label) => {
                      const season = allSeasons.find((s) => s.label === label) || 
                                    selectedSeasonData?.seasons?.find((s) => s.label === label);
                      if (season) {
                        setSeasonLabel(season.label);
                        setSeasonId(season.id);
                      } else {
                        setSeasonLabel(label);
                      }
                    }}
                    onPlayerChange={setPlayerId}
                    onClearSeason={() => {
                      setSeasonId('');
                      setSeasonLabel('');
                      setPlayerId('');
                    }}
                    onClearPlayer={() => setPlayerId('')}
                    onAutoLink={handleAutoLink}
                    onDismissAutoLinkSuccess={() => setAutoLinkSuccess(false)}
                  />

                  {/* Player Print */}
                  <PlayerPrintSection
                    clubId={clubId}
                    seasonId={seasonId}
                    control={form.control}
                    watch={form.watch}
                    onToggleBadge={toggleBadge}
                  />

                  {/* Condition & Notes */}
                  <ConditionNotesSection
                    control={form.control}
                    watch={form.watch}
                  />

                </div>
              </div>
            </form>
          </FormProvider>
        </div>
      </div>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingNavigation(null)}>
              Stay on Page
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingNavigation) {
                  pendingNavigation();
                  setPendingNavigation(null);
                }
                setShowUnsavedDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
};

export default EditJerseyPage;

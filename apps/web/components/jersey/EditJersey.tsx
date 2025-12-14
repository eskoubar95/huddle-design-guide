'use client'

import { useState, useRef, useEffect } from "react";
import { GripVertical, Trash2, Upload, Loader2 } from "lucide-react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge as BadgeUI } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useUpdateJersey } from "@/lib/hooks/use-jerseys";
import { useQuery } from "@tanstack/react-query";
import { jerseyUpdateSchema, type JerseyUpdateInput } from "@/lib/validation/jersey-schemas";
import { useUser, useAuth } from "@clerk/nextjs";
import { Controller } from "react-hook-form";

interface EditJerseyProps {
  jersey: {
    id: string;
    club: string;
    season: string;
    jersey_type: string;
    player_name?: string | null;
    player_number?: string | null;
    competition_badges?: string[] | null;
    condition_rating?: number | null;
    notes?: string | null;
    visibility: string;
    images: string[];
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ImageItem {
  id: string;
  url: string;
  isNew: boolean;
  file?: File;
  preview?: string;
}

const JERSEY_TYPES = [
  "Home",
  "Away",
  "Third",
  "Fourth",
  "Special Edition",
  "GK Home",
  "GK Away",
  "GK Third",
];


export const EditJersey = ({ jersey, isOpen, onClose, onSuccess }: EditJerseyProps) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const updateJersey = useUpdateJersey();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // React Hook Form setup
  const form = useForm<JerseyUpdateInput>({
    resolver: zodResolver(jerseyUpdateSchema),
    defaultValues: {
      club: jersey.club,
      season: jersey.season,
      jerseyType: jersey.jersey_type as JerseyUpdateInput["jerseyType"],
      playerName: jersey.player_name || undefined,
      playerNumber: jersey.player_number || undefined,
      badges: jersey.competition_badges || undefined,
      conditionRating: jersey.condition_rating || undefined,
      notes: jersey.notes || undefined,
      visibility: jersey.visibility as "public" | "private",
    },
    mode: "onSubmit",
    reValidateMode: "onBlur",
  });
  
  // Get clubId and seasonId from form values for fetching competitions
  const clubText = form.watch("club");
  const seasonText = form.watch("season");
  
  // Fetch clubId from club name
  const { data: clubData } = useQuery<{ clubs: Array<{ id: string; name: string }> }>({
    queryKey: ['club-by-name', clubText],
    queryFn: async () => {
      if (!clubText) return { clubs: [] };
      const response = await fetch(`/api/v1/metadata/clubs/search?q=${encodeURIComponent(clubText)}`);
      if (!response.ok) return { clubs: [] };
      const result = await response.json();
      // Find exact match
      const exactMatch = result.clubs?.find((c: { name: string }) => c.name === clubText);
      return { clubs: exactMatch ? [exactMatch] : [] };
    },
    enabled: !!clubText && isOpen,
    staleTime: 300000,
  });
  
  const clubId = clubData?.clubs?.[0]?.id;
  
  // Fetch seasonId from season label
  const { data: seasonsData } = useQuery<{ seasons: Array<{ id: string; label: string }> }>({
    queryKey: ['seasons'],
    queryFn: async () => {
      const response = await fetch('/api/v1/metadata/seasons');
      if (!response.ok) return { seasons: [] };
      return response.json();
    },
    enabled: !!seasonText && isOpen,
    staleTime: 300000,
  });
  
  const seasonId = seasonsData?.seasons?.find(s => s.label === seasonText)?.id;
  
  // Fetch competitions for club and season
  const { data: competitionsData, isLoading: competitionsLoading } = useQuery<{ competitions: Array<{ id: string; name: string }> }>({
    queryKey: ['metadata-competitions', clubId, seasonId],
    queryFn: async () => {
      if (!clubId || !seasonId) return { competitions: [] };
      const response = await fetch(`/api/v1/metadata/competitions?clubId=${encodeURIComponent(clubId)}&seasonId=${encodeURIComponent(seasonId)}`);
      if (!response.ok) {
        return { competitions: [] };
      }
      return response.json();
    },
    enabled: !!clubId && !!seasonId && isOpen,
    staleTime: 300000,
  });
  
  const availableCompetitions = competitionsData?.competitions?.map(c => c.name) || [];

  // Initialize images from jersey
  useEffect(() => {
    if (isOpen && jersey) {
      const initialImages: ImageItem[] = jersey.images.map((url, index) => ({
        id: `existing-${index}`,
        url,
        isNew: false,
      }));
      setImages(initialImages);
    }
  }, [isOpen, jersey]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setImages([]);
      setUploadProgress(0);
      setIsSubmitting(false);
      setDraggedIndex(null);
    } else if (jersey) {
      form.reset({
        club: jersey.club,
        season: jersey.season,
        jerseyType: jersey.jersey_type as JerseyUpdateInput["jerseyType"],
        playerName: jersey.player_name || undefined,
        playerNumber: jersey.player_number || undefined,
        badges: jersey.competition_badges || undefined,
        conditionRating: jersey.condition_rating || undefined,
        notes: jersey.notes || undefined,
        visibility: jersey.visibility as "public" | "private",
      });
    }
  }, [isOpen, jersey, form]);

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
  };

  const removeImage = (id: string) => {
    const image = images.find((img) => img.id === id);
    if (image?.preview) {
      URL.revokeObjectURL(image.preview);
    }
    setImages(images.filter((img) => img.id !== id));
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
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleBadge = (badge: string) => {
    const currentBadges = form.getValues("badges") || [];
    if (currentBadges.includes(badge)) {
      form.setValue("badges", currentBadges.filter((b) => b !== badge));
    } else {
      form.setValue("badges", [...currentBadges, badge]);
    }
  };

  // Submit handler
  const onSubmit = async (data: JerseyUpdateInput) => {
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
      // Upload new images to storage
      const imageUrls: string[] = [];
      const newImagesToUpload = images.filter((img) => img.isNew && img.file);
      const totalImages = newImagesToUpload.length;

      if (newImagesToUpload.length > 0) {
        // Get auth token from Clerk
        const token = await getToken();
        if (!token) {
          throw new Error("Failed to get authentication token");
        }

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

          const data = await response.json();
          imageUrls.push(data.url);
          setUploadProgress(((i + 1) / totalImages) * 100);
        }
      }

      // Combine existing URLs with new URLs
      const existingUrls = images.filter((img) => !img.isNew).map((img) => img.url);
      const allImageUrls = [...existingUrls, ...imageUrls];

      // Update jersey via API
      await updateJersey.mutateAsync({
        id: jersey.id,
        data: {
          ...data,
          badges: data.badges && data.badges.length > 0 ? data.badges : undefined,
          images: allImageUrls,
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
      onSuccess?.();
      onClose();
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

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Jersey</DialogTitle>
        </DialogHeader>

        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Images Section */}
            <div>
              <Label>Images *</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Drag to reorder. Click to remove. Maximum 5 images.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    className="relative group aspect-[3/4] rounded-lg overflow-hidden border border-border bg-secondary"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <img
                      src={image.preview || image.url}
                      alt={`Jersey image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <GripVertical className="w-4 h-4 text-white" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="h-8 w-8"
                        onClick={() => removeImage(image.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {images.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Add Images ({images.length}/5)
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />

              {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
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
            </div>

            {/* Jersey Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="club">Club *</Label>
                <Input
                  id="club"
                  placeholder="e.g., Real Madrid, Manchester United"
                  {...form.register("club")}
                  className="mt-2"
                  maxLength={100}
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.club}
                />
                {form.formState.errors.club && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.club.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="season">Season *</Label>
                <Input
                  id="season"
                  placeholder="e.g., 2023/24, 2022-23"
                  {...form.register("season")}
                  className="mt-2"
                  maxLength={20}
                  aria-required="true"
                  aria-invalid={!!form.formState.errors.season}
                />
                {form.formState.errors.season && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.season.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="jerseyType">Jersey Type *</Label>
                <Controller
                  name="jerseyType"
                  control={form.control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-2" id="jerseyType" aria-required="true">
                        <SelectValue placeholder="Select jersey type" />
                      </SelectTrigger>
                      <SelectContent>
                        {JERSEY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.jerseyType && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.jerseyType.message}
                  </p>
                )}
              </div>
            </div>

            {/* Player Print */}
            <div className="space-y-4">
              <h3 className="text-lg font-bold">Player Print (Optional)</h3>

              <div>
                <Label htmlFor="playerName">Player Name</Label>
                <Input
                  id="playerName"
                  placeholder="e.g., Messi, Ronaldo"
                  {...form.register("playerName")}
                  className="mt-2"
                  maxLength={50}
                />
              </div>

              <div>
                <Label htmlFor="playerNumber">Player Number</Label>
                <Input
                  id="playerNumber"
                  placeholder="e.g., 10, 7"
                  {...form.register("playerNumber")}
                  className="mt-2"
                  maxLength={3}
                />
              </div>

              <div>
                <Label>Competition Badges</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select all badges that appear on this jersey
                </p>
                {competitionsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading competitions...
                  </div>
                ) : availableCompetitions.length > 0 ? (
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Competition badges">
                    {availableCompetitions.map((badge) => {
                      const currentBadges = form.watch("badges") || [];
                      const isSelected = currentBadges.includes(badge);
                      return (
                        <BadgeUI
                          key={badge}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                          onClick={() => toggleBadge(badge)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              toggleBadge(badge);
                            }
                          }}
                          aria-pressed={isSelected}
                        >
                          {badge}
                        </BadgeUI>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {clubId && seasonId ? "No competitions found for this club and season." : "Select a club and season to see available competitions."}
                  </p>
                )}
              </div>
            </div>

            {/* Condition & Notes */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold">Condition & Notes</h3>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label htmlFor="conditionRating">Condition Rating</Label>
                  <span className="text-2xl font-bold text-primary" aria-live="polite">
                    {form.watch("conditionRating") || 8}/10
                  </span>
                </div>
                <Controller
                  name="conditionRating"
                  control={form.control}
                  render={({ field }) => (
                    <Slider
                      id="conditionRating"
                      value={[field.value || 8]}
                      onValueChange={(value) => field.onChange(value[0])}
                      min={1}
                      max={10}
                      step={1}
                      className="mt-2"
                      aria-label="Condition rating"
                    />
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>Poor</span>
                  <span>Good</span>
                  <span>Excellent</span>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional details about the jersey (defects, authenticity, history, etc.)"
                  {...form.register("notes")}
                  rows={4}
                  className="mt-2"
                  maxLength={1000}
                  aria-describedby="notes-count"
                />
                <p className="text-xs text-muted-foreground mt-1" id="notes-count">
                  {(form.watch("notes") || "").length}/1000 characters
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <p className="text-sm text-muted-foreground mt-1" id="visibility-description">
                      {form.watch("visibility") === "public"
                        ? "Everyone can see this jersey"
                        : "Only you can see this jersey"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Private</span>
                    <Controller
                      name="visibility"
                      control={form.control}
                      render={({ field }) => (
                        <Switch
                          id="visibility"
                          checked={field.value === "public"}
                          onCheckedChange={(checked) =>
                            field.onChange(checked ? "public" : "private")
                          }
                          aria-describedby="visibility-description"
                        />
                      )}
                    />
                    <span className="text-sm font-medium">Public</span>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Jersey"}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};


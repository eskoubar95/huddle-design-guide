'use client'

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, SlidersHorizontal, Eye, EyeOff, CheckSquare2 } from "lucide-react";
import { UploadJersey } from "@/components/jersey/UploadJersey";
import { JerseyImageWithLoading } from "@/components/jersey/JerseyImageWithLoading";
import { WardrobeActionBar } from "@/components/jersey/WardrobeActionBar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUser } from "@clerk/nextjs";
import { useJerseys, useUpdateJersey, useDeleteJersey } from "@/lib/hooks/use-jerseys";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getImageUrls, getImageVariant } from "@/lib/utils/image";
import type { JerseyDTO } from "@/lib/services/jersey-service";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { motion, AnimatePresence } from "framer-motion";

const Wardrobe = () => {
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [visibilityFilter, setVisibilityFilter] = useState<"All" | "Public" | "Private">("All");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedJerseys, setSelectedJerseys] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const previousJerseysRef = useRef<JerseyDTO[]>([]);

  // Fetch jerseys using API hook
  const {
    data: jerseysData,
    isLoading: loading,
    error: jerseysError,
    refetch: refetchJerseys,
  } = useJerseys(
    user?.id
      ? {
          ownerId: user.id,
          visibility: "all", // Get all jerseys for owner
        }
      : undefined
  );

  const updateJersey = useUpdateJersey();
  const deleteJersey = useDeleteJersey();

  const jerseys = jerseysData?.items || [];
  
  // Track newly added jerseys for animation
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (jerseys.length > 0 && previousJerseysRef.current.length > 0) {
      // Find newly added jerseys by comparing IDs
      const previousIds = new Set(previousJerseysRef.current.map(j => j.id));
      const newIds = jerseys
        .filter(j => !previousIds.has(j.id))
        .map(j => j.id);
      
      if (newIds.length > 0) {
        setNewlyAddedIds(new Set(newIds));
        // Clear animation state after animation completes
        setTimeout(() => {
          setNewlyAddedIds(new Set());
        }, 600);
      }
    }
    previousJerseysRef.current = jerseys;
  }, [jerseys]);

  // Handle errors
  useEffect(() => {
    if (jerseysError) {
      const errorMessage = jerseysError instanceof Error 
        ? jerseysError.message 
        : "Failed to load jerseys";
      
      console.error("[Wardrobe] Error loading jerseys:", jerseysError);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [jerseysError, toast]);

  // Note: handleToggleVisibility is defined but not currently used - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleToggleVisibility = async (jerseyId: string, currentVisibility: string) => {
    try {
      const newVisibility = currentVisibility === "public" ? "private" : "public";
      await updateJersey.mutateAsync({
        id: jerseyId,
        data: { visibility: newVisibility },
      });

      toast({
        title: "Visibility Updated",
        description: `Jersey is now ${newVisibility}`,
      });
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive",
      });
    }
  };

  const filteredJerseys = jerseys.filter((jersey) => {
    // Apply visibility filter
    if (visibilityFilter === "Public" && jersey.visibility !== "public") return false;
    if (visibilityFilter === "Private" && jersey.visibility !== "private") return false;
    
    // Apply type filter
    if (typeFilter !== "All" && jersey.jersey_type !== typeFilter) return false;
    
    return true;
  });

  const getUniqueTypes = () => {
    const types = jerseys.map((j) => j.jersey_type);
    return ["All", ...Array.from(new Set(types))];
  };

  // Multi-select handlers
  const toggleJerseySelection = (jerseyId: string) => {
    setSelectedJerseys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jerseyId)) {
        newSet.delete(jerseyId);
      } else {
        newSet.add(jerseyId);
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedJerseys(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedJerseys.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedJerseys).map(id => deleteJersey.mutateAsync(id))
      );
      
      toast({
        title: "Jerseys Deleted",
        description: `${selectedJerseys.size} jersey${selectedJerseys.size > 1 ? 's' : ''} deleted successfully`,
      });
      
      clearSelection();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Error deleting jerseys:", error);
      toast({
        title: "Error",
        description: "Failed to delete jerseys",
        variant: "destructive",
      });
    }
  };

  const handleBulkSetVisibility = async (visibility: "public" | "private") => {
    if (selectedJerseys.size === 0) return;

    try {
      await Promise.all(
        Array.from(selectedJerseys).map(id =>
          updateJersey.mutateAsync({ id, data: { visibility } })
        )
      );
      
      toast({
        title: "Visibility Updated",
        description: `${selectedJerseys.size} jersey${selectedJerseys.size > 1 ? 's' : ''} set to ${visibility}`,
      });
      
      clearSelection();
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive",
      });
    }
  };

  const isSelectionMode = selectedJerseys.size > 0;

  return (
    <ProtectedRoute>
      <UploadJersey
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => refetchJerseys()}
      />
      <div className="min-h-screen pb-20">
        {/* Page Header with Filters */}
        <header className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">My Wardrobe</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredJerseys.length} {filteredJerseys.length === 1 ? "jersey" : "jerseys"}
                  {isSelectionMode && ` • ${selectedJerseys.size} selected`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSelectionMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearSelection}
                    className="gap-2"
                  >
                    Cancel
                  </Button>
                )}
                {!isSelectionMode && (
                  <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-full border-border hover:border-primary hover:text-primary"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-semibold">Filter by Type</div>
                  {getUniqueTypes().map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setTypeFilter(type)}
                      className={typeFilter === type ? "bg-secondary" : ""}
                    >
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
                )}
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {(["All", "Public", "Private"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setVisibilityFilter(filter)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                    visibilityFilter === filter
                      ? "bg-secondary text-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground hover:border-muted"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 lg:px-8 pt-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading collection...</p>
              </div>
            ) : filteredJerseys.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Jerseys Yet</h3>
                <p className="text-muted-foreground mb-6">
                  {visibilityFilter === "All" && typeFilter === "All"
                    ? "Start building your collection by uploading your first jersey"
                    : `No jerseys match your filters`}
                </p>
                {visibilityFilter === "All" && typeFilter === "All" && (
                  <Button onClick={() => setUploadOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Jersey
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence mode="popLayout">
                {filteredJerseys.map((jersey) => {
                  const isSelected = selectedJerseys.has(jersey.id);
                  const isNewlyAdded = newlyAddedIds.has(jersey.id);
                  // Get image URLs with fallback - use card variant for thumbnails
                  const firstImage = jersey.imageVariants?.[0];
                  let imageUrl = "/placeholder.svg";
                  if (firstImage) {
                    // Use card variant if storage_path is available, otherwise use optimizedUrl (gallery variant)
                    if (firstImage.storagePath) {
                      try {
                        imageUrl = getImageVariant(
                          { storage_path: firstImage.storagePath, image_url: firstImage.originalUrl, image_url_webp: firstImage.optimizedUrl },
                          'card'
                        );
                      } catch {
                        imageUrl = firstImage.optimizedUrl || firstImage.originalUrl;
                      }
                    } else {
                      imageUrl = firstImage.optimizedUrl || firstImage.originalUrl;
                    }
                  } else if (jersey.images?.[0]) {
                    imageUrl = jersey.images[0];
                  }
                  const imageUrls = imageUrl !== "/placeholder.svg" ? getImageUrls(imageUrl) : { primary: "/placeholder.svg", fallback: "/placeholder.svg" };
                  
                  // Get metadata with fallback
                  const clubName = jersey.metadata?.club?.name || jersey.club;
                  const seasonLabel = jersey.metadata?.season?.label || jersey.season;
                  const jerseyType = jersey.jersey_type;
                  const playerName = jersey.metadata?.player?.full_name || jersey.player_name;
                  const playerNumber = jersey.metadata?.player?.current_shirt_number?.toString() || jersey.player_number;

                  return (
                    <motion.div
                      key={jersey.id}
                      initial={isNewlyAdded ? { opacity: 0, scale: 0.8, y: 20 } : false}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className={cn(
                        "group relative rounded-xl overflow-hidden transition-all bg-card hover:bg-card-hover shadow-card hover:shadow-elevated border",
                        isSelected 
                          ? "border-primary ring-2 ring-primary ring-offset-2" 
                          : "border-border/50 hover:border-primary/30",
                        isSelectionMode ? "cursor-pointer" : "cursor-pointer"
                      )}
                      onClick={(e) => {
                        // Don't navigate if in selection mode
                        if (isSelectionMode) {
                          e.stopPropagation();
                          toggleJerseySelection(jersey.id);
                        } else {
                          router.push(`/wardrobe/${jersey.id}`);
                        }
                      }}
                    >

                      {/* Jersey Image */}
                      <div
                        className={cn(
                          "relative aspect-[3/4] overflow-hidden bg-secondary",
                          !isSelectionMode && "cursor-pointer"
                        )}
                        onClick={() => {
                          if (!isSelectionMode) {
                            router.push(`/wardrobe/${jersey.id}`);
                          }
                        }}
                      >
                        <JerseyImageWithLoading
                          src={imageUrls.primary}
                          fallbackSrc={imageUrls.fallback}
                          alt={`${clubName} ${seasonLabel}`}
                          className="w-full h-full object-cover transition-all group-hover:scale-105"
                        />

                        {/* Condition badge */}
                        {jersey.condition_rating && (
                          <div className="absolute top-2 left-2 z-20">
                            <Badge variant="secondary" className="backdrop-blur-sm bg-background/60">
                              {jersey.condition_rating}/10
                            </Badge>
                          </div>
                        )}

                        {/* Visibility badge */}
                        <div className="absolute top-2 right-2 z-20">
                          <Badge
                            variant={jersey.visibility === "public" ? "default" : "outline"}
                            className="backdrop-blur-sm"
                          >
                            {jersey.visibility === "public" ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeOff className="w-3 h-3" />
                            )}
                          </Badge>
                        </div>
                      </div>

                      {/* Info */}
                      <div
                        className={cn(
                          "p-3 space-y-1 relative",
                          !isSelectionMode && "cursor-pointer"
                        )}
                        onClick={(e) => {
                          if (!isSelectionMode) {
                            router.push(`/wardrobe/${jersey.id}`);
                          }
                        }}
                      >
                        <h3 className="font-bold text-sm truncate">{clubName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {seasonLabel} • {jerseyType}
                        </p>
                        <div className="flex items-center justify-between gap-2">
                          {playerName && (
                            <p className="text-xs text-primary font-medium truncate flex-1">
                              {playerName}
                              {playerNumber && ` #${playerNumber}`}
                            </p>
                          )}
                          {/* Select button - small button in bottom right */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isSelectionMode) {
                                // Enable selection mode and select this item
                                setSelectedJerseys(new Set([jersey.id]));
                              } else {
                                // Toggle selection of this item
                                toggleJerseySelection(jersey.id);
                              }
                            }}
                            className={cn(
                              "flex-shrink-0 w-6 h-6 rounded-md border transition-all flex items-center justify-center",
                              isSelected
                                ? "bg-primary border-primary text-primary-foreground"
                                : "bg-transparent border-border hover:border-primary hover:bg-primary/10"
                            )}
                            aria-label={isSelected ? "Deselect jersey" : "Select jersey"}
                          >
                            {isSelected ? (
                              <CheckSquare2 className="w-3.5 h-3.5" />
                            ) : (
                              <CheckSquare2 className="w-3.5 h-3.5 opacity-50" />
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button - hide when selection mode */}
        {!isSelectionMode && (
          <button
            onClick={() => setUploadOpen(true)}
            className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg transition-all"
            aria-label="Upload jersey"
          >
            <Plus className="w-6 h-6 text-primary-foreground mx-auto" />
          </button>
        )}

        {/* Action Bar */}
        <WardrobeActionBar
          selectedCount={selectedJerseys.size}
          onDelete={() => setShowDeleteDialog(true)}
          onSetPublic={() => handleBulkSetVisibility("public")}
          onSetPrivate={() => handleBulkSetVisibility("private")}
          onClearSelection={clearSelection}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedJerseys.size} Jersey{selectedJerseys.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedJerseys.size === 1 ? 'this jersey' : 'these jerseys'} from your collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedRoute>
  );
};

export default Wardrobe;


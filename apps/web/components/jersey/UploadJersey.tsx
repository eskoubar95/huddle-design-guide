'use client'

import { useState, useRef } from "react";
import { X, Upload, ImageIcon, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

interface UploadJerseyProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
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

const COMPETITION_BADGES = [
  "UEFA Champions League",
  "UEFA Europa League",
  "Premier League",
  "Serie A",
  "La Liga",
  "Bundesliga",
  "Ligue 1",
  "FIFA Club World Cup",
  "Copa Libertadores",
];

const jerseySchema = z.object({
  club: z.string().trim().min(1, "Club name is required").max(100),
  season: z.string().trim().min(1, "Season is required").max(20),
  jerseyType: z.string().min(1, "Jersey type is required"),
  playerName: z.string().trim().max(50).optional(),
  playerNumber: z.string().trim().max(3).optional(),
  competitionBadges: z.array(z.string()).optional(),
  conditionRating: z.number().min(1).max(10),
  notes: z.string().trim().max(1000).optional(),
  visibility: z.enum(["public", "private"]),
});

interface ImageFile {
  id: string;
  file: File;
  preview: string;
}

export const UploadJersey = ({ isOpen, onClose, onSuccess }: UploadJerseyProps) => {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [club, setClub] = useState("");
  const [season, setSeason] = useState("");
  const [jerseyType, setJerseyType] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [selectedBadges, setSelectedBadges] = useState<string[]>([]);
  const [conditionRating, setConditionRating] = useState([8]);
  const [notes, setNotes] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remainingSlots = 10 - images.length;

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
    const newImages: ImageFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36),
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages([...images, ...newImages]);
  };

  const removeImage = (id: string) => {
    const image = images.find((img) => img.id === id);
    if (image) {
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
    if (selectedBadges.includes(badge)) {
      setSelectedBadges(selectedBadges.filter((b) => b !== badge));
    } else {
      setSelectedBadges([...selectedBadges, badge]);
    }
  };

  const handleSubmit = async () => {
    if (images.length < 1) {
      toast({
        title: "No Images",
        description: "Please upload at least 1 image",
        variant: "destructive",
      });
      return;
    }

    try {
      const validated = jerseySchema.parse({
        club,
        season,
        jerseyType,
        playerName: playerName || undefined,
        playerNumber: playerNumber || undefined,
        competitionBadges: selectedBadges.length > 0 ? selectedBadges : undefined,
        conditionRating: conditionRating[0],
        notes: notes || undefined,
        visibility,
      });

      setIsSubmitting(true);
      setUploadProgress(0);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not Authenticated",
          description: "Please log in to upload a jersey",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Upload images to storage
      const imageUrls: string[] = [];
      const totalImages = images.length;
      
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        try {
          const fileExt = image.file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from("jersey_images")
            .upload(filePath, image.file);

          if (uploadError) {
            throw new Error(`Failed to upload ${image.file.name}: ${uploadError.message}`);
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("jersey_images").getPublicUrl(filePath);

          imageUrls.push(publicUrl);
          setUploadProgress(((i + 1) / totalImages) * 100);
        } catch (error) {
          console.error(`Error uploading image ${image.file.name}:`, error);
          throw error;
        }
      }

      // Create jersey record
      const { error: jerseyError } = await supabase.from("jerseys").insert({
        owner_id: user.id,
        club: validated.club,
        season: validated.season,
        jersey_type: validated.jerseyType,
        player_name: validated.playerName,
        player_number: validated.playerNumber,
        competition_badges: validated.competitionBadges,
        condition_rating: validated.conditionRating,
        notes: validated.notes,
        visibility: validated.visibility,
        images: imageUrls,
      });

      if (jerseyError) {
        throw new Error(`Failed to create jersey record: ${jerseyError.message}`);
      }

      toast({
        title: "Jersey Uploaded!",
        description: "Your jersey has been added to your collection",
      });

      // Cleanup
      images.forEach((img) => URL.revokeObjectURL(img.preview));

      onSuccess?.();
      onClose();
      
      // Reset form
      setStep(1);
      setImages([]);
      setClub("");
      setSeason("");
      setJerseyType("");
      setPlayerName("");
      setPlayerNumber("");
      setSelectedBadges([]);
      setConditionRating([8]);
      setNotes("");
      setVisibility("public");
      setUploadProgress(0);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        // Focus first error field if possible
        if (firstError.path[0] === "club") {
          document.getElementById("club")?.focus();
        } else if (firstError.path[0] === "season") {
          document.getElementById("season")?.focus();
        } else if (firstError.path[0] === "jerseyType") {
          document.getElementById("jerseyType")?.focus();
        }
      } else {
        console.error("Error uploading jersey:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to upload jersey. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return images.length >= 1;
      case 2:
        return club && season && jerseyType;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-2">Upload Images (1-10 photos)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add at least 1 photo. Drag to reorder. First image will be the cover.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload jersey images"
              />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className="relative aspect-[3/4] rounded-lg border-2 border-border overflow-hidden group cursor-move hover:border-primary transition-colors"
                  >
                    <img
                      src={image.preview}
                      alt={`Upload ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <GripVertical className="w-6 h-6 text-white" />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(image.id)}
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {index === 0 && (
                      <BadgeUI className="absolute top-2 left-2">Cover</BadgeUI>
                    )}
                  </div>
                ))}

                {images.length < 10 && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] rounded-lg border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label="Add more photos"
                  >
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Add Photo</span>
                  </button>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                {images.length}/10 images • Max 5MB per image
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4">Jersey Information</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="club">Club *</Label>
                  <Input
                    id="club"
                    placeholder="e.g., Real Madrid, Manchester United"
                    value={club}
                    onChange={(e) => setClub(e.target.value)}
                    className="mt-2"
                    maxLength={100}
                    required
                    aria-required="true"
                    aria-describedby="club-error"
                  />
                </div>

                <div>
                  <Label htmlFor="season">Season *</Label>
                  <Input
                    id="season"
                    placeholder="e.g., 2023/24, 2022-23"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="mt-2"
                    maxLength={20}
                    required
                    aria-required="true"
                    aria-describedby="season-error"
                  />
                </div>

                <div>
                  <Label htmlFor="jerseyType">Jersey Type *</Label>
                  <Select value={jerseyType} onValueChange={setJerseyType}>
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
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4">Player Print (Optional)</h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="playerName">Player Name</Label>
                  <Input
                    id="playerName"
                    placeholder="e.g., Messi, Ronaldo"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="mt-2"
                    maxLength={50}
                  />
                </div>

                <div>
                  <Label htmlFor="playerNumber">Player Number</Label>
                  <Input
                    id="playerNumber"
                    placeholder="e.g., 10, 7"
                    value={playerNumber}
                    onChange={(e) => setPlayerNumber(e.target.value)}
                    className="mt-2"
                    maxLength={3}
                  />
                </div>

                <div>
                  <Label>Competition Badges</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select all badges that appear on this jersey
                  </p>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Competition badges">
                    {COMPETITION_BADGES.map((badge) => (
                      <BadgeUI
                        key={badge}
                        variant={selectedBadges.includes(badge) ? "default" : "outline"}
                        className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                        onClick={() => toggleBadge(badge)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleBadge(badge);
                          }
                        }}
                        aria-pressed={selectedBadges.includes(badge)}
                      >
                        {badge}
                      </BadgeUI>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4">Condition & Notes</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label htmlFor="conditionRating">Condition Rating</Label>
                    <span className="text-2xl font-bold text-primary" aria-live="polite">
                      {conditionRating[0]}/10
                    </span>
                  </div>
                  <Slider
                    id="conditionRating"
                    value={conditionRating}
                    onValueChange={setConditionRating}
                    min={1}
                    max={10}
                    step={1}
                    className="mt-2"
                    aria-label="Condition rating"
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="mt-2"
                    maxLength={1000}
                    aria-describedby="notes-count"
                  />
                  <p className="text-xs text-muted-foreground mt-1" id="notes-count">
                    {notes.length}/1000 characters
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label htmlFor="visibility">Visibility</Label>
                      <p className="text-sm text-muted-foreground mt-1" id="visibility-description">
                        {visibility === "public"
                          ? "Everyone can see this jersey"
                          : "Only you can see this jersey"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Private</span>
                      <Switch
                        id="visibility"
                        checked={visibility === "public"}
                        onCheckedChange={(checked) =>
                          setVisibility(checked ? "public" : "private")
                        }
                        aria-describedby="visibility-description"
                      />
                      <span className="text-sm font-medium">Public</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close upload dialog"
              >
                <X className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-xl font-bold">Upload Jersey</h2>
                <p className="text-sm text-muted-foreground">Step {step} of 4</p>
              </div>
            </div>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="h-1 bg-secondary">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={4}
            aria-label={`Step ${step} of 4`}
          />
        </div>

        {/* Upload Progress */}
        {isSubmitting && uploadProgress > 0 && (
          <div className="h-1 bg-secondary">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Upload progress: ${Math.round(uploadProgress)}%`}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">{renderStep()}</div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-card p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
              disabled={isSubmitting}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <div className="flex gap-2" role="group" aria-label="Step indicators">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s === step ? "bg-primary" : s < step ? "bg-primary/50" : "bg-muted"
                  }`}
                  aria-label={s === step ? `Current step ${s}` : s < step ? `Completed step ${s}` : `Step ${s}`}
                />
              ))}
            </div>
            <Button
              onClick={() => {
                if (step === 4) {
                  handleSubmit();
                } else if (!canProceed()) {
                  if (step === 1) {
                    toast({
                      title: "No Images",
                      description: "Please upload at least 1 image",
                      variant: "destructive",
                    });
                  } else {
                    toast({
                      title: "Required Fields",
                      description: "Please fill in all required fields",
                      variant: "destructive",
                    });
                  }
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={isSubmitting || !canProceed()}
            >
              {step === 4 ? (isSubmitting ? "Uploading..." : "Upload Jersey") : "Next"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};


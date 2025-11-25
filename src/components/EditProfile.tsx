import { useState, useEffect, useCallback, useRef } from "react";
import { X, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import Cropper, { Area } from "react-easy-crop";

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    username: string;
    bio?: string;
    country?: string;
    avatar_url?: string;
  };
  onUpdate: () => void;
}

const profileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(20, { message: "Username must be less than 20 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores" }),
  bio: z.string().max(500, { message: "Bio must be less than 500 characters" }).optional(),
  country: z.string().max(50, { message: "Country must be less than 50 characters" }).optional(),
});

export const EditProfile = ({ isOpen, onClose, profile, onUpdate }: EditProfileProps) => {
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio || "");
  const [country, setCountry] = useState(profile.country || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUsername(profile.username);
    setBio(profile.bio || "");
    setCountry(profile.country || "");
    setAvatarPreview(profile.avatar_url || null);
  }, [profile]);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Avatar image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve) => {
      image.onload = resolve;
    });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, "image/jpeg");
    });
  };

  const handleCropConfirm = async () => {
    if (!avatarPreview || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(avatarPreview, croppedAreaPixels);
      const croppedFile = new File([croppedBlob], avatarFile?.name || "avatar.jpg", {
        type: "image/jpeg",
      });
      setAvatarFile(croppedFile);
      setShowCropper(false);

      const reader = new FileReader();
      reader.onload = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(croppedFile);
    } catch (error) {
      console.error("Error cropping image:", error);
      toast({
        title: "Error",
        description: "Failed to crop image",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      const validated = profileSchema.parse({
        username,
        bio: bio || undefined,
        country: country || undefined,
      });

      setIsSubmitting(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not Authenticated",
          description: "Please log in to update your profile",
          variant: "destructive",
        });
        return;
      }

      let avatar_url = profile.avatar_url;

      // Upload avatar if a new one was selected
      if (avatarFile) {
        // Delete old avatar if exists
        if (profile.avatar_url) {
          const oldPath = profile.avatar_url.split("/").pop();
          if (oldPath) {
            await supabase.storage.from("avatars").remove([`${user.id}/${oldPath}`]);
          }
        }

        // Upload new avatar
        const fileExt = avatarFile.name.split(".").pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, avatarFile);

        if (uploadError) {
          throw uploadError;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

        avatar_url = publicUrl;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          username: validated.username,
          bio: validated.bio,
          country: validated.country,
          avatar_url,
        })
        .eq("id", user.id);

      if (error) {
        if (error.message.includes("duplicate key") || error.message.includes("unique")) {
          toast({
            title: "Username Taken",
            description: "This username is already in use. Please choose another.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "Profile Updated!",
        description: "Your profile has been updated successfully",
      });
      onUpdate();
      onClose();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        console.error("Error updating profile:", error);
        toast({
          title: "Error",
          description: "Failed to update profile. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold">Edit Profile</h2>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="relative w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4 overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-muted-foreground">
                    {username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Change Avatar
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                JPG, PNG or GIF. Max 5MB.
              </p>
            </div>

            {/* Username */}
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                3-20 characters, letters, numbers, and underscores only
              </p>
            </div>

            {/* Bio */}
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                placeholder="Tell us about yourself and your collection..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {bio.length}/500 characters
              </p>
            </div>

            {/* Country */}
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                type="text"
                placeholder="e.g., Spain, United Kingdom"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-card p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </footer>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && avatarPreview && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col">
          <header className="border-b border-border bg-card p-4">
            <div className="max-w-3xl mx-auto flex items-center justify-between">
              <h3 className="text-lg font-bold">Crop Avatar</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCropper(false);
                  setAvatarPreview(profile.avatar_url || null);
                  setAvatarFile(null);
                }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </header>

          <div className="flex-1 relative bg-black">
            <Cropper
              image={avatarPreview}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          </div>

          <footer className="border-t border-border bg-card p-4">
            <div className="max-w-3xl mx-auto space-y-4">
              <div>
                <Label className="text-sm mb-2 block">Zoom</Label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCropper(false);
                    setAvatarPreview(profile.avatar_url || null);
                    setAvatarFile(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleCropConfirm} className="flex-1">
                  Confirm
                </Button>
              </div>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
};

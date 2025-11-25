import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

interface EditProfileProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    username: string;
    bio?: string;
    country?: string;
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

  useEffect(() => {
    setUsername(profile.username);
    setBio(profile.bio || "");
    setCountry(profile.country || "");
  }, [profile]);

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

      const { error } = await supabase
        .from("profiles")
        .update({
          username: validated.username,
          bio: validated.bio,
          country: validated.country,
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
            {/* Avatar (placeholder for future implementation) */}
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-muted-foreground">
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
              <button className="text-sm text-primary hover:underline">
                Change Avatar
              </button>
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
    </div>
  );
};

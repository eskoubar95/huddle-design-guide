'use client'

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { z } from "zod";

const postSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(1000, "Content must be less than 1000 characters"),
  jerseyId: z.string().uuid("Invalid jersey ID").optional(),
});

interface CreatePostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

interface Jersey {
  id: string;
  club: string;
  season: string;
  jersey_type: string;
  images: string[];
}

export const CreatePost = ({ open, onOpenChange, onPostCreated }: CreatePostProps) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [selectedJerseyId, setSelectedJerseyId] = useState<string | null>(null);
  const [jerseys, setJerseys] = useState<Jersey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showJerseySelector, setShowJerseySelector] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchUserJerseys = async () => {
    if (!user) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("jerseys")
        .select("id, club, season, jersey_type, images")
        .eq("owner_id", user?.id || "")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching jerseys:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        toast({
          title: "Error",
          description: "Failed to load jerseys",
          variant: "destructive",
        });
        return;
      }

      setJerseys(data || []);
    } catch (err) {
      console.error("Unexpected error fetching jerseys:", err instanceof Error ? err.message : String(err));
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  const handleJerseySelectorOpen = () => {
    setShowJerseySelector(true);
    fetchUserJerseys();
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a post",
        variant: "destructive",
      });
      return;
    }

    // Reset validation error
    setValidationError(null);

    // Validate with Zod
    const validation = postSchema.safeParse({
      content: content.trim() || undefined,
      jerseyId: selectedJerseyId || undefined,
    });

    if (!validation.success) {
      const firstError = validation.error.issues[0];
      setValidationError(firstError.message);
      toast({
        title: "Validation Error",
        description: firstError.message,
        variant: "destructive",
      });
      return;
    }

    // Additional business logic validation
    if (!content.trim() && !selectedJerseyId) {
      setValidationError("Please add some content or select a jersey");
      toast({
        title: "Error",
        description: "Please add some content or select a jersey",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("posts").insert({
        user_id: user?.id || "",
        content: content.trim() || null,
        jersey_id: selectedJerseyId || null,
      });

      if (error) {
        console.error("Error creating post:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        throw error;
      }

      toast({
        title: "Success",
        description: "Post created successfully",
      });

      setContent("");
      setSelectedJerseyId(null);
      setValidationError(null);
      setShowJerseySelector(false);
      onOpenChange(false);
      onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedJersey = jerseys.find((j) => j.id === selectedJerseyId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="What's on your mind?"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setValidationError(null);
              }}
              rows={4}
              className="resize-none"
              aria-label="Post content"
              aria-invalid={validationError ? "true" : "false"}
              aria-describedby={validationError ? "content-error" : undefined}
            />
            {validationError && (
              <p id="content-error" className="text-sm text-destructive mt-1" role="alert">
                {validationError}
              </p>
            )}
          </div>

          {selectedJersey && (
            <div className="bg-secondary/50 rounded-lg p-3 flex gap-3">
              <img
                src={selectedJersey.images[0]}
                alt={`${selectedJersey.club} ${selectedJersey.season} ${selectedJersey.jersey_type}`}
                className="w-16 h-24 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{selectedJersey.club}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {selectedJersey.season} • {selectedJersey.jersey_type}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-auto py-1 text-xs"
                  onClick={() => setSelectedJerseyId(null)}
                  aria-label="Remove jersey"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}

          {!showJerseySelector ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleJerseySelectorOpen}
              aria-label="Attach jersey to post"
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              Attach Jersey
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium">Select a jersey</div>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {jerseys.map((jersey) => (
                  <button
                    key={jersey.id}
                    onClick={() => {
                      setSelectedJerseyId(jersey.id);
                      setShowJerseySelector(false);
                    }}
                    className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`Select ${jersey.club} ${jersey.season} ${jersey.jersey_type} jersey`}
                  >
                    <img
                      src={jersey.images[0]}
                      alt={`${jersey.club} ${jersey.season} ${jersey.jersey_type}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
              {jerseys.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No public jerseys found
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                onOpenChange(false);
                setValidationError(null);
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && !selectedJerseyId)}
              aria-label="Create post"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};


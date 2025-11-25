import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Image as ImageIcon } from "lucide-react";

interface CreatePostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPostCreated: () => void;
}

export const CreatePost = ({ open, onOpenChange, onPostCreated }: CreatePostProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [selectedJerseyId, setSelectedJerseyId] = useState<string | null>(null);
  const [jerseys, setJerseys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showJerseySelector, setShowJerseySelector] = useState(false);

  const fetchUserJerseys = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("jerseys")
        .select("id, club, season, jersey_type, images")
        .eq("owner_id", user.id)
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJerseys(data || []);
    } catch (error) {
      console.error("Error fetching jerseys:", error);
    }
  };

  const handleJerseySelectorOpen = () => {
    setShowJerseySelector(true);
    fetchUserJerseys();
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!content.trim() && !selectedJerseyId) {
      toast({
        title: "Error",
        description: "Please add some content or select a jersey",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim() || null,
        jersey_id: selectedJerseyId,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Post created successfully",
      });

      setContent("");
      setSelectedJerseyId(null);
      onOpenChange(false);
      onPostCreated();
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post",
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
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="resize-none"
          />

          {selectedJersey && (
            <div className="bg-secondary/50 rounded-lg p-3 flex gap-3">
              <img
                src={selectedJersey.images[0]}
                alt=""
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
                    className="relative aspect-[2/3] rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-colors"
                  >
                    <img
                      src={jersey.images[0]}
                      alt=""
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
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && !selectedJerseyId)}
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
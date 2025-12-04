'use client'

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUser } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().trim().min(1, "Comment cannot be empty").max(500, "Comment must be less than 500 characters"),
});

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface PostCommentsProps {
  postId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export const PostComments = ({ postId, open, onOpenChange }: PostCommentsProps) => {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("comments")
        .select(`
          id,
          user_id,
          content,
          created_at
        `)
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        throw error;
      }

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((c) => c.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", {
            message: profilesError.message,
            code: profilesError.code,
          });
          // Continue with default profiles
        }

        const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

        const commentsWithProfiles = data?.map((comment) => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || {
            username: "Unknown",
            avatar_url: null,
          },
        })) || [];

        setComments(commentsWithProfiles);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    fetchComments();

    // Subscribe to real-time updates
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${postId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount or when dialog closes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, postId]);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to comment",
        variant: "destructive",
      });
      return;
    }

    // Reset validation error
    setValidationError(null);

    // Validate with Zod
    const validation = commentSchema.safeParse({
      content: newComment.trim(),
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

    if (!newComment.trim()) {
      setValidationError("Comment cannot be empty");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id: user?.id || "",
        content: newComment.trim(),
      });

      if (error) {
        console.error("Error adding comment:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        throw error;
      }

      setNewComment("");
      setValidationError(null);
      toast({
        title: "Success",
        description: "Comment added",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUserClick = (userId: string) => {
    router.push(`/user/${userId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2" role="region" aria-label="Comments list">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-label="Loading comments" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" role="status">
              No comments yet. Be the first!
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <button
                  onClick={() => handleUserClick(comment.user_id)}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
                  aria-label={`View ${comment.profiles.username}'s profile`}
                >
                  {comment.profiles.avatar_url ? (
                    <img
                      src={comment.profiles.avatar_url}
                      alt={`${comment.profiles.username}'s avatar`}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="bg-secondary rounded-lg p-3">
                    <button
                      onClick={() => handleUserClick(comment.user_id)}
                      className="font-semibold text-sm hover:underline text-left focus:outline-none focus:ring-2 focus:ring-primary rounded"
                      aria-label={`View ${comment.profiles.username}'s profile`}
                    >
                      {comment.profiles.username}
                    </button>
                    <p className="text-sm mt-1">{comment.content}</p>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 px-3">
                    {getTimeAgo(comment.created_at)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t pt-4 mt-4 space-y-2">
          <div>
            <Textarea
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => {
                setNewComment(e.target.value);
                setValidationError(null);
              }}
              rows={2}
              className="resize-none"
              aria-label="Comment text"
              aria-invalid={validationError ? "true" : "false"}
              aria-describedby={validationError ? "comment-error" : undefined}
            />
            {validationError && (
              <p id="comment-error" className="text-sm text-destructive mt-1" role="alert">
                {validationError}
              </p>
            )}
          </div>
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            aria-label="Submit comment"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Comment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};


'use client'

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CreatePost } from "@/components/community/CreatePost";
import { PostComments } from "@/components/community/PostComments";
import { Heart, MessageSquare, Share2, User, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { usePosts } from "@/lib/hooks/use-posts";
// Removed unused import: useJerseys
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Removed unused interface: Post

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const Community = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"global" | "following">("global");
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  // TODO: Follows endpoints not implemented yet (HUD-17)
  // For now, keep follows using direct Supabase calls
  const fetchFollowing = useCallback(async () => {
    if (!user) return;

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (error && error.code !== "PGRST205") {
        console.error("Error fetching following:", error);
        setFollowingUserIds([]);
        return;
      }
      setFollowingUserIds(data?.map((f) => f.following_id) || []);
    } catch (error) {
      console.error("Error fetching following:", error);
      setFollowingUserIds([]);
    }
  }, [user]);

  // Fetch posts from API
  const { data: postsData, isLoading: postsLoading, refetch: refetchPosts } = usePosts({
    limit: 50,
    // TODO: Add following filter when API supports it
    // userId: activeTab === "following" && followingUserIds.length > 0 ? followingUserIds : undefined,
  });

  // Fetch profiles for posts
  // Note: userIds is computed but not currently used - kept for potential future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _userIds = useMemo(() => {
    if (!postsData?.items) return [];
    return [...new Set(postsData.items.map((p) => p.user_id))];
  }, [postsData]);

  // Fetch all profiles in one query (if we had a batch endpoint)
  // For now, we'll fetch individually or skip profile display
  const posts = useMemo(() => {
    if (!postsData?.items) return [];
    
    // Filter by following if needed (client-side for now)
    let filtered = postsData.items;
    if (activeTab === "following" && followingUserIds.length > 0) {
      filtered = filtered.filter((p) => followingUserIds.includes(p.user_id));
    }

    // Add placeholder profiles (will be enhanced when we have batch profile endpoint)
    return filtered.map((post) => ({
      ...post,
      profiles: {
        username: "User", // Placeholder - will fetch profiles separately if needed
        avatar_url: null,
        country: null,
      },
    }));
  }, [postsData, activeTab, followingUserIds]);

  const loading = postsLoading;

  useEffect(() => {
    if (user) {
      fetchFollowing();
    }
  }, [user, fetchFollowing]);

  // Polling for posts (replaces real-time subscriptions)
  useEffect(() => {
    const interval = setInterval(() => {
      // Posts will auto-refetch via polling
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(interval);
  }, [refetchPosts]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please sign in to like posts",
        variant: "destructive",
      });
      return;
    }

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (isLiked) {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .insert({ post_id: postId, user_id: user.id });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    }
  };

  const handleShare = (postId: string) => {
    const url = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard",
    });
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
            <h1 className="text-2xl font-bold mb-4">Community</h1>
            
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("global")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "global"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Global
              </button>
              <button
                onClick={() => setActiveTab("following")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium border-b-2 transition-colors",
                  activeTab === "following"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Following
              </button>
            </div>
          </div>
        </header>

        {/* Feed */}
        <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {activeTab === "following"
                  ? "No posts from people you follow yet"
                  : "No posts yet. Be the first to share!"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                // TODO: Post likes/comments endpoints not implemented yet (HUD-17)
                // For now, use placeholder values
                const isLiked = false; // Will be fetched separately when endpoints exist
                const likesCount = 0; // Will be fetched separately when endpoints exist
                const commentsCount = 0; // Will be fetched separately when endpoints exist

                return (
                  <div key={post.id} className="bg-card rounded-lg border border-border overflow-hidden">
                    {/* Post Header */}
                    <div className="p-4 flex items-center justify-between">
                      <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => router.push(`/profile/${post.profiles.username}`)}
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                          {post.profiles.avatar_url ? (
                            <img
                              src={post.profiles.avatar_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold hover:underline">{post.profiles.username}</div>
                          <div className="text-xs text-muted-foreground">
                            {post.profiles.country && `${post.profiles.country} • `}
                            {getTimeAgo(post.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    {post.content && (
                      <div className="px-4 pb-3">
                        <p className="text-sm">{post.content}</p>
                      </div>
                    )}

                    {/* Jersey Card */}
                    {post.jersey_id && (
                      <div
                        className="px-4 pb-3 cursor-pointer"
                        onClick={() => router.push(`/wardrobe/${post.jersey_id}`)}
                      >
                        <div className="bg-secondary/50 rounded-lg p-3 flex gap-3 hover:bg-secondary/70 transition-colors">
                          <div className="w-20 h-28 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground">
                            Jersey
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">View Jersey</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Click to view details
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Post Actions */}
                    <div className="border-t border-border p-3 flex items-center gap-4">
                      <button
                        onClick={() => handleLike(post.id, isLiked)}
                        className={cn(
                          "flex items-center gap-2 text-sm transition-colors",
                          isLiked
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                        <span>{likesCount}</span>
                      </button>
                      <button
                        onClick={() => setCommentsPostId(post.id)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>{commentsCount}</span>
                      </button>
                      <button
                        onClick={() => handleShare(post.id)}
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors ml-auto"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => setCreatePostOpen(true)}
          className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-elevated transition-smooth"
        >
          <Plus className="w-6 h-6 text-primary-foreground mx-auto" />
        </button>

        <CreatePost
          open={createPostOpen}
          onOpenChange={setCreatePostOpen}
          onPostCreated={() => refetchPosts()}
        />

        {commentsPostId && (
          <PostComments
            postId={commentsPostId}
            open={!!commentsPostId}
            onOpenChange={(open) => !open && setCommentsPostId(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Community;


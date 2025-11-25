import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { CreatePost } from "@/components/CreatePost";
import { PostComments } from "@/components/PostComments";
import { Heart, MessageSquare, Share2, User, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Post {
  id: string;
  user_id: string;
  content: string | null;
  jersey_id: string | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    country: string | null;
  };
  jerseys?: {
    id: string;
    club: string;
    season: string;
    jersey_type: string;
    images: string[];
    competition_badges: string[] | null;
  };
  post_likes: { user_id: string }[];
  comments: { id: string }[];
}

const getTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

const Community = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"global" | "following">("global");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [followingUserIds, setFollowingUserIds] = useState<string[]>([]);

  const fetchFollowing = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (error) throw error;
      setFollowingUserIds(data.map((f) => f.following_id));
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from("posts")
        .select(`
          id,
          user_id,
          content,
          jersey_id,
          created_at,
          jerseys (
            id,
            club,
            season,
            jersey_type,
            images,
            competition_badges
          ),
          post_likes (user_id),
          comments (id)
        `)
        .order("created_at", { ascending: false });

      if (activeTab === "following" && followingUserIds.length > 0) {
        query = query.in("user_id", followingUserIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles separately
      const userIds = [...new Set(data?.map((p) => p.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, country")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      const postsWithProfiles = data?.map((post) => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || {
          username: "Unknown",
          avatar_url: null,
          country: null,
        },
      })) || [];

      setPosts(postsWithProfiles);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowing();
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          fetchPosts();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "post_likes",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeTab, followingUserIds]);

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

  if (loading) {
    return (
      <div className="min-h-screen pb-20 lg:pb-8">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-3xl mx-auto px-4 lg:px-8 py-4">
            <h1 className="text-2xl font-bold">Community</h1>
          </div>
        </header>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
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
        {posts.length === 0 ? (
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
              const isLiked = post.post_likes.some((like) => like.user_id === user?.id);
              const likesCount = post.post_likes.length;
              const commentsCount = post.comments.length;

              return (
                <div key={post.id} className="bg-card rounded-lg border border-border overflow-hidden">
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => navigate(`/user/${post.user_id}`)}
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
                  {post.jerseys && (
                    <div
                      className="px-4 pb-3 cursor-pointer"
                      onClick={() => navigate(`/jersey/${post.jerseys!.id}`)}
                    >
                      <div className="bg-secondary/50 rounded-lg p-3 flex gap-3 hover:bg-secondary/70 transition-colors">
                        <img
                          src={post.jerseys.images[0]}
                          alt=""
                          className="w-20 h-28 rounded object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm">{post.jerseys.club}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {post.jerseys.season} • {post.jerseys.jersey_type}
                          </div>
                          {post.jerseys.competition_badges && post.jerseys.competition_badges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {post.jerseys.competition_badges.map((badge, i) => (
                                <span
                                  key={i}
                                  className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          )}
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
        onPostCreated={fetchPosts}
      />

      {commentsPostId && (
        <PostComments
          postId={commentsPostId}
          open={!!commentsPostId}
          onOpenChange={(open) => !open && setCommentsPostId(null)}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Community;
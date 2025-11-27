'use client'

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { JerseyCard } from "@/components/jersey/JerseyCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@clerk/nextjs";
import { useProfileByUsername } from "@/lib/hooks/use-profiles";
import { useJerseys } from "@/lib/hooks/use-jerseys";
import { usePosts } from "@/lib/hooks/use-posts";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Calendar, Loader2, ArrowLeft, Heart, MessageSquare } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  created_at: string | null;
}

interface Jersey {
  id: string;
  club: string;
  season: string;
  jersey_type: string;
  images: string[];
  condition_rating: number | null;
  visibility: string;
}

interface Post {
  id: string;
  content: string | null;
  created_at: string;
  jersey_id: string | null;
  jerseys?: {
    id: string;
    club: string;
    season: string;
    images: string[];
  } | null;
  post_likes: { user_id: string }[];
  comments: { id: string }[];
}

const UserProfile = () => {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useUser();
  const username = params.username;
  
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // Fetch profile by username from API
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useProfileByUsername(username || "");

  const isOwnProfile = currentUser?.id === profile?.id;

  // Fetch jerseys from API
  const { data: jerseysData } = useJerseys(
    profile?.id
      ? {
          ownerId: profile.id,
          visibility: isOwnProfile ? "all" : "public",
        }
      : undefined
  );

  // Fetch posts from API
  const { data: postsData } = usePosts(
    profile?.id
      ? {
          userId: profile.id,
          limit: 20,
        }
      : undefined
  );

  const jerseys = jerseysData?.items || [];
  const posts = postsData?.items || [];
  const loading = profileLoading;

  // Handle profile errors
  useEffect(() => {
    if (profileError) {
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      router.push("/not-found");
    }
  }, [profileError, toast, router]);

  // TODO: Follows endpoints not implemented yet (HUD-17)
  // For now, keep follow stats using direct Supabase calls
  // This will be migrated when follows API endpoints are created
  const fetchFollowStats = async () => {
    if (!profile) return;

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      
      // Get followers count
      const { count: followers, error: followersError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id);

      if (followersError && followersError.code !== "PGRST205") {
        console.error("Error fetching followers count:", followersError);
      }
      setFollowersCount(followers || 0);

      // Get following count
      const { count: following, error: followingError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id);

      if (followingError && followingError.code !== "PGRST205") {
        console.error("Error fetching following count:", followingError);
      }
      setFollowingCount(following || 0);

      // Check if current user follows this profile
      if (currentUser && profile.id !== currentUser.id) {
        const { data, error } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", profile.id)
          .maybeSingle();

        if (error && error.code !== "PGRST205") {
          console.error("Error checking follow status:", error);
        } else if (!error) {
          setIsFollowing(!!data);
        }
      }
    } catch (error) {
      console.error("Error fetching follow stats:", error);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchFollowStats();
    }
  }, [profile, currentUser?.id]);

  // TODO: Follows endpoints not implemented yet (HUD-17)
  // For now, keep follow functionality using direct Supabase calls
  const handleFollow = async () => {
    if (!currentUser || !profile) {
      toast({
        title: "Error",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    setFollowLoading(true);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", profile.id);

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: profile.id,
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);

        // Create notification for the followed user
        // TODO: Update when database is ready (HUD-14)
        try {
          await supabase.from("notifications").insert({
            user_id: profile.id,
            type: "follow",
            title: "New Follower",
            message: `${profile.username} started following you`,
          });
        } catch (notifError) {
          // Silently fail if notifications table doesn't exist
          const error = notifError as { code?: string };
          if (error.code !== "PGRST205") {
            console.error("Error creating notification:", notifError);
          }
        }
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      toast({
        title: "Error",
        description: "Failed to update follow status",
        variant: "destructive",
      });
    } finally {
      setFollowLoading(false);
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen">
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6">
        {/* Profile Header */}
        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-muted-foreground" />
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold">{profile.username}</h1>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                    {profile.country && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {profile.country}
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {profile.created_at ? `Joined ${new Date(profile.created_at).toLocaleDateString()}` : "Joined recently"}
                    </div>
                  </div>
                </div>

                {!isOwnProfile && currentUser && (
                  <Button
                    onClick={handleFollow}
                    disabled={followLoading}
                    variant={isFollowing ? "outline" : "default"}
                  >
                    {followLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                )}

                {isOwnProfile && (
                  <Button
                    variant="outline"
                    onClick={() => router.push("/settings")}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 mt-4">
                <div>
                  <div className="text-xl font-bold">{jerseys.length}</div>
                  <div className="text-sm text-muted-foreground">Jerseys</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{followersCount}</div>
                  <div className="text-sm text-muted-foreground">Followers</div>
                </div>
                <div>
                  <div className="text-xl font-bold">{followingCount}</div>
                  <div className="text-sm text-muted-foreground">Following</div>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="mt-4 text-sm text-muted-foreground">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="jerseys" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="jerseys" className="flex-1">
              Jerseys
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1">
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jerseys" className="mt-6">
            {jerseys.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {isOwnProfile ? "You haven&apos;t added any jerseys yet" : "No jerseys to display"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {jerseys.map((jersey) => (
                  <JerseyCard
                    key={jersey.id}
                    id={jersey.id}
                    club={jersey.club}
                    season={jersey.season}
                    type={jersey.jersey_type}
                    image={jersey.images[0]}
                    condition={jersey.condition_rating || 0}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-card rounded-lg border border-border overflow-hidden"
                  >
                    {post.content && (
                      <div className="p-4">
                        <p className="text-sm">{post.content}</p>
                      </div>
                    )}

                    {post.jersey_id && (
                      <div
                        className="px-4 pb-4 cursor-pointer"
                        onClick={() => router.push(`/jersey/${post.jersey_id}`)}
                      >
                        <div className="bg-secondary/50 rounded-lg p-3 flex gap-3 hover:bg-secondary/70 transition-colors">
                          <div className="w-16 h-24 rounded bg-secondary flex items-center justify-center text-xs text-muted-foreground">
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

                    <div className="border-t border-border p-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          0
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          0
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {getTimeAgo(post.created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default UserProfile;


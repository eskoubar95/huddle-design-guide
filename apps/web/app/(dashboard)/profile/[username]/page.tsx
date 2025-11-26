'use client'

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { JerseyCard } from "@/components/jersey/JerseyCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user: currentUser } = useAuth();
  const username = params.username;
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jerseys, setJerseys] = useState<Jersey[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === profile?.id;

  const fetchProfile = async () => {
    if (!username) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      // TODO: Update when database is ready (HUD-14)
      // Handle database table not found gracefully
      if (error) {
        if (error.code === "PGRST116") {
          // Profile not found - redirect to 404
          router.push("/not-found");
          return;
        }
        if (error.code === "PGRST205") {
          console.warn("Profiles table not found - redirecting to 404");
          router.push("/not-found");
          return;
        }
        throw error;
      }
      
      setProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Sentry error capture (if configured)
      // *Sentry.captureException(error, { tags: { page: "user-profile", username } });
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      router.push("/not-found");
    } finally {
      setLoading(false);
    }
  };

  const fetchJerseys = async () => {
    if (!username || !profile) return;

    try {
      const supabase = createClient();
      let query = supabase
        .from("jerseys")
        .select("id, club, season, jersey_type, images, condition_rating, visibility")
        .eq("owner_id", profile.id);

      // Only show public jerseys unless it&apos;s the user&apos;s own profile
      if (!isOwnProfile) {
        query = query.eq("visibility", "public");
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      // TODO: Update when database is ready (HUD-14)
      if (error && error.code !== "PGRST205") {
        console.error("Error fetching jerseys:", error);
      }
      
      setJerseys(data || []);
    } catch (error) {
      console.error("Error fetching jerseys:", error);
    }
  };

  const fetchPosts = async () => {
    if (!username || !profile) return;

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("posts")
        .select(`
          id,
          content,
          created_at,
          jersey_id,
          jerseys (
            id,
            club,
            season,
            images
          ),
          post_likes (user_id),
          comments (id)
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);

      // TODO: Update when database is ready (HUD-14)
      if (error && error.code !== "PGRST205") {
        console.error("Error fetching posts:", error);
      }
      
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchFollowStats = async () => {
    if (!username || !profile) return;

    try {
      const supabase = createClient();
      
      // Get followers count
      const { count: followers, error: followersError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id);

      // TODO: Update when database is ready (HUD-14)
      if (followersError && followersError.code !== "PGRST205") {
        console.error("Error fetching followers count:", followersError);
      }
      setFollowersCount(followers || 0);

      // Get following count
      const { count: following, error: followingError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id);

      // TODO: Update when database is ready (HUD-14)
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

        // TODO: Update when database is ready (HUD-14)
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
    if (username) {
      fetchProfile();
    }
  }, [username]);

  useEffect(() => {
    if (profile) {
      fetchJerseys();
      fetchPosts();
      fetchFollowStats();
    }
  }, [profile, isOwnProfile]);

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
            message: `${currentUser.user_metadata?.username || profile.username} started following you`,
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

                    {post.jerseys && (
                      <div
                        className="px-4 pb-4 cursor-pointer"
                        onClick={() => router.push(`/jersey/${post.jerseys!.id}`)}
                      >
                        <div className="bg-secondary/50 rounded-lg p-3 flex gap-3 hover:bg-secondary/70 transition-colors">
                          <img
                            src={post.jerseys.images[0]}
                            alt=""
                            className="w-16 h-24 rounded object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm">{post.jerseys.club}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {post.jerseys.season}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-border p-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {post.post_likes.length}
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.comments.length}
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


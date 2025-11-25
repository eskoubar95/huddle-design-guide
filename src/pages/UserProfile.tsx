import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { JerseyCard } from "@/components/JerseyCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, MapPin, Calendar, Loader2, ArrowLeft, Heart, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  country: string | null;
  bio: string | null;
  created_at: string;
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
  };
  post_likes: { user_id: string }[];
  comments: { id: string }[];
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jerseys, setJerseys] = useState<Jersey[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOwnProfile = currentUser?.id === userId;

  const fetchProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    }
  };

  const fetchJerseys = async () => {
    if (!userId) return;

    try {
      let query = supabase
        .from("jerseys")
        .select("id, club, season, jersey_type, images, condition_rating, visibility")
        .eq("owner_id", userId);

      // Only show public jerseys unless it's the user's own profile
      if (!isOwnProfile) {
        query = query.eq("visibility", "public");
      }

      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      setJerseys(data || []);
    } catch (error) {
      console.error("Error fetching jerseys:", error);
    }
  };

  const fetchPosts = async () => {
    if (!userId) return;

    try {
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
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    }
  };

  const fetchFollowStats = async () => {
    if (!userId) return;

    try {
      // Get followers count
      const { count: followers, error: followersError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId);

      if (followersError) throw followersError;
      setFollowersCount(followers || 0);

      // Get following count
      const { count: following, error: followingError } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId);

      if (followingError) throw followingError;
      setFollowingCount(following || 0);

      // Check if current user follows this profile
      if (currentUser && userId !== currentUser.id) {
        const { data, error } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId)
          .maybeSingle();

        if (!error) {
          setIsFollowing(!!data);
        }
      }
    } catch (error) {
      console.error("Error fetching follow stats:", error);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfile(),
        fetchJerseys(),
        fetchPosts(),
        fetchFollowStats(),
      ]);
      setLoading(false);
    };

    loadProfile();
  }, [userId, currentUser]);

  const handleFollow = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "Please sign in to follow users",
        variant: "destructive",
      });
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId);

        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount((prev) => prev - 1);
      } else {
        const { error } = await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: userId!,
          });

        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount((prev) => prev + 1);

        // Create notification for the followed user
        await supabase.from("notifications").insert({
          user_id: userId,
          type: "follow",
          title: "New Follower",
          message: `${profile?.username || "Someone"} started following you`,
        });
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
      <div className="min-h-screen pb-20 lg:pb-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pb-20 lg:pb-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 lg:px-8 py-4">
          <button
            onClick={() => navigate(-1)}
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
                      Joined {new Date(profile.created_at).toLocaleDateString()}
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
                    onClick={() => navigate("/settings")}
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
                  {isOwnProfile ? "You haven't added any jerseys yet" : "No jerseys to display"}
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
                        onClick={() => navigate(`/jersey/${post.jerseys!.id}`)}
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

      <BottomNav />
    </div>
  );
};

export default UserProfile;
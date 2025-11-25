import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { EditProfile } from "@/components/EditProfile";
import { Settings, Share2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ProfileData {
  username: string;
  bio?: string;
  country?: string;
  avatar_url?: string;
}

interface Stats {
  totalJerseys: number;
  forSale: number;
  activeAuctions: number;
}

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [stats, setStats] = useState<Stats>({ totalJerseys: 0, forSale: 0, activeAuctions: 0 });
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      // Fetch sale listings count
      const { count: salesCount } = await supabase
        .from("sale_listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "active");

      // Fetch auctions count
      const { count: auctionsCount } = await supabase
        .from("auctions")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .eq("status", "active");

      setStats({
        totalJerseys: 0, // Will be updated when we add jerseys table
        forSale: salesCount || 0,
        activeAuctions: auctionsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleShare = () => {
    if (profile) {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Profile link copied to clipboard",
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen pb-20 lg:pb-8 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="w-24 h-24 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold mb-2">Login Required</h2>
          <p className="text-muted-foreground mb-4">
            Please log in to view your profile
          </p>
          <Button onClick={() => navigate("/auth")}>Log In</Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pb-20 lg:pb-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen pb-20 lg:pb-8 flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
          <p className="text-muted-foreground">Unable to load profile data</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <>
      <EditProfile
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        profile={profile}
        onUpdate={fetchProfile}
      />
      <div className="min-h-screen pb-20 lg:pb-8">
        {/* Header with gradient */}
        <div className="relative h-32 bg-secondary border-b border-border">
          <div
            className="absolute inset-0 opacity-20"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
          />
        </div>

        {/* Profile Content */}
        <div className="max-w-4xl mx-auto px-4 lg:px-8">
          {/* Avatar & Info */}
          <div className="relative -mt-16 mb-6">
            <div className="w-32 h-32 rounded-full bg-secondary border-4 border-background flex items-center justify-center text-4xl font-bold text-foreground mb-4 overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{profile.username}</h1>
                {profile.country && (
                  <p className="text-sm text-muted-foreground mb-2">📍 {profile.country}</p>
                )}
                {profile.bio ? (
                  <p className="text-sm text-foreground/80 mb-3 max-w-2xl">{profile.bio}</p>
                ) : (
                  <p className="text-sm text-muted-foreground mb-3 italic">
                    No bio yet. Click Edit Profile to add one!
                  </p>
                )}
                <div className="flex gap-4 text-sm">
                  <div>
                    <span className="font-bold text-foreground">{stats.totalJerseys}</span>
                    <span className="text-muted-foreground ml-1">Jerseys</span>
                  </div>
                  <div>
                    <span className="font-bold text-foreground">0</span>
                    <span className="text-muted-foreground ml-1">Followers</span>
                  </div>
                  <div>
                    <span className="font-bold text-foreground">0</span>
                    <span className="text-muted-foreground ml-1">Following</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => setEditModalOpen(true)}
              >
                Edit Profile
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-border hover:bg-secondary"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="border-border hover:bg-secondary"
                onClick={() => navigate("/settings")}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-foreground mb-1">{stats.totalJerseys}</p>
              <p className="text-sm text-muted-foreground">Total Jerseys</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-foreground mb-1">{stats.forSale}</p>
              <p className="text-sm text-muted-foreground">For Sale</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-foreground mb-1">{stats.activeAuctions}</p>
              <p className="text-sm text-muted-foreground">Active Auctions</p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border">
              <p className="text-2xl font-bold text-foreground mb-1">0</p>
              <p className="text-sm text-muted-foreground">Sold Items</p>
            </div>
          </div>

          {/* Collection Preview */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">My Collection</h2>
              <Button variant="outline" size="sm" onClick={() => navigate("/wardrobe")}>
                View All
              </Button>
            </div>
            {stats.totalJerseys === 0 ? (
              <div className="text-center py-12 bg-card rounded-lg border border-border">
                <p className="text-muted-foreground mb-4">
                  You haven't added any jerseys yet
                </p>
                <Button onClick={() => navigate("/wardrobe")}>
                  Upload Your First Jersey
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-[3/4] rounded-lg bg-secondary border border-border cursor-pointer hover:border-primary transition-colors"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <BottomNav />
      </div>
    </>
  );
};

export default Profile;

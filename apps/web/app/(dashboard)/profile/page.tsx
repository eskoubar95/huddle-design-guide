'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { EditProfile } from "@/components/profile/EditProfile";
import { Settings, Share2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser, useAuth } from "@clerk/nextjs";
import { useProfile } from "@/lib/hooks/use-profiles";
import { useJerseys } from "@/lib/hooks/use-jerseys";
import { useListings } from "@/lib/hooks/use-listings";
import { useAuctions } from "@/lib/hooks/use-auctions";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface ProfileData {
  username: string;
  bio?: string | null;
  country?: string | null;
  avatar_url?: string | null;
}

interface Stats {
  totalJerseys: number;
  forSale: number;
  activeAuctions: number;
}

const Profile = () => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [profileCompleteness, setProfileCompleteness] = useState<{
    isProfileComplete: boolean;
    hasDefaultShippingAddress: boolean;
    missingFields: string[];
  } | null>(null);

  // Fetch profile from API
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile(user?.id || "");

  // Fetch profile completeness
  useEffect(() => {
    const fetchCompleteness = async () => {
      try {
        const token = await getToken();
        if (!token) {
          console.warn("No auth token available for completeness check");
          return;
        }
        
        const response = await fetch("/api/v1/profile/completeness", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfileCompleteness(data);
        } else {
          console.error("Failed to fetch completeness:", response.status);
        }
      } catch (error) {
        console.error("Failed to fetch profile completeness:", error);
      }
    };

    if (user?.id) {
      fetchCompleteness();
    }
  }, [user?.id, getToken]);

  // Fetch stats from API (count from listings/auctions/jerseys)
  const { data: jerseysData } = useJerseys(
    user?.id
      ? {
          ownerId: user.id,
          visibility: "all",
        }
      : undefined
  );

  const { data: listingsData } = useListings(
    user?.id
      ? {
          status: "active",
          limit: 1000, // Get all for count
        }
      : undefined
  );

  const { data: auctionsData } = useAuctions(
    user?.id
      ? {
          status: "active",
          limit: 1000, // Get all for count
        }
      : undefined
  );

  // Calculate stats
  const stats: Stats = {
    totalJerseys: jerseysData?.items.length || 0,
    forSale: listingsData?.items.filter((l) => l.seller_id === user?.id).length || 0,
    activeAuctions: auctionsData?.items.filter((a) => a.seller_id === user?.id).length || 0,
  };

  const loading = profileLoading;
  const profileData: ProfileData | null = profile
    ? {
        username: profile.username,
        bio: profile.bio,
        country: profile.country,
        avatar_url: profile.avatar_url,
      }
    : null;

  // Handle errors
  useEffect(() => {
    if (profileError) {
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    }
  }, [profileError, toast]);

  const handleShare = () => {
    if (profileData) {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied!",
        description: "Profile link copied to clipboard",
      });
    }
  };

  return (
    <ProtectedRoute>
      {profile && (
        <EditProfile
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          profile={{
            username: profile.username,
            bio: profile.bio || undefined,
            country: profile.country || undefined,
            avatar_url: profile.avatar_url || undefined,
          }}
          onUpdate={() => refetchProfile()}
        />
      )}
      <div className="min-h-screen">
        {loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          </div>
        ) : !profile ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center px-4">
              <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
              <p className="text-muted-foreground">Unable to load profile data</p>
            </div>
          </div>
        ) : (
          <>
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
                    onClick={() => router.push("/settings")}
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Profile Completion Alert */}
              {profileCompleteness &&
                (!profileCompleteness.isProfileComplete ||
                 !profileCompleteness.hasDefaultShippingAddress) && (
                <Alert className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Complete Your Profile</AlertTitle>
                  <AlertDescription className="flex items-center justify-between gap-4">
                    <span>
                      Finish setting up your profile to start buying and selling
                      on the marketplace.
                    </span>
                    <Button
                      size="sm"
                      onClick={() => router.push("/profile/complete")}
                    >
                      Complete Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

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
                  <Button variant="outline" size="sm" onClick={() => router.push("/wardrobe")}>
                    View All
                  </Button>
                </div>
                {stats.totalJerseys === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border border-border">
                    <p className="text-muted-foreground mb-4">
                      You haven&apos;t added any jerseys yet
                    </p>
                    <Button onClick={() => router.push("/wardrobe")}>
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
          </>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Profile;


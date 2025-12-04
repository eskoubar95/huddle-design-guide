'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, 
  TrendingUp, 
  MapPin, 
  Activity, 
  Flame,
  Heart,
  Gavel,
  Users,
  ChevronRight,
  Newspaper
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SavedJersey {
  id: string;
  jersey: {
    id: string;
    club: string;
    season: string;
    images: string[];
  };
}

interface LiveAuction {
  id: string;
  ends_at: string;
  current_bid: number;
  starting_bid: number;
  currency: string;
  jerseys: {
    id: string;
    club: string;
    images: string[];
  };
}

interface CommunityActivity {
  type: 'follow' | 'upload' | 'win';
  username: string;
  avatar?: string;
  time: string;
  details?: string;
}

export const RightSidebar = () => {
  const router = useRouter();
  const { user } = useUser();
  const [savedJerseys, setSavedJerseys] = useState<SavedJersey[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([]);
  const [activities, setActivities] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // Fetch saved jerseys
        const { data: saved, error: savedError } = await supabase
          .from("saved_jerseys")
          .select("*, jersey:jerseys!inner(*)")
          .eq("user_id", user?.id || "")
          .limit(5);

        if (savedError) {
          console.error("Error fetching saved jerseys:", {
            message: savedError.message,
            code: savedError.code,
          });
        } else if (saved) {
          setSavedJerseys(saved as SavedJersey[]);
        }

        // Fetch live auctions ending soon
        const { data: auctions, error: auctionsError } = await supabase
          .from("auctions")
          .select("*, jerseys!inner(*)")
          .eq("status", "active")
          .order("ends_at", { ascending: true })
          .limit(5);

        if (auctionsError) {
          console.error("Error fetching live auctions:", {
            message: auctionsError.message,
            code: auctionsError.code,
          });
        } else if (auctions) {
          setLiveAuctions(auctions as LiveAuction[]);
        }

        // Mock community activity (would be real-time in production)
        setActivities([
          { type: 'follow', username: 'jersey_king', time: '2m ago', avatar: '' },
          { type: 'upload', username: 'vintage_collector', time: '15m ago', details: 'Manchester United 1999' },
          { type: 'win', username: 'rare_finds', time: '1h ago', details: 'Won auction' },
        ]);
      } catch (error) {
        console.error("Unexpected error fetching sidebar data:", error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const formatTimeRemaining = (endsAt: string) => {
    const now = new Date().getTime();
    const end = new Date(endsAt).getTime();
    const diff = end - now;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) return `${Math.floor(hours / 24)}d`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const handleNavigateToWardrobe = () => {
    router.push("/wardrobe");
  };

  const handleNavigateToMarketplace = () => {
    router.push("/marketplace");
  };

  const handleNavigateToJersey = (jerseyId: string) => {
    router.push(`/wardrobe/${jerseyId}`);
  };

  return (
    <aside className="hidden xl:block w-80 h-screen sticky top-0 border-l border-border bg-background overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Watchlist */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="font-semibold">Watchlist</h3>
              </div>
              <button 
                onClick={handleNavigateToWardrobe}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                aria-label="View all saved jerseys"
              >
                View all
              </button>
            </div>
            
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : savedJerseys.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center" role="status">
                  No saved jerseys yet
                </p>
              ) : (
                savedJerseys.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigateToJersey(item.jersey.id)}
                    className="w-full p-3 rounded-xl bg-card hover:bg-card-hover border border-border transition-all group focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`View ${item.jersey.club} ${item.jersey.season} jersey`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        <img 
                          src={item.jersey.images[0]} 
                          alt={`${item.jersey.club} ${item.jersey.season}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium line-clamp-1">{item.jersey.club}</p>
                        <p className="text-xs text-muted-foreground">{item.jersey.season}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" aria-hidden="true" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Live Auctions */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-accent" aria-hidden="true" />
                <h3 className="font-semibold">Live Auctions</h3>
              </div>
              <button 
                onClick={handleNavigateToMarketplace}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded"
                aria-label="View all live auctions"
              >
                View all
              </button>
            </div>
            
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-xl bg-secondary animate-pulse" />
                  ))}
                </div>
              ) : liveAuctions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center" role="status">
                  No live auctions at the moment
                </p>
              ) : (
                liveAuctions.map((auction) => (
                  <button
                    key={auction.id}
                    onClick={() => handleNavigateToJersey(auction.jerseys.id)}
                    className="w-full p-3 rounded-xl bg-card hover:bg-card-hover border border-border transition-all group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                    aria-label={`View ${auction.jerseys.club} auction ending in ${formatTimeRemaining(auction.ends_at)}`}
                  >
                    {/* Pulse effect for ending soon */}
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/0 via-accent/5 to-accent/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="relative flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        <img 
                          src={auction.jerseys.images[0]} 
                          alt={auction.jerseys.club}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium line-clamp-1">{auction.jerseys.club}</p>
                        <p className="text-xs text-muted-foreground">
                          {auction.currency} {auction.current_bid || auction.starting_bid}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1 text-xs text-accent">
                          <Clock className="w-3 h-3 animate-pulse" aria-hidden="true" />
                          <span className="font-medium">{formatTimeRemaining(auction.ends_at)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Community Activity */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-success" aria-hidden="true" />
                <h3 className="font-semibold">Community Activity</h3>
              </div>
            </div>
            
            <div className="space-y-2">
              {activities.map((activity, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-card border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={activity.avatar} alt={activity.username} />
                      <AvatarFallback className="text-xs">
                        {activity.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-xs">
                        <span className="font-medium">{activity.username}</span>
                        {activity.type === 'follow' && ' started following you'}
                        {activity.type === 'upload' && ' uploaded a jersey'}
                        {activity.type === 'win' && ' won an auction'}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-muted-foreground">{activity.details}</p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Marketplace Metrics */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-accent" aria-hidden="true" />
              <h3 className="font-semibold">Trending</h3>
            </div>
            
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Top Club</span>
                  <TrendingUp className="w-3 h-3 text-primary" aria-hidden="true" />
                </div>
                <p className="text-lg font-bold">Real Madrid</p>
                <p className="text-xs text-muted-foreground">+156 views today</p>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-accent/5 to-success/5 border border-accent/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Price Drops</span>
                  <TrendingUp className="w-3 h-3 text-accent rotate-180" aria-hidden="true" />
                </div>
                <p className="text-lg font-bold">23 Jerseys</p>
                <p className="text-xs text-muted-foreground">In your watchlist</p>
              </div>
            </div>
          </section>

          {/* Huddle News */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-foreground" aria-hidden="true" />
                <h3 className="font-semibold">Huddle News</h3>
              </div>
            </div>
            
            <div className="space-y-2">
              <button className="w-full p-3 rounded-xl bg-card hover:bg-card-hover border border-border transition-all text-left group focus:outline-none focus:ring-2 focus:ring-primary">
                <div className="aspect-video rounded-lg bg-secondary mb-2 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                </div>
                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  Classic Kits Making a Comeback in 2024
                </p>
                <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
              </button>

              <button className="w-full p-3 rounded-xl bg-card hover:bg-card-hover border border-border transition-all text-left group focus:outline-none focus:ring-2 focus:ring-primary">
                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  New Authentication Feature: Verify Your Jerseys
                </p>
                <p className="text-xs text-muted-foreground mt-1">1 day ago</p>
              </button>
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
};


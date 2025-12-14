'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, 
  TrendingUp, 
  // Removed unused: MapPin 
  Activity, 
  Flame,
  Heart,
  Gavel,
  // Removed unused: Users
  // Removed unused: ChevronRight
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
    <div className="h-full flex flex-col bg-background/50 backdrop-blur-xl">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Watchlist */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" aria-hidden="true" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Watchlist</h3>
              </div>
              <button 
                onClick={handleNavigateToWardrobe}
                className="text-[10px] font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider"
                aria-label="View all saved jerseys"
              >
                View all
              </button>
            </div>
            
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : savedJerseys.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 p-4 text-center">
                  <p className="text-xs text-muted-foreground">No saved jerseys yet</p>
                </div>
              ) : (
                savedJerseys.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigateToJersey(item.jersey.id)}
                    className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group text-left"
                    aria-label={`View ${item.jersey.club} ${item.jersey.season} jersey`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-black/40 flex-shrink-0 border border-white/5">
                        <img 
                          src={item.jersey.images[0]} 
                          alt={`${item.jersey.club} ${item.jersey.season}`}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate group-hover:text-primary transition-colors">{item.jersey.club}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.jersey.season}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Live Auctions */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-accent" aria-hidden="true" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Live Auctions</h3>
              </div>
              <button 
                onClick={handleNavigateToMarketplace}
                className="text-[10px] font-medium text-muted-foreground hover:text-white transition-colors uppercase tracking-wider"
                aria-label="View all live auctions"
              >
                View all
              </button>
            </div>
            
            <div className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
                  ))}
                </div>
              ) : liveAuctions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/10 p-4 text-center">
                  <p className="text-xs text-muted-foreground">No live auctions</p>
                </div>
              ) : (
                liveAuctions.map((auction) => (
                  <button
                    key={auction.id}
                    onClick={() => handleNavigateToJersey(auction.jerseys.id)}
                    className="w-full p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group relative overflow-hidden text-left"
                    aria-label={`View ${auction.jerseys.club} auction`}
                  >
                    <div className="relative flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md overflow-hidden bg-black/40 flex-shrink-0 border border-white/5">
                        <img 
                          src={auction.jerseys.images[0]} 
                          alt={auction.jerseys.club}
                          className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate group-hover:text-accent transition-colors">{auction.jerseys.club}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-mono text-accent">
                            {auction.currency} {auction.current_bid || auction.starting_bid}
                          </p>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{formatTimeRemaining(auction.ends_at)}</span>
                          </div>
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
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-success" aria-hidden="true" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Community</h3>
              </div>
            </div>
            
            <div className="space-y-2">
              {activities.map((activity, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-transparent hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="w-6 h-6 mt-0.5 border border-white/10">
                      <AvatarImage src={activity.avatar} alt={activity.username} />
                      <AvatarFallback className="text-[10px] bg-white/10 text-white">
                        {activity.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-bold text-white hover:underline cursor-pointer">{activity.username}</span>
                        <span className="opacity-80">
                          {activity.type === 'follow' && ' started following you'}
                          {activity.type === 'upload' && ' listed a new jersey'}
                          {activity.type === 'win' && ' won an auction'}
                        </span>
                      </p>
                      {activity.details && (
                        <p className="text-[10px] text-white/60 mt-0.5 truncate">{activity.details}</p>
                      )}
                      <p className="text-[9px] text-white/20 mt-1">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Marketplace Metrics */}
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Flame className="w-4 h-4 text-hype-pink" aria-hidden="true" />
              <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Trending</h3>
            </div>
            
            <div className="grid gap-2">
              <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Top Club</span>
                  <TrendingUp className="w-3 h-3 text-primary" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-white">Real Madrid</p>
                <p className="text-[10px] text-muted-foreground">+156 views today</p>
              </div>

              <div className="p-3 rounded-lg bg-gradient-to-br from-accent/10 to-transparent border border-accent/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Price Drops</span>
                  <TrendingUp className="w-3 h-3 text-accent rotate-180" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-white">23 Jerseys</p>
                <p className="text-[10px] text-muted-foreground">In your watchlist</p>
              </div>
            </div>
          </section>

          {/* Huddle News */}
          <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-white" aria-hidden="true" />
                <h3 className="font-bold text-sm uppercase tracking-wide text-muted-foreground">Huddle News</h3>
              </div>
            </div>
            
            <div className="space-y-2">
              <button className="w-full group text-left">
                <div className="aspect-video rounded-lg bg-white/5 mb-2 overflow-hidden border border-white/5 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 opacity-50 group-hover:opacity-80 transition-opacity" />
                </div>
                <p className="text-xs font-medium text-white line-clamp-2 group-hover:text-primary transition-colors leading-relaxed">
                  Classic Kits Making a Comeback in 2024
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">2 hours ago</p>
              </button>
            </div>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
};



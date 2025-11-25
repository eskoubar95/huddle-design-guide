import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [savedJerseys, setSavedJerseys] = useState<SavedJersey[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<LiveAuction[]>([]);
  const [activities, setActivities] = useState<CommunityActivity[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Fetch saved jerseys
      const { data: saved } = await supabase
        .from("saved_jerseys")
        .select("*, jersey:jerseys!inner(*)")
        .eq("user_id", user.id)
        .limit(5);

      if (saved) setSavedJerseys(saved as any);

      // Fetch live auctions ending soon
      const { data: auctions } = await supabase
        .from("auctions")
        .select("*, jerseys!inner(*)")
        .eq("status", "active")
        .order("ends_at", { ascending: true })
        .limit(5);

      if (auctions) setLiveAuctions(auctions as any);

      // Mock community activity (would be real-time in production)
      setActivities([
        { type: 'follow', username: 'jersey_king', time: '2m ago', avatar: '' },
        { type: 'upload', username: 'vintage_collector', time: '15m ago', details: 'Manchester United 1999' },
        { type: 'win', username: 'rare_finds', time: '1h ago', details: 'Won auction' },
      ]);
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

  return (
    <aside className="hidden xl:block w-80 h-screen sticky top-0 border-l border-border bg-background overflow-hidden">
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Watchlist */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Watchlist</h3>
              </div>
              <button 
                onClick={() => navigate("/wardrobe")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </button>
            </div>
            
            <div className="space-y-2">
              {savedJerseys.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No saved jerseys yet
                </p>
              ) : (
                savedJerseys.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/jersey/${item.jersey.id}`)}
                    className="w-full p-3 rounded-xl bg-card hover:bg-card-hover border border-border transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        <img 
                          src={item.jersey.images[0]} 
                          alt={item.jersey.club}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium line-clamp-1">{item.jersey.club}</p>
                        <p className="text-xs text-muted-foreground">{item.jersey.season}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
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
                <Gavel className="w-4 h-4 text-accent" />
                <h3 className="font-semibold">Live Auctions</h3>
              </div>
              <button 
                onClick={() => navigate("/marketplace")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </button>
            </div>
            
            <div className="space-y-2">
              {liveAuctions.map((auction) => (
                <button
                  key={auction.id}
                  onClick={() => navigate(`/jersey/${auction.jerseys}`)}
                  className="w-full p-3 rounded-xl bg-card hover:bg-card-hover border border-border transition-all group relative overflow-hidden"
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
                        <Clock className="w-3 h-3 animate-pulse" />
                        <span className="font-medium">{formatTimeRemaining(auction.ends_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Community Activity */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-success" />
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
                      <AvatarImage src={activity.avatar} />
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
              <Flame className="w-4 h-4 text-accent" />
              <h3 className="font-semibold">Trending</h3>
            </div>
            
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Top Club</span>
                  <TrendingUp className="w-3 h-3 text-primary" />
                </div>
                <p className="text-lg font-bold">Real Madrid</p>
                <p className="text-xs text-muted-foreground">+156 views today</p>
              </div>

              <div className="p-3 rounded-xl bg-gradient-to-br from-accent/5 to-success/5 border border-accent/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Price Drops</span>
                  <TrendingUp className="w-3 h-3 text-accent rotate-180" />
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
                <Newspaper className="w-4 h-4 text-foreground" />
                <h3 className="font-semibold">Huddle News</h3>
              </div>
            </div>
            
            <div className="space-y-2">
              <button className="w-full p-3 rounded-xl bg-card hover:bg-card-hover border border-border transition-all text-left group">
                <div className="aspect-video rounded-lg bg-secondary mb-2 overflow-hidden">
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
                </div>
                <p className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  Classic Kits Making a Comeback in 2024
                </p>
                <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
              </button>

              <button className="w-full p-3 rounded-xl bg-card hover:bg-card-hover border border-border transition-all text-left group">
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

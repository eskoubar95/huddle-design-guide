import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Flame, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { JerseyCard } from "@/components/JerseyCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface Jersey {
  id: string;
  club: string;
  season: string;
  jersey_type: string;
  player_name?: string;
  images: string[];
  condition_rating?: number;
}

export const MarketplaceForYou = () => {
  const navigate = useNavigate();
  const [trendingJerseys, setTrendingJerseys] = useState<Jersey[]>([]);
  const [endingSoon, setEndingSoon] = useState<Jersey[]>([]);

  useEffect(() => {
    const fetchMarketplace = async () => {
      // Fetch trending jerseys (recently added)
      const { data: trending } = await supabase
        .from("jerseys")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(6);

      // Fetch ending soon auctions
      const { data: auctions } = await supabase
        .from("auctions")
        .select(`
          *,
          jerseys!inner(*)
        `)
        .eq("status", "active")
        .lt("ends_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
        .order("ends_at", { ascending: true })
        .limit(6);

      if (trending) setTrendingJerseys(trending);
      if (auctions) {
        const jerseys = auctions.map((a: any) => a.jerseys);
        setEndingSoon(jerseys);
      }
    };

    fetchMarketplace();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 bg-gradient-primary rounded-full" />
        <h2 className="text-2xl font-bold">For You</h2>
      </div>

      {/* Trending */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-semibold">Trending Now</h3>
          </div>
          <button
            onClick={() => navigate("/marketplace")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <span>View all</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <ScrollArea className="w-full">
          <div className="flex gap-4 pb-4">
            {trendingJerseys.map((jersey) => (
              <div key={jersey.id} className="w-[280px] flex-shrink-0">
                <JerseyCard
                  id={jersey.id}
                  image={jersey.images[0]}
                  club={jersey.club}
                  season={jersey.season}
                  type={jersey.jersey_type}
                  player={jersey.player_name}
                  condition={jersey.condition_rating}
                />
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Ending Soon */}
      {endingSoon.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary animate-pulse" />
              <h3 className="text-lg font-semibold">Ending Soon</h3>
            </div>
            <button
              onClick={() => navigate("/marketplace")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <span>View all</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
              {endingSoon.map((jersey) => (
                <div key={jersey.id} className="w-[280px] flex-shrink-0">
                  <JerseyCard
                    id={jersey.id}
                    image={jersey.images[0]}
                    club={jersey.club}
                    season={jersey.season}
                    type={jersey.jersey_type}
                    player={jersey.player_name}
                    condition={jersey.condition_rating}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
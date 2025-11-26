'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Flame, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { JerseyCard } from "@/components/jersey/JerseyCard";
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
  const router = useRouter();
  const [trendingJerseys, setTrendingJerseys] = useState<Jersey[]>([]);
  const [endingSoon, setEndingSoon] = useState<Jersey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketplace = async () => {
      try {
        const supabase = createClient();
        
        // Fetch trending jerseys (recently added)
        const { data: trending, error: trendingError } = await supabase
          .from("jerseys")
          .select("*")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .limit(6);

        if (trendingError) {
          console.error("Error fetching trending jerseys:", {
            message: trendingError.message,
            code: trendingError.code,
          });
        } else if (trending) {
          // Map to Jersey interface
          type SupabaseJersey = {
            id: string;
            club: string;
            season: string;
            jersey_type: string;
            player_name?: string;
            images?: string[];
            condition_rating?: number;
          };
          const typedJerseys: Jersey[] = trending.map((j: SupabaseJersey) => ({
            id: j.id,
            club: j.club,
            season: j.season,
            jersey_type: j.jersey_type,
            player_name: j.player_name,
            images: j.images || [],
            condition_rating: j.condition_rating,
          }));
          setTrendingJerseys(typedJerseys);
        }

        // Fetch ending soon auctions
        const { data: auctions, error: auctionsError } = await supabase
          .from("auctions")
          .select(`
            *,
            jerseys!inner(*)
          `)
          .eq("status", "active")
          .lt("ends_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
          .order("ends_at", { ascending: true })
          .limit(6);

        if (auctionsError) {
          console.error("Error fetching ending soon auctions:", {
            message: auctionsError.message,
            code: auctionsError.code,
          });
        } else if (auctions) {
          type SupabaseAuction = {
            jerseys: Jersey;
          };
          const jerseys = auctions.map((a: SupabaseAuction) => a.jerseys);
          setEndingSoon(jerseys);
        }
      } catch (error) {
        console.error("Unexpected error fetching marketplace:", error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    };

    fetchMarketplace();
  }, []);

  const handleNavigateToMarketplace = () => {
    router.push("/marketplace");
  };

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
            <Flame className="w-5 h-5 text-accent" aria-hidden="true" />
            <h3 className="text-lg font-semibold">Trending Now</h3>
          </div>
          <button
            onClick={handleNavigateToMarketplace}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
            aria-label="View all trending jerseys"
          >
            <span>View all</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {loading ? (
          <div className="flex gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="w-[280px] h-[373px] rounded-xl bg-secondary animate-pulse flex-shrink-0" />
            ))}
          </div>
        ) : trendingJerseys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground" role="status">
            No trending jerseys at the moment
          </div>
        ) : (
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
                    condition={jersey.condition_rating || 0}
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        )}
      </div>

      {/* Ending Soon */}
      {endingSoon.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary animate-pulse" aria-hidden="true" />
              <h3 className="text-lg font-semibold">Ending Soon</h3>
            </div>
            <button
              onClick={handleNavigateToMarketplace}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
              aria-label="View all ending soon auctions"
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
                    condition={jersey.condition_rating || 0}
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


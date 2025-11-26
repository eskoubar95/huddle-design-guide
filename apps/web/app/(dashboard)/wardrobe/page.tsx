'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, SlidersHorizontal, ShoppingCart, Gavel, Eye, EyeOff } from "lucide-react";
import { UploadJersey } from "@/components/jersey/UploadJersey";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Jersey {
  id: string;
  owner_id: string;
  club: string;
  season: string;
  jersey_type: string;
  player_name?: string | null;
  player_number?: string | null;
  competition_badges?: string[] | null;
  condition_rating?: number | null;
  notes?: string | null;
  visibility: string;
  images: string[];
  created_at: string;
}

const Wardrobe = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [activeFilter, setActiveFilter] = useState("All");
  const [jerseys, setJerseys] = useState<Jersey[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchJerseys();
    }
  }, [user]);

  const fetchJerseys = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("jerseys")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      // TODO: Update when database is ready (HUD-14)
      // Handle database table not found gracefully
      if (error) {
        if (error.code === "PGRST205") {
          console.warn("Jerseys table not found - using empty state");
          setJerseys([]);
          setLoading(false);
          return;
        }
        throw error;
      }
      
      setJerseys(data || []);
    } catch (error) {
      console.error("Error fetching jerseys:", error);
      // Sentry error capture (if configured)
      // *Sentry.captureException(error, { tags: { page: "wardrobe" } });
      toast({
        title: "Error",
        description: "Failed to load jerseys",
        variant: "destructive",
      });
      setJerseys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (jerseyId: string, currentVisibility: string) => {
    try {
      const supabase = createClient();
      const newVisibility = currentVisibility === "public" ? "private" : "public";
      const { error } = await supabase
        .from("jerseys")
        .update({ visibility: newVisibility })
        .eq("id", jerseyId);

      if (error) throw error;

      setJerseys(
        jerseys.map((j) =>
          j.id === jerseyId ? { ...j, visibility: newVisibility } : j
        )
      );

      toast({
        title: "Visibility Updated",
        description: `Jersey is now ${newVisibility}`,
      });
    } catch (error) {
      console.error("Error updating visibility:", error);
      toast({
        title: "Error",
        description: "Failed to update visibility",
        variant: "destructive",
      });
    }
  };

  const filteredJerseys = jerseys.filter((jersey) => {
    if (activeFilter === "All") return true;
    if (activeFilter === "Public") return jersey.visibility === "public";
    if (activeFilter === "Private") return jersey.visibility === "private";
    // For Sale and Auctions filters would need to join with sale_listings and auctions tables
    return true;
  });

  const getUniqueTypes = () => {
    const types = jerseys.map((j) => j.jersey_type);
    return ["All", ...Array.from(new Set(types))];
  };

  return (
    <ProtectedRoute>
      <UploadJersey
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={fetchJerseys}
      />
      <div className="min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">My Wardrobe</h1>
                <p className="text-sm text-muted-foreground">
                  {filteredJerseys.length} {filteredJerseys.length === 1 ? "jersey" : "jerseys"}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-full border-border hover:border-primary hover:text-primary"
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5 text-sm font-semibold">Filter by Type</div>
                  {getUniqueTypes().map((type) => (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => setActiveFilter(type)}
                      className={activeFilter === type ? "bg-secondary" : ""}
                    >
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filter chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {["All", "Public", "Private"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all border",
                    activeFilter === filter
                      ? "bg-secondary text-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground hover:border-muted"
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 lg:px-8 pt-6">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading collection...</p>
              </div>
            ) : filteredJerseys.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold mb-2">No Jerseys Yet</h3>
                <p className="text-muted-foreground mb-6">
                  {activeFilter === "All"
                    ? "Start building your collection by uploading your first jersey"
                    : `No ${activeFilter.toLowerCase()} jerseys in your collection`}
                </p>
                {activeFilter === "All" && (
                  <Button onClick={() => setUploadOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Upload Jersey
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredJerseys.map((jersey) => (
                  <div
                    key={jersey.id}
                    className="group relative rounded-xl overflow-hidden transition-all cursor-pointer bg-card hover:bg-card-hover shadow-card hover:shadow-elevated border border-border/50 hover:border-primary/30"
                  >
                    {/* Jersey Image */}
                    <div
                      className="relative aspect-[3/4] overflow-hidden bg-secondary"
                      onClick={() => router.push(`/jersey/${jersey.id}`)}
                    >
                      <img
                        src={jersey.images[0] || "/placeholder.svg"}
                        alt={`${jersey.club} ${jersey.season}`}
                        className="w-full h-full object-cover transition-all group-hover:scale-105"
                      />

                      {/* Condition badge */}
                      {jersey.condition_rating && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="backdrop-blur-sm bg-background/60">
                            {jersey.condition_rating}/10
                          </Badge>
                        </div>
                      )}

                      {/* Visibility badge */}
                      <div className="absolute top-2 right-2">
                        <Badge
                          variant={jersey.visibility === "public" ? "default" : "outline"}
                          className="backdrop-blur-sm"
                        >
                          {jersey.visibility === "public" ? (
                            <Eye className="w-3 h-3" />
                          ) : (
                            <EyeOff className="w-3 h-3" />
                          )}
                        </Badge>
                      </div>

                      {/* Quick Actions - Show on hover */}
                      <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 backdrop-blur-md bg-background/90 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/jersey/${jersey.id}`);
                            // This will open the CreateSaleListing modal on the detail page
                          }}
                        >
                          <ShoppingCart className="w-3 h-3 mr-1" />
                          Sell
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 backdrop-blur-md bg-background/90 hover:bg-background"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/jersey/${jersey.id}`);
                            // This will open the CreateAuction modal on the detail page
                          }}
                        >
                          <Gavel className="w-3 h-3 mr-1" />
                          Auction
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          className="backdrop-blur-md bg-background/90 hover:bg-background h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleVisibility(jersey.id, jersey.visibility);
                          }}
                        >
                          {jersey.visibility === "public" ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Info */}
                    <div
                      className="p-3 space-y-1"
                      onClick={() => router.push(`/jersey/${jersey.id}`)}
                    >
                      <h3 className="font-bold text-sm truncate">{jersey.club}</h3>
                      <p className="text-xs text-muted-foreground">
                        {jersey.season} • {jersey.jersey_type}
                      </p>
                      {jersey.player_name && (
                        <p className="text-xs text-primary font-medium truncate">
                          {jersey.player_name}
                          {jersey.player_number && ` #${jersey.player_number}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => setUploadOpen(true)}
          className="fixed bottom-24 lg:bottom-8 right-6 lg:right-8 z-40 w-14 h-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg transition-all"
          aria-label="Upload jersey"
        >
          <Plus className="w-6 h-6 text-primary-foreground mx-auto" />
        </button>
      </div>
    </ProtectedRoute>
  );
};

export default Wardrobe;


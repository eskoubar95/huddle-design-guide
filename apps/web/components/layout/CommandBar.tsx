'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  Command,
} from "@/components/ui/command";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Shirt, User, ShoppingBag, TrendingUp, Clock, X } from "lucide-react";

interface SearchHistory {
  query: string;
  timestamp: number;
}

interface TrendingSearch {
  query: string;
  count: number;
}

interface SearchResult {
  type: "jersey" | "user" | "sale" | "auction";
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  price?: number;
}

export const CommandBar = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<TrendingSearch[]>([]);
  const router = useRouter();
  const { user } = useAuth();

  // Load trending searches
  useEffect(() => {
    const fetchTrendingSearches = async () => {
      try {
        const supabase = createClient();
        // Get searches from last 7 days, grouped by query
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data, error: fetchError } = await supabase
          .from("search_analytics")
          .select("query")
          .gte("created_at", sevenDaysAgo.toISOString());

        if (fetchError) throw fetchError;

        // Count occurrences and get top 5
        const queryCounts: { [key: string]: number } = {};
        data?.forEach((item) => {
          queryCounts[item.query] = (queryCounts[item.query] || 0) + 1;
        });

        const trending = Object.entries(queryCounts)
          .map(([query, count]) => ({ query, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setTrendingSearches(trending);
      } catch (error) {
        console.error("Failed to fetch trending searches:", error);
      }
    };

    if (open) {
      fetchTrendingSearches();
    }
  }, [open]);

  // Log search to analytics
  const logSearch = async (query: string) => {
    if (!query.trim()) return;
    
    try {
      const supabase = createClient();
      await supabase.from("search_analytics").insert({
        query: query.trim(),
        user_id: user?.id || null,
      });
    } catch (error) {
      console.error("Failed to log search:", error);
    }
  };

  // Keyboard shortcut hints
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
      // Cmd/Ctrl + Backspace to clear search
      if ((e.metaKey || e.ctrlKey) && e.key === "Backspace" && search) {
        e.preventDefault();
        setSearch("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, search]);

  // Load search history from localStorage
  useEffect(() => {
    const history = localStorage.getItem("searchHistory");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        console.error("Failed to load search history:", e);
      }
    }
  }, []);

  // Save search history to localStorage
  const saveSearchHistory = (history: SearchHistory[]) => {
    localStorage.setItem("searchHistory", JSON.stringify(history));
    setSearchHistory(history);
  };

  // Add to search history
  const addToHistory = (query: string) => {
    if (!query.trim()) return;
    
    const newHistory = [
      { query: query.trim(), timestamp: Date.now() },
      ...searchHistory.filter(h => h.query !== query.trim())
    ].slice(0, 5); // Keep only last 5 searches
    
    saveSearchHistory(newHistory);
  };

  // Clear individual history item
  const clearHistoryItem = (query: string) => {
    const newHistory = searchHistory.filter(h => h.query !== query);
    saveSearchHistory(newHistory);
  };

  // Clear all history
  const clearAllHistory = () => {
    saveSearchHistory([]);
  };

  // Expose setOpen to parent components
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("openCommandBar", handleOpen);
    return () => window.removeEventListener("openCommandBar", handleOpen);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    const searchContent = async () => {
      if (!search.trim() || search.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const supabase = createClient();
        const searchQuery = search.toLowerCase();
        const allResults: SearchResult[] = [];

        // Search jerseys
        const { data: jerseys, error: jerseysError } = await supabase
          .from("jerseys")
          .select("id, club, season, jersey_type, player_name, images, visibility")
          .or(`club.ilike.%${searchQuery}%,season.ilike.%${searchQuery}%,player_name.ilike.%${searchQuery}%`)
          .eq("visibility", "public")
          .limit(5);

        if (jerseysError) {
          console.error("Error searching jerseys:", jerseysError);
        } else if (jerseys) {
          allResults.push(
            ...jerseys.map((jersey) => ({
              type: "jersey" as const,
              id: jersey.id,
              title: `${jersey.club} ${jersey.season}`,
              subtitle: jersey.player_name
                ? `${jersey.jersey_type} • ${jersey.player_name}`
                : jersey.jersey_type,
              image: jersey.images[0],
            }))
          );
        }

        // Search users
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${searchQuery}%`)
          .limit(5);

        if (profilesError) {
          console.error("Error searching profiles:", profilesError);
        } else if (profiles) {
          allResults.push(
            ...profiles.map((profile) => ({
              type: "user" as const,
              id: profile.id,
              title: profile.username,
              subtitle: "User profile",
              image: profile.avatar_url || undefined,
            }))
          );
        }

        // Search marketplace sales - get matching jerseys first
        const { data: matchingJerseyIds, error: matchingError } = await supabase
          .from("jerseys")
          .select("id")
          .or(`club.ilike.%${searchQuery}%,season.ilike.%${searchQuery}%,player_name.ilike.%${searchQuery}%`)
          .eq("visibility", "public");

        if (!matchingError && matchingJerseyIds && matchingJerseyIds.length > 0) {
          const { data: sales, error: salesError } = await supabase
            .from("sale_listings")
            .select(`
              id,
              price,
              currency,
              jersey_id,
              jerseys!inner(id, club, season, images)
            `)
            .eq("status", "active")
            .in("jersey_id", matchingJerseyIds.map(j => j.id))
            .limit(5);

          if (salesError) {
            console.error("Error searching sales:", salesError);
          } else if (sales) {
            allResults.push(
              ...sales.map((sale) => ({
                type: "sale" as const,
                id: sale.jerseys.id,
                title: `${sale.jerseys.club} ${sale.jerseys.season}`,
                subtitle: `For Sale • ${sale.currency || "USD"} ${sale.price}`,
                image: sale.jerseys.images[0],
                price: sale.price,
              }))
            );
          }
        }

        // Search marketplace auctions
        if (!matchingError && matchingJerseyIds && matchingJerseyIds.length > 0) {
          const { data: auctions, error: auctionsError } = await supabase
            .from("auctions")
            .select(`
              id,
              current_bid,
              starting_bid,
              currency,
              jersey_id,
              jerseys!inner(id, club, season, images)
            `)
            .eq("status", "active")
            .in("jersey_id", matchingJerseyIds.map(j => j.id))
            .limit(5);

          if (auctionsError) {
            console.error("Error searching auctions:", auctionsError);
          } else if (auctions) {
            allResults.push(
              ...auctions.map((auction) => ({
                type: "auction" as const,
                id: auction.jerseys.id,
                title: `${auction.jerseys.club} ${auction.jerseys.season}`,
                subtitle: `Auction • ${auction.currency || "USD"} ${auction.current_bid || auction.starting_bid}`,
                image: auction.jerseys.images[0],
                price: auction.current_bid || auction.starting_bid,
              }))
            );
          }
        }

        setResults(allResults);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchContent, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  // Real-time subscriptions for live search updates
  useEffect(() => {
    if (!open || !search.trim()) return;

    const supabase = createClient();
    const channels = [
      supabase
        .channel("search-jerseys")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "jerseys" },
          () => {
            // Trigger re-search when jerseys change
            setSearch((s) => s + " ");
            setTimeout(() => setSearch((s) => s.trim()), 10);
          }
        )
        .subscribe(),
      
      supabase
        .channel("search-profiles")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => {
            setSearch((s) => s + " ");
            setTimeout(() => setSearch((s) => s.trim()), 10);
          }
        )
        .subscribe(),
      
      supabase
        .channel("search-sales")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "sale_listings" },
          () => {
            setSearch((s) => s + " ");
            setTimeout(() => setSearch((s) => s.trim()), 10);
          }
        )
        .subscribe(),
      
      supabase
        .channel("search-auctions")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "auctions" },
          () => {
            setSearch((s) => s + " ");
            setTimeout(() => setSearch((s) => s.trim()), 10);
          }
        )
        .subscribe(),
    ];

    return () => {
      channels.forEach((channel) => supabase.removeChannel(channel));
    };
  }, [open, search]);

  const handleSelect = (result: SearchResult) => {
    logSearch(search); // Log search to analytics
    addToHistory(search); // Add current search to history
    setOpen(false);
    setSearch("");
    
    if (result.type === "user") {
      router.push(`/user/${result.id}`);
    } else if (result.type === "jersey" || result.type === "sale" || result.type === "auction") {
      router.push(`/jersey/${result.id}`);
    }
  };

  // Handle selecting from history or trending
  const handleHistorySelect = (query: string) => {
    setSearch(query);
  };

  const groupedResults = {
    jerseys: results.filter((r) => r.type === "jersey"),
    users: results.filter((r) => r.type === "user"),
    marketplace: results.filter((r) => r.type === "sale" || r.type === "auction"),
  };

  return (
    <>
      {/* Command Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-lg">
          <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5" shouldFilter={false}>
            <CommandInput 
              placeholder="Search jerseys, users, marketplace..." 
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
          {!search ? (
            <>
              {searchHistory.length > 0 && (
                <>
                  <CommandGroup heading="Recent Searches">
                    {searchHistory.map((item) => (
                      <CommandItem
                        key={item.query}
                        onSelect={() => handleHistorySelect(item.query)}
                        className="flex items-center gap-3 px-4 py-3 group"
                      >
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.query}</div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            clearHistoryItem(item.query);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {trendingSearches.length > 0 && (
                <>
                  <CommandGroup heading="Trending Searches">
                    {trendingSearches.map((item) => (
                      <CommandItem
                        key={item.query}
                        onSelect={() => handleHistorySelect(item.query)}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <TrendingUp className="w-4 h-4 text-primary" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{item.query}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.count} {item.count === 1 ? "search" : "searches"}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {searchHistory.length === 0 && trendingSearches.length === 0 && (
                <CommandEmpty>
                  <div className="py-6 text-center text-sm">
                    <Search className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Start typing to search</p>
                  </div>
                </CommandEmpty>
              )}

              {(searchHistory.length > 0 || trendingSearches.length > 0) && (
                <div className="px-4 py-2">
                  {searchHistory.length > 0 && (
                    <button
                      onClick={clearAllHistory}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear history
                    </button>
                  )}
                </div>
              )}
            </>
          ) : results.length === 0 && !loading ? (
            <CommandEmpty>No results found.</CommandEmpty>
          ) : (
            <>
              {groupedResults.jerseys.length > 0 && (
                <>
                  <CommandGroup heading="Jerseys">
                    {groupedResults.jerseys.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        {result.image ? (
                          <img
                            src={result.image}
                            alt=""
                            className="w-10 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-12 rounded bg-secondary flex items-center justify-center">
                            <Shirt className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {groupedResults.users.length > 0 && (
                <>
                  <CommandGroup heading="Users">
                    {groupedResults.users.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                          {result.image ? (
                            <img
                              src={result.image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                </>
              )}

              {groupedResults.marketplace.length > 0 && (
                <>
                  <CommandGroup heading="Marketplace">
                    {groupedResults.marketplace.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleSelect(result)}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        {result.image ? (
                          <img
                            src={result.image}
                            alt=""
                            className="w-10 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-10 h-12 rounded bg-secondary flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        </div>
                        {result.type === "auction" && (
                          <TrendingUp className="w-4 h-4 text-primary" />
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </>
          )}
            </CommandList>
            
            {/* Keyboard shortcuts hint */}
            <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground flex items-center justify-between bg-secondary/30">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-background border border-border rounded">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-background border border-border rounded">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-background border border-border rounded">ESC</kbd>
                  Close
                </span>
              </div>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-background border border-border rounded">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-background border border-border rounded">⌫</kbd>
                Clear
              </span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
};


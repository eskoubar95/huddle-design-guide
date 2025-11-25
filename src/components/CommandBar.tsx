import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Shirt, User, ShoppingBag, Users, TrendingUp } from "lucide-react";

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
  const navigate = useNavigate();
  const { user } = useAuth();

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
        const searchQuery = search.toLowerCase();
        const allResults: SearchResult[] = [];

        // Search jerseys
        const { data: jerseys } = await supabase
          .from("jerseys")
          .select("id, club, season, jersey_type, player_name, images, visibility")
          .or(`club.ilike.%${searchQuery}%,season.ilike.%${searchQuery}%,player_name.ilike.%${searchQuery}%`)
          .eq("visibility", "public")
          .limit(5);

        if (jerseys) {
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
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${searchQuery}%`)
          .limit(5);

        if (profiles) {
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

        // Search marketplace sales
        const { data: sales } = await supabase
          .from("sale_listings")
          .select(`
            id,
            price,
            currency,
            jerseys!inner(id, club, season, images)
          `)
          .eq("status", "active")
          .or(`jerseys.club.ilike.%${searchQuery}%,jerseys.season.ilike.%${searchQuery}%`)
          .limit(5);

        if (sales) {
          allResults.push(
            ...sales.map((sale: any) => ({
              type: "sale" as const,
              id: sale.jerseys.id,
              title: `${sale.jerseys.club} ${sale.jerseys.season}`,
              subtitle: `For Sale • ${sale.currency} ${sale.price}`,
              image: sale.jerseys.images[0],
              price: sale.price,
            }))
          );
        }

        // Search marketplace auctions
        const { data: auctions } = await supabase
          .from("auctions")
          .select(`
            id,
            current_bid,
            starting_bid,
            currency,
            jerseys!inner(id, club, season, images)
          `)
          .eq("status", "active")
          .or(`jerseys.club.ilike.%${searchQuery}%,jerseys.season.ilike.%${searchQuery}%`)
          .limit(5);

        if (auctions) {
          allResults.push(
            ...auctions.map((auction: any) => ({
              type: "auction" as const,
              id: auction.jerseys.id,
              title: `${auction.jerseys.club} ${auction.jerseys.season}`,
              subtitle: `Auction • ${auction.currency} ${auction.current_bid || auction.starting_bid}`,
              image: auction.jerseys.images[0],
              price: auction.current_bid || auction.starting_bid,
            }))
          );
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

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setSearch("");
    
    if (result.type === "user") {
      navigate(`/user/${result.id}`);
    } else if (result.type === "jersey" || result.type === "sale" || result.type === "auction") {
      navigate(`/jersey/${result.id}`);
    }
  };

  const groupedResults = {
    jerseys: results.filter((r) => r.type === "jersey"),
    users: results.filter((r) => r.type === "user"),
    marketplace: results.filter((r) => r.type === "sale" || r.type === "auction"),
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors w-64"
      >
        <Search className="w-4 h-4" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Search jerseys, users, marketplace..." 
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {!search ? (
            <CommandEmpty>
              <div className="py-6 text-center text-sm">
                <Search className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Start typing to search</p>
              </div>
            </CommandEmpty>
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
      </CommandDialog>
    </>
  );
};

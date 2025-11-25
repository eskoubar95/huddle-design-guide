import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { Search, Gavel, Tag, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PlaceBid } from "@/components/PlaceBid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Jersey {
  id: string;
  club: string;
  season: string;
  jersey_type: string;
  player_name?: string;
  player_number?: string;
  condition_rating?: number;
  images: string[];
}

interface SaleListing extends Jersey {
  listing_id: string;
  price: number;
  currency: string;
  negotiable: boolean;
}

interface Auction extends Jersey {
  auction_id: string;
  current_bid?: number;
  starting_bid: number;
  buy_now_price?: number;
  currency: string;
  ends_at: string;
}

const ITEMS_PER_PAGE = 20;

const Marketplace = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"sales" | "auctions">("sales");
  const [sales, setSales] = useState<SaleListing[]>([]);
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [activeTab, searchQuery, filterType, filterSeason, minPrice, maxPrice]);

  useEffect(() => {
    if (activeTab === "sales") {
      fetchSales();
    } else {
      fetchAuctions();
    }
  }, [activeTab, searchQuery, filterType, filterSeason, minPrice, maxPrice, currentPage]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sale_listings")
        .select(`
          id,
          price,
          currency,
          negotiable,
          jerseys (
            id,
            club,
            season,
            jersey_type,
            player_name,
            player_number,
            condition_rating,
            images
          )
        `, { count: "exact" })
        .eq("status", "active");

      // Apply filters
      if (searchQuery) {
        query = query.or(`jerseys.club.ilike.%${searchQuery}%,jerseys.player_name.ilike.%${searchQuery}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const formattedSales: SaleListing[] = (data || [])
        .filter((item: any) => item.jerseys)
        .map((item: any) => ({
          ...item.jerseys,
          listing_id: item.id,
          price: item.price,
          currency: item.currency,
          negotiable: item.negotiable,
        }))
        .filter((sale: SaleListing) => {
          if (filterType !== "all" && sale.jersey_type !== filterType) return false;
          if (filterSeason !== "all" && sale.season !== filterSeason) return false;
          if (minPrice && sale.price < parseFloat(minPrice)) return false;
          if (maxPrice && sale.price > parseFloat(maxPrice)) return false;
          return true;
        });

      setSales(formattedSales);
      setTotalItems(count || 0);
    } catch (error) {
      console.error("Error fetching sales:", error);
      toast({
        title: "Error",
        description: "Failed to load listings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("auctions")
        .select(`
          id,
          current_bid,
          starting_bid,
          buy_now_price,
          currency,
          ends_at,
          jerseys (
            id,
            club,
            season,
            jersey_type,
            player_name,
            player_number,
            condition_rating,
            images
          )
        `, { count: "exact" })
        .eq("status", "active");

      // Apply filters
      if (searchQuery) {
        query = query.or(`jerseys.club.ilike.%${searchQuery}%,jerseys.player_name.ilike.%${searchQuery}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await query
        .order("ends_at", { ascending: true })
        .range(from, to);

      if (error) throw error;

      const formattedAuctions: Auction[] = (data || [])
        .filter((item: any) => item.jerseys)
        .map((item: any) => ({
          ...item.jerseys,
          auction_id: item.id,
          current_bid: item.current_bid,
          starting_bid: item.starting_bid,
          buy_now_price: item.buy_now_price,
          currency: item.currency,
          ends_at: item.ends_at,
        }))
        .filter((auction: Auction) => {
          if (filterType !== "all" && auction.jersey_type !== filterType) return false;
          if (filterSeason !== "all" && auction.season !== filterSeason) return false;
          const currentBid = auction.current_bid || auction.starting_bid;
          if (minPrice && currentBid < parseFloat(minPrice)) return false;
          if (maxPrice && currentBid > parseFloat(maxPrice)) return false;
          return true;
        });

      setAuctions(formattedAuctions);
      setTotalItems(count || 0);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      toast({
        title: "Error",
        description: "Failed to load auctions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBidClick = (auction: Auction) => {
    setSelectedAuction(auction);
    setBidModalOpen(true);
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const clearFilters = () => {
    setFilterType("all");
    setFilterSeason("all");
    setMinPrice("");
    setMaxPrice("");
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-full">
                  <SlidersHorizontal className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  <div>
                    <Label htmlFor="type">Jersey Type</Label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="Home">Home</SelectItem>
                        <SelectItem value="Away">Away</SelectItem>
                        <SelectItem value="Third">Third</SelectItem>
                        <SelectItem value="Fourth">Fourth</SelectItem>
                        <SelectItem value="Special Edition">Special Edition</SelectItem>
                        <SelectItem value="GK Home">GK Home</SelectItem>
                        <SelectItem value="GK Away">GK Away</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="season">Season</Label>
                    <Select value={filterSeason} onValueChange={setFilterSeason}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Seasons</SelectItem>
                        <SelectItem value="2024/25">2024/25</SelectItem>
                        <SelectItem value="2023/24">2023/24</SelectItem>
                        <SelectItem value="2022/23">2022/23</SelectItem>
                        <SelectItem value="2021/22">2021/22</SelectItem>
                        <SelectItem value="2020/21">2020/21</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Price Range (€)</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jerseys, clubs, players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("sales")}
              className={cn(
                "flex-1 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                activeTab === "sales"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Tag className="w-4 h-4" />
              For Sale ({activeTab === "sales" ? totalItems : ""})
            </button>
            <button
              onClick={() => setActiveTab("auctions")}
              className={cn(
                "flex-1 py-2 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2",
                activeTab === "auctions"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Gavel className="w-4 h-4" />
              Auctions ({activeTab === "auctions" ? totalItems : ""})
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 lg:px-8 pt-6">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : activeTab === "sales" ? (
            sales.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {sales.map((sale) => (
                    <div
                      key={sale.listing_id}
                      className="group relative rounded-xl overflow-hidden transition-all cursor-pointer bg-card hover:bg-card-hover shadow-card hover:shadow-elevated border border-border/50 hover:border-primary/30"
                      onClick={() => navigate(`/jersey/${sale.id}`)}
                    >
                      {/* Jersey Image */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-secondary">
                        <img
                          src={sale.images[0] || "/placeholder.svg"}
                          alt={`${sale.club} ${sale.season}`}
                          className="w-full h-full object-cover transition-all group-hover:scale-105"
                        />

                        {/* Condition badge */}
                        {sale.condition_rating && (
                          <div className="absolute top-2 left-2">
                            <Badge variant="secondary" className="backdrop-blur-sm bg-background/60">
                              {sale.condition_rating}/10
                            </Badge>
                          </div>
                        )}

                        {/* Price badge */}
                        <div className="absolute bottom-2 left-2 right-2">
                          <div className="px-3 py-1.5 rounded-lg backdrop-blur-md bg-primary/90 border border-primary">
                            <p className="text-sm font-bold text-primary-foreground text-center">
                              {sale.currency} {sale.price.toLocaleString()}
                              {sale.negotiable && (
                                <span className="text-xs ml-1">(Negotiable)</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3 space-y-1">
                        <h3 className="font-bold text-sm truncate">{sale.club}</h3>
                        <p className="text-xs text-muted-foreground">
                          {sale.season} • {sale.jersey_type}
                        </p>
                        {sale.player_name && (
                          <p className="text-xs text-primary font-medium truncate">
                            {sale.player_name}
                            {sale.player_number && ` #${sale.player_number}`}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Items For Sale</h3>
                <p className="text-muted-foreground">
                  {searchQuery || filterType !== "all" || filterSeason !== "all"
                    ? "Try adjusting your filters"
                    : "Check back later for new listings"}
                </p>
              </div>
            )
          ) : auctions.length > 0 ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {auctions.map((auction) => (
                  <div
                    key={auction.auction_id}
                    className="bg-card rounded-lg border border-border overflow-hidden hover:border-primary transition-colors cursor-pointer"
                    onClick={() => navigate(`/jersey/${auction.id}`)}
                  >
                    <div className="aspect-[3/4] bg-secondary relative">
                      <img
                        src={auction.images[0] || "/placeholder.svg"}
                        alt={`${auction.club} ${auction.season}`}
                        className="w-full h-full object-cover"
                      />
                      {auction.condition_rating && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="secondary" className="backdrop-blur-sm bg-background/60">
                            {auction.condition_rating}/10
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-1 truncate">{auction.club}</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        {auction.season} • {auction.jersey_type}
                      </p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Current Bid</span>
                        <span className="text-lg font-bold text-primary">
                          {auction.currency}{" "}
                          {(auction.current_bid || auction.starting_bid).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">Ends in</span>
                        <CountdownTimer endsAt={auction.ends_at} />
                      </div>
                      <Button
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBidClick(auction);
                        }}
                      >
                        Place Bid
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterType !== "all" || filterSeason !== "all"
                  ? "Try adjusting your filters"
                  : "Check back later for new auctions"}
              </p>
            </div>
          )}
        </div>
      </div>

      {selectedAuction && (
        <PlaceBid
          isOpen={bidModalOpen}
          onClose={() => {
            setBidModalOpen(false);
            setSelectedAuction(null);
            if (activeTab === "auctions") {
              fetchAuctions(); // Refresh to show updated bid
            }
          }}
          auctionId={selectedAuction.auction_id}
          currentBid={selectedAuction.current_bid}
          startingBid={selectedAuction.starting_bid}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Marketplace;

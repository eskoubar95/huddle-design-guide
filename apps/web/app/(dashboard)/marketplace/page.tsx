'use client'

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, Gavel, Tag, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { CountdownTimer } from "@/components/marketplace/CountdownTimer";
import { PlaceBid } from "@/components/marketplace/PlaceBid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useMarketplaceSales, useMarketplaceAuctions, type AuctionWithJersey } from "@/lib/hooks/use-marketplace";
// Removed unused import: useToast
import { cn } from "@/lib/utils";
import { ProtectedRoute } from "@/components/ProtectedRoute";
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

// Removed unused interfaces: SaleListing, Auction

const ITEMS_PER_PAGE = 20;

const Marketplace = () => {
  const router = useRouter();
  // Removed unused: toast
  const [activeTab, setActiveTab] = useState<"sales" | "auctions">("sales");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuction, setSelectedAuction] = useState<AuctionWithJersey | null>(null);
  const [bidModalOpen, setBidModalOpen] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch marketplace data with joins
  const {
    sales,
    isLoading: salesLoading,
    totalItems: salesTotal,
  } = useMarketplaceSales({
    searchQuery,
    filterType,
    filterSeason,
    minPrice,
    maxPrice,
  });

  const {
    auctions,
    isLoading: auctionsLoading,
    totalItems: auctionsTotal,
    refetch: refetchAuctions,
  } = useMarketplaceAuctions({
    searchQuery,
    filterType,
    filterSeason,
    minPrice,
    maxPrice,
  });

  // Polling for auctions (replaces real-time subscriptions)
  useEffect(() => {
    if (activeTab !== "auctions") return;

    const interval = setInterval(() => {
      refetchAuctions();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [activeTab, refetchAuctions]);

  const loading = activeTab === "sales" ? salesLoading : auctionsLoading;
  const totalItems = activeTab === "sales" ? salesTotal : auctionsTotal;

  useEffect(() => {
    // Reset to page 1 when filters change
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setCurrentPage(1);
    }, 0);
  }, [activeTab, searchQuery, filterType, filterSeason, minPrice, maxPrice]);

  // Paginate filtered results
  const paginatedSales = useMemo(() => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE;
    return sales.slice(from, to);
  }, [sales, currentPage]);

  const paginatedAuctions = useMemo(() => {
    const from = (currentPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE;
    return auctions.slice(from, to);
  }, [auctions, currentPage]);

  const handleBidClick = (auction: AuctionWithJersey) => {
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
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* Page Header */}
        <header className="sticky top-16 z-30 bg-background/95 backdrop-blur-xl border-b border-border">
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
              paginatedSales.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {paginatedSales.map((sale) => (
                      <div
                        key={sale.listing_id}
                        className="group relative rounded-xl overflow-hidden transition-all cursor-pointer bg-card hover:bg-card-hover shadow-card hover:shadow-elevated border border-border/50 hover:border-primary/30"
                        onClick={() => router.push(`/wardrobe/${sale.id}`)}
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
            ) : paginatedAuctions.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedAuctions.map((auction) => (
                    <div
                      key={auction.auction_id}
                      className="bg-card rounded-lg border border-border overflow-hidden hover:border-primary transition-colors cursor-pointer"
                      onClick={() => router.push(`/wardrobe/${auction.id}`)}
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
                          <CountdownTimer 
                            endsAt={auction.ends_at} 
                            onExpire={() => refetchAuctions()} 
                          />
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
                refetchAuctions(); // Refresh to show updated bid
              }
            }}
            auctionId={selectedAuction.auction_id}
            currentBid={selectedAuction.current_bid}
            startingBid={selectedAuction.starting_bid}
          />
        )}
      </div>
    </ProtectedRoute>
  );
};

export default Marketplace;


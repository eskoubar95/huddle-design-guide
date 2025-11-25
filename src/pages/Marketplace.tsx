import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Search, Gavel, Tag } from "lucide-react";
import { JerseyCard } from "@/components/JerseyCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { PlaceBid } from "@/components/PlaceBid";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Listing {
  id: string;
  jersey_id: string;
  price?: number;
  current_bid?: number;
  starting_bid?: number;
  ends_at?: string;
  status: string;
}

const Marketplace = () => {
  const [activeTab, setActiveTab] = useState<"sales" | "auctions">("sales");
  const [sales, setSales] = useState<Listing[]>([]);
  const [auctions, setAuctions] = useState<Listing[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<Listing | null>(null);
  const [bidModalOpen, setBidModalOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "sales") {
      fetchSales();
    } else {
      fetchAuctions();
    }
  }, [activeTab]);

  const fetchSales = async () => {
    const { data, error } = await supabase
      .from("sale_listings")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSales(data);
    }
  };

  const fetchAuctions = async () => {
    const { data, error } = await supabase
      .from("auctions")
      .select("*")
      .eq("status", "active")
      .order("ends_at", { ascending: true });

    if (!error && data) {
      setAuctions(data);
    }
  };

  const handleBidClick = (auction: Listing) => {
    setSelectedAuction(auction);
    setBidModalOpen(true);
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Marketplace</h1>
          </div>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search jerseys, clubs, players..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-smooth"
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
              For Sale
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
              Auctions
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 lg:px-8 pt-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === "sales" ? (
            sales.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {sales.map((sale) => (
                  <div key={sale.id} className="relative">
                    <JerseyCard
                      id={sale.jersey_id}
                      image="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=600&fit=crop"
                      club="FC Barcelona"
                      season="2023/24"
                      type="Home"
                      condition={9}
                      forSale={true}
                      price={`€${sale.price?.toFixed(2)}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Items For Sale</h3>
                <p className="text-muted-foreground">
                  Check back later for new listings
                </p>
              </div>
            )
          ) : auctions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {auctions.map((auction) => (
                <div
                  key={auction.id}
                  className="bg-card rounded-lg border border-border overflow-hidden hover:border-primary transition-colors cursor-pointer"
                  onClick={() => handleBidClick(auction)}
                >
                  <div className="aspect-[3/4] bg-secondary">
                    <img
                      src="https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=400&h=600&fit=crop"
                      alt="Jersey"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Current Bid</span>
                      <span className="text-lg font-bold text-primary">
                        €{(auction.current_bid || auction.starting_bid)?.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ends in</span>
                      {auction.ends_at && (
                        <CountdownTimer endsAt={auction.ends_at} />
                      )}
                    </div>
                    <button className="w-full mt-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium">
                      Place Bid
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Gavel className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Auctions</h3>
              <p className="text-muted-foreground">
                Check back later for new auctions
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
          }}
          auctionId={selectedAuction.id}
          currentBid={selectedAuction.current_bid}
          startingBid={selectedAuction.starting_bid || 0}
        />
      )}

      <BottomNav />
    </div>
  );
};

export default Marketplace;

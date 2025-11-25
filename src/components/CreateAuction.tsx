import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CreateAuctionProps {
  isOpen: boolean;
  onClose: () => void;
  jerseyId: string;
}

const durations = [
  { hours: 24, label: "24 Hours" },
  { hours: 48, label: "48 Hours" },
  { hours: 72, label: "72 Hours" },
  { hours: 168, label: "7 Days" },
];

export const CreateAuction = ({ isOpen, onClose, jerseyId }: CreateAuctionProps) => {
  const [startingBid, setStartingBid] = useState("");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [duration, setDuration] = useState(24);
  const [shippingWorldwide, setShippingWorldwide] = useState(true);
  const [shippingLocalOnly, setShippingLocalOnly] = useState(false);
  const [shippingCostBuyer, setShippingCostBuyer] = useState(true);
  const [shippingCostSeller, setShippingCostSeller] = useState(false);
  const [shippingFreeInCountry, setShippingFreeInCountry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!startingBid || parseFloat(startingBid) <= 0) {
      toast({
        title: "Invalid Starting Bid",
        description: "Please enter a valid starting bid",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not Authenticated",
          description: "Please log in to create an auction",
          variant: "destructive",
        });
        return;
      }

      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + duration);

      const { error } = await supabase.from("auctions").insert({
        jersey_id: jerseyId,
        seller_id: user.id,
        starting_bid: parseFloat(startingBid),
        buy_now_price: buyNowPrice ? parseFloat(buyNowPrice) : null,
        duration_hours: duration,
        shipping_worldwide: shippingWorldwide,
        shipping_local_only: shippingLocalOnly,
        shipping_cost_buyer: shippingCostBuyer,
        shipping_cost_seller: shippingCostSeller,
        shipping_free_in_country: shippingFreeInCountry,
        ends_at: endsAt.toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Auction Started!",
        description: "Your auction is now live",
      });
      onClose();
    } catch (error) {
      console.error("Error creating auction:", error);
      toast({
        title: "Error",
        description: "Failed to create auction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold">Start Auction</h2>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {/* Starting Bid */}
            <div>
              <Label htmlFor="startingBid">Starting Bid (€)</Label>
              <Input
                id="startingBid"
                type="number"
                placeholder="0.00"
                value={startingBid}
                onChange={(e) => setStartingBid(e.target.value)}
                className="mt-2"
                step="0.01"
                min="0"
              />
            </div>

            {/* Buy Now Price (Optional) */}
            <div>
              <Label htmlFor="buyNowPrice">
                Buy Now Price (€) <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="buyNowPrice"
                type="number"
                placeholder="0.00"
                value={buyNowPrice}
                onChange={(e) => setBuyNowPrice(e.target.value)}
                className="mt-2"
                step="0.01"
                min="0"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Allow buyers to purchase immediately at this price
              </p>
            </div>

            {/* Duration */}
            <div>
              <Label>Auction Duration</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {durations.map((d) => (
                  <button
                    key={d.hours}
                    onClick={() => setDuration(d.hours)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-colors text-left",
                      duration === d.hours
                        ? "border-primary bg-secondary"
                        : "border-border hover:border-muted"
                    )}
                  >
                    <span className="font-medium">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Shipping Options */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Shipping Options</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                  <div>
                    <div className="font-medium">Worldwide Shipping</div>
                    <div className="text-sm text-muted-foreground">
                      Ship to any country
                    </div>
                  </div>
                  <Switch
                    checked={shippingWorldwide}
                    onCheckedChange={setShippingWorldwide}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                  <div>
                    <div className="font-medium">Local Only</div>
                    <div className="text-sm text-muted-foreground">
                      Only ship within your country
                    </div>
                  </div>
                  <Switch
                    checked={shippingLocalOnly}
                    onCheckedChange={setShippingLocalOnly}
                  />
                </div>
              </div>
            </div>

            {/* Shipping Cost */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Who Pays Shipping?</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setShippingCostBuyer(true);
                    setShippingCostSeller(false);
                    setShippingFreeInCountry(false);
                  }}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-colors text-left",
                    shippingCostBuyer
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  )}
                >
                  <div className="font-semibold">Buyer Pays</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Buyer covers all shipping costs
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShippingCostBuyer(false);
                    setShippingCostSeller(true);
                    setShippingFreeInCountry(false);
                  }}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-colors text-left",
                    shippingCostSeller
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  )}
                >
                  <div className="font-semibold">Seller Pays</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Free shipping for buyers
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShippingCostBuyer(false);
                    setShippingCostSeller(false);
                    setShippingFreeInCountry(true);
                  }}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-colors text-left",
                    shippingFreeInCountry
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  )}
                >
                  <div className="font-semibold">Free in Country</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Free for local, buyer pays for international
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-border bg-card p-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Starting..." : "Start Auction"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

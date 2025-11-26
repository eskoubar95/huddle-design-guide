'use client'

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { z } from "zod";

interface CreateAuctionProps {
  isOpen: boolean;
  onClose: () => void;
  jerseyId: string;
  onSuccess?: () => void;
}

const durations = [
  { hours: 24, label: "24 Hours" },
  { hours: 48, label: "48 Hours" },
  { hours: 72, label: "72 Hours" },
  { hours: 168, label: "7 Days" },
];

const auctionSchema = z.object({
  jerseyId: z.string().uuid("Invalid jersey ID"),
  startingBid: z.number().positive("Starting bid must be greater than 0"),
  buyNowPrice: z.number().positive().optional(),
  durationHours: z.union([z.literal(24), z.literal(48), z.literal(72), z.literal(168)]),
  currency: z.enum(["EUR", "DKK", "USD"]).default("EUR"),
  shippingWorldwide: z.boolean().default(true),
  shippingLocalOnly: z.boolean().default(false),
  shippingCostBuyer: z.boolean().default(true),
  shippingCostSeller: z.boolean().default(false),
  shippingFreeInCountry: z.boolean().default(false),
});

export const CreateAuction = ({ isOpen, onClose, jerseyId, onSuccess }: CreateAuctionProps) => {
  const [startingBid, setStartingBid] = useState("");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [duration, setDuration] = useState<24 | 48 | 72 | 168>(24);
  const [shippingWorldwide, setShippingWorldwide] = useState(true);
  const [shippingLocalOnly, setShippingLocalOnly] = useState(false);
  const [shippingCostBuyer, setShippingCostBuyer] = useState(true);
  const [shippingCostSeller, setShippingCostSeller] = useState(false);
  const [shippingFreeInCountry, setShippingFreeInCountry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setErrors({});

    try {
      const startingBidNum = parseFloat(startingBid);
      const buyNowPriceNum = buyNowPrice ? parseFloat(buyNowPrice) : undefined;

      const validated = auctionSchema.parse({
        jerseyId,
        startingBid: startingBidNum,
        buyNowPrice: buyNowPriceNum,
        durationHours: duration,
        currency: "EUR" as const,
        shippingWorldwide,
        shippingLocalOnly,
        shippingCostBuyer,
        shippingCostSeller,
        shippingFreeInCountry,
      });

      setIsSubmitting(true);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not Authenticated",
          description: "Please log in to create an auction",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Check if jersey already has active auction
      const { data: existingAuction } = await supabase
        .from("auctions")
        .select("id")
        .eq("jersey_id", jerseyId)
        .eq("status", "active")
        .single();

      if (existingAuction) {
        toast({
          title: "Already Listed",
          description: "This jersey already has an active auction",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + validated.durationHours);

      const { error } = await supabase.from("auctions").insert({
        jersey_id: validated.jerseyId,
        seller_id: user.id,
        starting_bid: validated.startingBid,
        buy_now_price: validated.buyNowPrice || null,
        duration_hours: validated.durationHours,
        currency: validated.currency || null,
        shipping_worldwide: validated.shippingWorldwide,
        shipping_local_only: validated.shippingLocalOnly,
        shipping_cost_buyer: validated.shippingCostBuyer,
        shipping_cost_seller: validated.shippingCostSeller,
        shipping_free_in_country: validated.shippingFreeInCountry,
        ends_at: endsAt.toISOString(),
        status: "active",
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Listed",
            description: "This jersey already has an active auction",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Auction Started!",
        description: "Your auction is now live",
      });

      onSuccess?.();
      onClose();
      
      // Reset form
      setStartingBid("");
      setBuyNowPrice("");
      setDuration(24);
      setShippingWorldwide(true);
      setShippingLocalOnly(false);
      setShippingCostBuyer(true);
      setShippingCostSeller(false);
      setShippingFreeInCountry(false);
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0].toString()] = issue.message;
          }
        });
        setErrors(fieldErrors);
        
        const firstError = error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
        
        // Focus first error field
        if (firstError.path[0] === "startingBid") {
          document.getElementById("startingBid")?.focus();
        }
      } else {
        console.error("Error creating auction:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create auction. Please try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
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
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close dialog"
              >
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
              <Label htmlFor="startingBid">Starting Bid (€) *</Label>
              <Input
                id="startingBid"
                type="number"
                placeholder="0.00"
                value={startingBid}
                onChange={(e) => {
                  setStartingBid(e.target.value);
                  if (errors.startingBid) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.startingBid;
                      return next;
                    });
                  }
                }}
                className="mt-2"
                step="0.01"
                min="0"
                required
                aria-required="true"
                aria-invalid={!!errors.startingBid}
                aria-describedby={errors.startingBid ? "startingBid-error" : undefined}
              />
              {errors.startingBid && (
                <p id="startingBid-error" className="text-sm text-destructive mt-1" role="alert">
                  {errors.startingBid}
                </p>
              )}
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
                onChange={(e) => {
                  setBuyNowPrice(e.target.value);
                  if (errors.buyNowPrice) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.buyNowPrice;
                      return next;
                    });
                  }
                }}
                className="mt-2"
                step="0.01"
                min="0"
                aria-invalid={!!errors.buyNowPrice}
                aria-describedby={errors.buyNowPrice ? "buyNowPrice-error" : undefined}
              />
              {errors.buyNowPrice && (
                <p id="buyNowPrice-error" className="text-sm text-destructive mt-1" role="alert">
                  {errors.buyNowPrice}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-1">
                Allow buyers to purchase immediately at this price
              </p>
            </div>

            {/* Duration */}
            <div>
              <Label>Auction Duration *</Label>
              <div className="grid grid-cols-2 gap-3 mt-2" role="radiogroup" aria-label="Auction duration">
                {durations.map((d) => (
                  <button
                    key={d.hours}
                    onClick={() => setDuration(d.hours as 24 | 48 | 72 | 168)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      duration === d.hours
                        ? "border-primary bg-secondary"
                        : "border-border hover:border-muted"
                    )}
                    aria-pressed={duration === d.hours}
                    role="radio"
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
                    aria-label="Worldwide shipping"
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
                    aria-label="Local shipping only"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Cost */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Who Pays Shipping?</h3>
              <div className="space-y-3" role="radiogroup" aria-label="Shipping cost payment">
                <button
                  onClick={() => {
                    setShippingCostBuyer(true);
                    setShippingCostSeller(false);
                    setShippingFreeInCountry(false);
                  }}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    shippingCostBuyer
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  )}
                  aria-pressed={shippingCostBuyer}
                  role="radio"
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
                    "w-full p-4 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    shippingCostSeller
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  )}
                  aria-pressed={shippingCostSeller}
                  role="radio"
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
                    "w-full p-4 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    shippingFreeInCountry
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  )}
                  aria-pressed={shippingFreeInCountry}
                  role="radio"
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
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !startingBid || parseFloat(startingBid) <= 0}
            >
              {isSubmitting ? "Starting..." : "Start Auction"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};


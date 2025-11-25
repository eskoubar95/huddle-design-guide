import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CreateSaleListingProps {
  isOpen: boolean;
  onClose: () => void;
  jerseyId: string;
}

export const CreateSaleListing = ({ isOpen, onClose, jerseyId }: CreateSaleListingProps) => {
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [shippingWorldwide, setShippingWorldwide] = useState(true);
  const [shippingLocalOnly, setShippingLocalOnly] = useState(false);
  const [shippingCostBuyer, setShippingCostBuyer] = useState(true);
  const [shippingCostSeller, setShippingCostSeller] = useState(false);
  const [shippingFreeInCountry, setShippingFreeInCountry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!price || parseFloat(price) <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid price",
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
          description: "Please log in to create a listing",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("sale_listings").insert({
        jersey_id: jerseyId,
        seller_id: user.id,
        price: parseFloat(price),
        negotiable,
        shipping_worldwide: shippingWorldwide,
        shipping_local_only: shippingLocalOnly,
        shipping_cost_buyer: shippingCostBuyer,
        shipping_cost_seller: shippingCostSeller,
        shipping_free_in_country: shippingFreeInCountry,
      });

      if (error) throw error;

      toast({
        title: "Listing Created!",
        description: "Your jersey is now for sale",
      });
      onClose();
    } catch (error) {
      console.error("Error creating listing:", error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
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
              <h2 className="text-xl font-bold">Create Sale Listing</h2>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {/* Price */}
            <div>
              <Label htmlFor="price">Price (€)</Label>
              <Input
                id="price"
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-2"
                step="0.01"
                min="0"
              />
            </div>

            {/* Negotiable */}
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div>
                <div className="font-medium">Negotiable Price</div>
                <div className="text-sm text-muted-foreground">
                  Allow buyers to make offers
                </div>
              </div>
              <Switch checked={negotiable} onCheckedChange={setNegotiable} />
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
                  className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                    shippingCostBuyer
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  }`}
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
                  className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                    shippingCostSeller
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  }`}
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
                  className={`w-full p-4 rounded-lg border-2 transition-colors text-left ${
                    shippingFreeInCountry
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  }`}
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
              {isSubmitting ? "Creating..." : "Publish Listing"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

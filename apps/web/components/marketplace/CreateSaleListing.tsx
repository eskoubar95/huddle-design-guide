'use client'

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

interface CreateSaleListingProps {
  isOpen: boolean;
  onClose: () => void;
  jerseyId: string;
  onSuccess?: () => void;
}

const saleListingSchema = z.object({
  jerseyId: z.string().uuid("Invalid jersey ID"),
  price: z.number().positive("Price must be greater than 0"),
  currency: z.enum(["EUR", "DKK", "USD"]).default("EUR"),
  negotiable: z.boolean().default(false),
  shippingWorldwide: z.boolean().default(true),
  shippingLocalOnly: z.boolean().default(false),
  shippingCostBuyer: z.boolean().default(true),
  shippingCostSeller: z.boolean().default(false),
  shippingFreeInCountry: z.boolean().default(false),
});

export const CreateSaleListing = ({ isOpen, onClose, jerseyId, onSuccess }: CreateSaleListingProps) => {
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
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
      const priceNum = parseFloat(price);
      
      const validated = saleListingSchema.parse({
        jerseyId,
        price: priceNum,
        currency: "EUR" as const,
        negotiable,
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
          description: "Please log in to create a listing",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Check if jersey already has active listing
      const { data: existingListing } = await supabase
        .from("sale_listings")
        .select("id")
        .eq("jersey_id", jerseyId)
        .eq("status", "active")
        .single();

      if (existingListing) {
        toast({
          title: "Already Listed",
          description: "This jersey already has an active listing",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("sale_listings").insert({
        jersey_id: validated.jerseyId,
        seller_id: user.id,
        price: validated.price,
        currency: validated.currency,
        negotiable: validated.negotiable,
        shipping_worldwide: validated.shippingWorldwide,
        shipping_local_only: validated.shippingLocalOnly,
        shipping_cost_buyer: validated.shippingCostBuyer,
        shipping_cost_seller: validated.shippingCostSeller,
        shipping_free_in_country: validated.shippingFreeInCountry,
      });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation (jersey already listed)
          toast({
            title: "Already Listed",
            description: "This jersey already has an active listing",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Listing Created!",
        description: "Your jersey is now for sale",
      });

      onSuccess?.();
      onClose();
      
      // Reset form
      setPrice("");
      setNegotiable(false);
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
        if (firstError.path[0] === "price") {
          document.getElementById("price")?.focus();
        }
      } else {
        console.error("Error creating listing:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to create listing. Please try again.";
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
              <h2 className="text-xl font-bold">Create Sale Listing</h2>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            {/* Price */}
            <div>
              <Label htmlFor="price">Price (€) *</Label>
              <Input
                id="price"
                type="number"
                placeholder="0.00"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  if (errors.price) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.price;
                      return next;
                    });
                  }
                }}
                className="mt-2"
                step="0.01"
                min="0"
                required
                aria-required="true"
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? "price-error" : undefined}
              />
              {errors.price && (
                <p id="price-error" className="text-sm text-destructive mt-1" role="alert">
                  {errors.price}
                </p>
              )}
            </div>

            {/* Negotiable */}
            <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
              <div>
                <div className="font-medium">Negotiable Price</div>
                <div className="text-sm text-muted-foreground">
                  Allow buyers to make offers
                </div>
              </div>
              <Switch 
                checked={negotiable} 
                onCheckedChange={setNegotiable}
                aria-label="Negotiable price"
              />
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
                  className={`w-full p-4 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary ${
                    shippingCostBuyer
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  }`}
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
                  className={`w-full p-4 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary ${
                    shippingCostSeller
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  }`}
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
                  className={`w-full p-4 rounded-lg border-2 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary ${
                    shippingFreeInCountry
                      ? "border-primary bg-secondary"
                      : "border-border hover:border-muted"
                  }`}
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
              disabled={isSubmitting || !price || parseFloat(price) <= 0}
            >
              {isSubmitting ? "Creating..." : "Publish Listing"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};



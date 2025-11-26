'use client'

import { useState, useEffect } from "react";
import { X, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

interface PlaceBidProps {
  isOpen: boolean;
  onClose: () => void;
  auctionId: string;
  currentBid?: number;
  startingBid: number;
  onSuccess?: () => void;
}

export const PlaceBid = ({
  isOpen,
  onClose,
  auctionId,
  currentBid,
  startingBid,
  onSuccess,
}: PlaceBidProps) => {
  const minBid = currentBid ? currentBid + 1 : startingBid;
  const [bidAmount, setBidAmount] = useState(minBid.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [auctionStatus, setAuctionStatus] = useState<"active" | "ended" | null>(null);

  // Check auction status when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    const checkAuctionStatus = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("auctions")
          .select("status, ends_at")
          .eq("id", auctionId)
          .single();

        if (error) {
          // Handle specific error cases
          if (error.code === "PGRST116") {
            // No rows returned - auction doesn't exist
            console.warn("Auction not found:", auctionId);
            setAuctionStatus("ended");
            return;
          }
          
          // Log error details properly
          console.error("Error checking auction status:", {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          });
          // Don't block UI - assume auction is active if we can't check
          setAuctionStatus("active");
          return;
        }

        if (data) {
          const isEnded = data.status !== "active" || new Date(data.ends_at) < new Date();
          setAuctionStatus(isEnded ? "ended" : "active");
        } else {
          // No data returned
          setAuctionStatus("ended");
        }
      } catch (err) {
        // Catch any unexpected errors
        console.error("Unexpected error checking auction status:", err instanceof Error ? err.message : String(err));
        // Don't block UI - assume auction is active if we can't check
        setAuctionStatus("active");
      }
    };

    checkAuctionStatus();
  }, [isOpen, auctionId]);

  // Update bid amount when currentBid changes
  useEffect(() => {
    if (isOpen) {
      const newMinBid = currentBid ? currentBid + 1 : startingBid;
      setBidAmount(newMinBid.toString());
    }
  }, [isOpen, currentBid, startingBid]);

  if (!isOpen) return null;

  const createBidSchema = (minBidAmount: number) =>
    z.object({
      amount: z
        .number()
        .positive("Bid amount must be greater than 0")
        .refine(
          (val) => val >= minBidAmount,
          `Bid must be at least €${minBidAmount.toFixed(2)}`
        ),
    });

  const handleSubmit = async () => {
    setErrors({});

    if (auctionStatus === "ended") {
      toast({
        title: "Auction Ended",
        description: "This auction has already ended",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseFloat(bidAmount);
      const schema = createBidSchema(minBid);
      const validated = schema.parse({ amount });

      setIsSubmitting(true);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast({
          title: "Not Authenticated",
          description: "Please log in to place a bid",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Re-check auction status and current bid before submitting
      const { data: auctionData, error: auctionError } = await supabase
        .from("auctions")
        .select("status, ends_at, current_bid, starting_bid")
        .eq("id", auctionId)
        .single();

      if (auctionError) {
        throw new Error("Failed to verify auction status");
      }

      if (auctionData?.status !== "active" || new Date(auctionData.ends_at) < new Date()) {
        toast({
          title: "Auction Ended",
          description: "This auction has ended",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const latestMinBid = (auctionData.current_bid || auctionData.starting_bid) + 1;
      if (validated.amount < latestMinBid) {
        toast({
          title: "Bid Too Low",
          description: `Current bid is now €${(auctionData.current_bid || auctionData.starting_bid).toFixed(2)}. Minimum bid is €${latestMinBid.toFixed(2)}`,
          variant: "destructive",
        });
        setBidAmount(latestMinBid.toString());
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("bids").insert({
        auction_id: auctionId,
        bidder_id: user.id,
        amount: validated.amount,
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Bid Already Placed",
            description: "You have already placed a bid on this auction",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Bid Placed!",
        description: `Your bid of €${validated.amount.toFixed(2)} has been placed`,
      });

      onSuccess?.();
      onClose();
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
        
        // Focus error field
        document.getElementById("bidAmount")?.focus();
      } else {
        console.error("Error placing bid:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to place bid. Please try again.";
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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-lg border border-border">
        {/* Header */}
        <div className="border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Place Bid</h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {auctionStatus === "ended" && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive" role="alert">
              <p className="font-medium">This auction has ended</p>
            </div>
          )}

          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Bid</span>
              <span className="font-semibold" aria-live="polite">
                €{(currentBid || startingBid).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minimum Bid</span>
              <span className="font-semibold text-primary" aria-live="polite">
                €{minBid.toFixed(2)}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="bidAmount">Your Bid (€) *</Label>
            <Input
              id="bidAmount"
              type="number"
              placeholder={minBid.toFixed(2)}
              value={bidAmount}
              onChange={(e) => {
                setBidAmount(e.target.value);
                if (errors.amount) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.amount;
                    return next;
                  });
                }
              }}
              className="mt-2"
              step="0.01"
              min={minBid}
              required
              aria-required="true"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "bidAmount-error" : undefined}
            />
            {errors.amount && (
              <p id="bidAmount-error" className="text-sm text-destructive mt-1" role="alert">
                {errors.amount}
              </p>
            )}
          </div>

          <div className="bg-secondary/30 rounded-lg p-4 text-sm text-muted-foreground">
            <p>
              ⚠️ Your card may be pre-authorized to prevent fake bids. The charge will
              only be processed if you win the auction.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || auctionStatus === "ended" || !bidAmount || parseFloat(bidAmount) < minBid} 
            className="flex-1"
          >
            {isSubmitting ? "Placing..." : "Place Bid"}
          </Button>
        </div>
      </div>
    </div>
  );
};


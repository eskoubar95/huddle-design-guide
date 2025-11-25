import { useState } from "react";
import { X, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface PlaceBidProps {
  isOpen: boolean;
  onClose: () => void;
  auctionId: string;
  currentBid?: number;
  startingBid: number;
}

export const PlaceBid = ({
  isOpen,
  onClose,
  auctionId,
  currentBid,
  startingBid,
}: PlaceBidProps) => {
  const minBid = currentBid ? currentBid + 1 : startingBid;
  const [bidAmount, setBidAmount] = useState(minBid.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    const amount = parseFloat(bidAmount);

    if (!amount || amount < minBid) {
      toast({
        title: "Invalid Bid",
        description: `Minimum bid is €${minBid.toFixed(2)}`,
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
          description: "Please log in to place a bid",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("bids").insert({
        auction_id: auctionId,
        bidder_id: user.id,
        amount,
      });

      if (error) throw error;

      toast({
        title: "Bid Placed!",
        description: `Your bid of €${amount.toFixed(2)} has been placed`,
      });
      onClose();
    } catch (error) {
      console.error("Error placing bid:", error);
      toast({
        title: "Error",
        description: "Failed to place bid. Please try again.",
        variant: "destructive",
      });
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
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Current Bid</span>
              <span className="font-semibold">
                €{(currentBid || startingBid).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Minimum Bid</span>
              <span className="font-semibold text-primary">€{minBid.toFixed(2)}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="bidAmount">Your Bid (€)</Label>
            <Input
              id="bidAmount"
              type="number"
              placeholder={minBid.toFixed(2)}
              value={bidAmount}
              onChange={(e) => setBidAmount(e.target.value)}
              className="mt-2"
              step="0.01"
              min={minBid}
            />
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
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Placing..." : "Place Bid"}
          </Button>
        </div>
      </div>
    </div>
  );
};

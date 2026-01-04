"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Clock } from "lucide-react";
import { useApiRequest } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { formatCurrency, formatDate } from "@/lib/utils/format";

interface Payout {
  id: string;
  amount: number;
  currency: string;
  completed_at: string;
  stripe_transfer_id: string;
  buyer_id: string;
  seller_id: string;
}

function SellerPayoutsPage() {
  const apiRequest = useApiRequest();
  const { toast } = useToast();

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    const fetchPayouts = async () => {
      try {
        const response = await apiRequest<{
          payouts: Payout[];
          nextCursor: string | null;
        }>("/seller/payouts?limit=50");

        if (response.payouts) {
          const payoutList = response.payouts;
          setPayouts(payoutList);

          // Calculate total earnings
          const total = payoutList.reduce((sum, payout) => sum + payout.amount, 0);
          setTotalEarnings(total);
        }
      } catch (error) {
        console.error("Failed to fetch payouts:", error);
        toast({
          title: "Error",
          description: "Failed to load payout history. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
    // Intentionally exclude apiRequest/toast - they are stable references and including them causes unnecessary re-fetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <CardTitle>Total Earnings</CardTitle>
          </div>
          <CardDescription>
            Total payouts received from completed sales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {formatCurrency(totalEarnings, "EUR", { isMinorUnits: true })}
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Based on {payouts.length} completed payout{payouts.length !== 1 ? "s" : ""}
          </p>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <CardTitle>Payout History</CardTitle>
          </div>
          <CardDescription>
            View your payout history and transaction details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No payouts yet.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Payouts are sent automatically when orders are delivered.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {formatCurrency(payout.amount, payout.currency, { isMinorUnits: true })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(payout.completed_at, 'medium')}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      Transfer ID: {payout.stripe_transfer_id && payout.stripe_transfer_id.length > 16
                        ? `${payout.stripe_transfer_id.slice(0, 16)}...`
                        : payout.stripe_transfer_id || "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                      Completed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>About Payouts:</strong> Payouts are sent automatically to your connected Stripe
              account when the buyer receives the item and the order is marked as delivered.
            </p>
            <p>
              <strong>Payout Timing:</strong> Once an order is delivered, the payout is typically
              processed within 1-2 business days, depending on your Stripe account settings.
            </p>
            <p>
              <strong>Currency:</strong> All payouts are processed in EUR for this MVP version.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SellerPayoutsPageWithProtection() {
  return (
    <ProtectedRoute>
      <SellerPayoutsPage />
    </ProtectedRoute>
  );
}

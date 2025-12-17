"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { useApiRequest } from "@/lib/api/client";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";

interface StripeAccount {
  id: string;
  stripe_account_id: string;
  status: "pending" | "active" | "restricted";
  payouts_enabled: boolean;
  charges_enabled: boolean;
  created_at: string;
  updated_at: string;
}

function ConnectStripePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const apiRequest = useApiRequest();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [accountStatus, setAccountStatus] = useState<StripeAccount | null>(null);

  const success = searchParams?.get("success");
  const refresh = searchParams?.get("refresh");

  // Fetch account status on mount
  useEffect(() => {
    const fetchAccountStatus = async () => {
      try {
        const response = await apiRequest<StripeAccount | null>("/seller/stripe-account");
        // Handle null response (when no account exists)
        if (response) {
          setAccountStatus(response);
        } else {
          setAccountStatus(null);
        }
      } catch (error) {
        console.error("Failed to fetch account status:", error);
        toast({
          title: "Error",
          description: "Failed to load account status. Please try again.",
          variant: "destructive",
        });
        setAccountStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - apiRequest and toast are stable references

  // Show success/refresh messages
  useEffect(() => {
    if (success) {
      toast({
        title: "Account Connected",
        description: "Your Stripe account setup is in progress. Verification may take a few minutes.",
      });
      // Clear query params
      router.replace("/seller/connect-stripe");
    }

    if (refresh) {
      toast({
        title: "Setup Incomplete",
        description: "Please complete your account setup to continue.",
        variant: "destructive",
      });
      // Clear query params
      router.replace("/seller/connect-stripe");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [success, refresh]); // Only depend on query params

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await apiRequest<{ url: string }>("/seller/stripe-account/connect", {
        method: "POST",
      });

      if (response && response.url) {
        // Redirect to Stripe OAuth flow
        window.location.href = response.url;
      } else {
        throw new Error("No onboarding URL returned");
      }
    } catch (error) {
      console.error("Failed to initiate Connect flow:", error);
      toast({
        title: "Connection Failed",
        description: "Failed to start Stripe account connection. Please try again.",
        variant: "destructive",
      });
      setConnecting(false);
    }
  };

  const getStatusIcon = () => {
    if (!accountStatus) return null;

    switch (accountStatus.status) {
      case "active":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "restricted":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusMessage = () => {
    if (!accountStatus) {
      return {
        title: "Connect Your Stripe Account",
        description: "To receive payouts from sales, you need to connect your Stripe account.",
        variant: "default" as const,
      };
    }

    switch (accountStatus.status) {
      case "active":
        if (accountStatus.payouts_enabled && accountStatus.charges_enabled) {
          return {
            title: "Account Active",
            description: "Your Stripe account is active and ready to receive payouts.",
            variant: "default" as const,
          };
        }
        return {
          title: "Account Setup In Progress",
          description: "Your account is being verified. Some features may not be available yet.",
          variant: "default" as const,
        };
      case "pending":
        return {
          title: "Verification Pending",
          description: "Your account is being verified by Stripe. This usually takes a few minutes.",
          variant: "default" as const,
        };
      case "restricted":
        return {
          title: "Action Required",
          description: "Your account needs attention. Please complete the required information.",
          variant: "destructive" as const,
        };
      default:
        return {
          title: "Unknown Status",
          description: "Unable to determine account status.",
          variant: "default" as const,
        };
    }
  };

  const statusMessage = getStatusMessage();
  const isFullyActive = accountStatus?.status === "active" &&
                        accountStatus?.payouts_enabled &&
                        accountStatus?.charges_enabled;
  const needsSetup = !accountStatus ||
                     accountStatus.status === "pending" ||
                     accountStatus.status === "restricted" ||
                     !isFullyActive;

  if (loading) {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle>Stripe Connect</CardTitle>
          </div>
          <CardDescription>
            Connect your Stripe account to receive payouts from your sales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={statusMessage.variant}>
            <AlertTitle>{statusMessage.title}</AlertTitle>
            <AlertDescription>{statusMessage.description}</AlertDescription>
          </Alert>

          {accountStatus && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Account Status</span>
                <span className="font-medium capitalize">{accountStatus.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Payouts Enabled</span>
                <span className="font-medium">
                  {accountStatus.payouts_enabled ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Charges Enabled</span>
                <span className="font-medium">
                  {accountStatus.charges_enabled ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Account ID</span>
                <span className="font-mono text-xs">
                  {accountStatus.stripe_account_id.slice(0, 12)}...
                </span>
              </div>
            </div>
          )}

          {needsSetup && (
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full"
              size="lg"
            >
              {connecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  {accountStatus ? "Complete Setup" : "Connect Stripe Account"}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}

          {isFullyActive && (
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
              Your Stripe account is fully set up. You&apos;ll receive payouts automatically when orders are delivered.
            </div>
          )}

          <div className="pt-4 border-t text-xs text-muted-foreground space-y-2">
            <p>
              <strong>About Stripe Connect:</strong> We use Stripe Connect to securely process payments and send you payouts.
            </p>
            <p>
              <strong>Payout Timing:</strong> Payouts are sent automatically when the buyer receives the item and the order is marked as delivered.
            </p>
            <p>
              <strong>Currency:</strong> All transactions are processed in EUR for this MVP version.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConnectStripePageWithProtection() {
  return (
    <ProtectedRoute>
      <ConnectStripePage />
    </ProtectedRoute>
  );
}

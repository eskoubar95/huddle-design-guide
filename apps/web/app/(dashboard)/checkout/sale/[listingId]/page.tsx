"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useListing } from "@/lib/hooks/use-listings";
import { useJersey } from "@/lib/hooks/use-jerseys";
import { useProfile } from "@/lib/hooks/use-profiles";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { JerseyImageWithLoading } from "@/components/jersey/JerseyImageWithLoading";
import { PriceBreakdown } from "@/components/checkout/PriceBreakdown";
import {
  AlertCircle,
  ArrowLeft,
  Package,
  CreditCard,
  Truck,
  ShieldCheck,
} from "lucide-react";

// Default platform fee percentage (matches FeeService)
const DEFAULT_PLATFORM_FEE_PCT = 5.0;

/**
 * Checkout page for sale listings
 *
 * Guards:
 * - Owner cannot buy their own listing
 * - Redirects to onboarding if profile incomplete
 *
 * Phases (per HUD-34):
 * - Phase 1: Basic page structure, data loading, guards ✓
 * - Phase 2: Shipping selection (ShippingMethodSelector + ServicePointPicker)
 * - Phase 3: Backend checkout endpoint
 * - Phase 4: Payment (Stripe Payment Element)
 * - Phase 5: Confirmation + QA
 */
export default function SaleCheckoutPage() {
  const params = useParams<{ listingId: string }>();
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const listingId = params.listingId || "";

  // Redirect reason state for friendly messaging
  const [redirectReason, setRedirectReason] = useState<string | null>(null);

  // Fetch listing data
  const {
    data: listing,
    isLoading: listingLoading,
    error: listingError,
  } = useListing(listingId);

  // Fetch jersey data (once listing is loaded)
  const {
    data: jersey,
    isLoading: jerseyLoading,
    error: jerseyError,
  } = useJersey(listing?.jersey_id || "");

  // Fetch seller profile for display
  const { data: sellerProfile } = useProfile(listing?.seller_id || "");

  // Derive loading state
  const isLoading = !userLoaded || listingLoading || (listing && jerseyLoading);

  // Guard: Owner cannot buy their own listing
  useEffect(() => {
    if (userLoaded && listing && user?.id === listing.seller_id) {
      setRedirectReason("own_listing");
      // Delay redirect to show message
      const timeout = setTimeout(() => {
        router.push(`/wardrobe/${listing.jersey_id}`);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [userLoaded, listing, user?.id, router]);

  // Guard: Listing must be active
  useEffect(() => {
    if (listing && listing.status !== "active") {
      setRedirectReason("listing_unavailable");
      const timeout = setTimeout(() => {
        router.push("/marketplace");
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [listing, router]);

  // Calculate price breakdown (client-side preview)
  const priceBreakdown = listing
    ? (() => {
        const itemCents = Math.round(listing.price * 100);
        const platformFeeCents = Math.round(
          (itemCents * DEFAULT_PLATFORM_FEE_PCT) / 100
        );
        // Shipping not selected yet - will be added in Phase 2
        const shippingCents = 0;
        const totalCents = itemCents + platformFeeCents + shippingCents;

        return {
          itemPrice: listing.price,
          platformFee: platformFeeCents / 100,
          shippingCost: shippingCents / 100,
          totalAmount: totalCents / 100,
        };
      })()
    : null;

  // Render redirect message
  if (redirectReason === "own_listing") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Du kan ikke købe din egen trøje</AlertTitle>
            <AlertDescription>
              Omdirigerer dig til din garderobe...
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedRoute>
    );
  }

  if (redirectReason === "listing_unavailable") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Alert className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Denne annonce er ikke længere tilgængelig</AlertTitle>
            <AlertDescription>
              Omdirigerer dig til markedspladsen...
            </AlertDescription>
          </Alert>
        </div>
      </ProtectedRoute>
    );
  }

  // Render error state
  if (listingError || jerseyError) {
    const errorMessage =
      listingError?.message || jerseyError?.message || "Ukendt fejl";
    const isNotFound =
      errorMessage.includes("NOT_FOUND") || errorMessage.includes("404");

    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto px-4 py-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbage
            </Button>

            <Alert variant="destructive" className="max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {isNotFound
                  ? "Annonce ikke fundet"
                  : "Der opstod en fejl"}
              </AlertTitle>
              <AlertDescription>
                {isNotFound
                  ? "Denne annonce findes ikke eller er blevet fjernet."
                  : `Kunne ikke hente annonce: ${errorMessage}`}
              </AlertDescription>
            </Alert>

            <div className="mt-6 text-center">
              <Button onClick={() => router.push("/marketplace")}>
                Gå til markedspladsen
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tilbage
            </Button>
            <h1 className="text-3xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">
              Gennemfør dit køb sikkert
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Jersey Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produkt
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex gap-4">
                      <Skeleton className="h-24 w-24 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/3" />
                      </div>
                    </div>
                  ) : jersey && listing ? (
                    <div className="flex gap-4">
                      <div className="relative h-24 w-24 rounded-lg overflow-hidden border">
                        <JerseyImageWithLoading
                          src={jersey.images[0] || "/placeholder-jersey.svg"}
                          alt={`${jersey.club} ${jersey.season}`}
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {jersey.club} {jersey.season}
                        </h3>
                        <p className="text-muted-foreground">
                          {jersey.jersey_type}
                          {jersey.player_name && ` • ${jersey.player_name}`}
                          {jersey.player_number && ` #${jersey.player_number}`}
                        </p>
                        {sellerProfile && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Sælger: @{sellerProfile.username}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Shipping Section - Phase 2 placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Levering
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                      <p className="text-muted-foreground text-center">
                        Leveringsvalg kommer i næste fase
                      </p>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        (Phase 2: ShippingMethodSelector + ServicePointPicker)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Section - Phase 4 placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Betaling
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
                      <p className="text-muted-foreground text-center">
                        Betalingsformular kommer i næste fase
                      </p>
                      <p className="text-xs text-muted-foreground text-center mt-1">
                        (Phase 4: Stripe Payment Element)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Ordre oversigt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading || !priceBreakdown ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-6 w-full mt-4" />
                    </div>
                  ) : (
                    <>
                      <PriceBreakdown
                        itemPrice={priceBreakdown.itemPrice}
                        platformFee={priceBreakdown.platformFee}
                        totalAmount={priceBreakdown.totalAmount}
                        currency={listing?.currency || "€"}
                        showShipping={false}
                      />

                      {/* Security badges */}
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                          <span>Sikker betaling via Stripe</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4 text-blue-600" />
                          <span>Køber-beskyttelse inkluderet</span>
                        </div>
                      </div>

                      {/* CTA Button - disabled until Phase 4 */}
                      <Button
                        className="w-full"
                        size="lg"
                        disabled
                      >
                        Betal nu
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        Betalingsknappen aktiveres når levering er valgt
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


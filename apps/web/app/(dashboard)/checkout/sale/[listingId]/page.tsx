"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
import { PriceBreakdown } from "@/components/checkout/PriceBreakdown";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import {
  ShippingMethodSelector,
  type ShippingOption,
} from "@/components/checkout/ShippingMethodSelector";
import { ShippingAddressPicker, type CheckoutAddressData } from "@/components/checkout/ShippingAddressPicker";
import { ServicePointPicker, type ServicePoint } from "@/components/checkout/ServicePointPicker";
import {
  AlertCircle,
  ArrowLeft,
  Package,
  CreditCard,
  Truck,
  ShieldCheck,
  MapPin,
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
 * - Phase 2: Shipping selection (ShippingMethodSelector + ServicePointPicker) ✓
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

  // Shipping state
  const [serviceType, setServiceType] = useState<"home_delivery" | "pickup_point">("home_delivery");
  const [shippingAddress, setShippingAddress] = useState<CheckoutAddressData | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(false);
  const [selectedShippingOption, setSelectedShippingOption] = useState<ShippingOption | null>(null);
  const [selectedServicePoint, setSelectedServicePoint] = useState<ServicePoint | null>(null);
  const [preferredPickupTime, setPreferredPickupTime] = useState("");
  const [courierIdForPudo, setCourierIdForPudo] = useState<number | undefined>(undefined);

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

  // Fetch buyer profile for country
  const { data: buyerProfile } = useProfile(user?.id || "");

  // Derive loading state
  const isLoading = !userLoaded || listingLoading || (listing && jerseyLoading);

  // Guard: Owner cannot buy their own listing
  useEffect(() => {
    if (userLoaded && listing && user?.id === listing.seller_id) {
      setRedirectReason("own_listing");
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

  // Handle address change from ShippingAddressPicker
  const handleAddressChange = useCallback(
    (address: CheckoutAddressData, isValid: boolean) => {
      setShippingAddress(address);
      setIsAddressValid(isValid);
      // Reset shipping option when address changes
      setSelectedShippingOption(null);
    },
    []
  );

  // Handle shipping option selection
  const handleShippingSelect = useCallback((option: ShippingOption) => {
    setSelectedShippingOption(option);
  }, []);

  // Handle service type change
  const handleServiceTypeChange = useCallback(
    (type: "home_delivery" | "pickup_point") => {
      setServiceType(type);
      setSelectedShippingOption(null);
      setSelectedServicePoint(null);
      setCourierIdForPudo(undefined);
    },
    []
  );

  // Handle courier ID available for PUDO
  const handleCourierIdAvailable = useCallback((courierId: number) => {
    setCourierIdForPudo(courierId);
  }, []);

  // Handle service point selection
  const handleServicePointSelect = useCallback((point: ServicePoint) => {
    setSelectedServicePoint(point);
  }, []);

  // Calculate price breakdown (client-side preview)
  const priceBreakdown = useMemo(() => {
    if (!listing) return null;

    const itemCents = Math.round(listing.price * 100);
    const platformFeeCents = Math.round((itemCents * DEFAULT_PLATFORM_FEE_PCT) / 100);
    const shippingCents = selectedShippingOption?.price || 0;
    const totalCents = itemCents + platformFeeCents + shippingCents;

    return {
      itemPrice: listing.price,
      platformFee: platformFeeCents / 100,
      shippingCost: shippingCents / 100,
      totalAmount: totalCents / 100,
    };
  }, [listing, selectedShippingOption]);

  // Check if checkout is ready
  const isCheckoutReady = useMemo(() => {
    if (!listing || !jersey) return false;
    if (!selectedShippingOption) return false;
    if (serviceType === "home_delivery" && !isAddressValid) return false;
    if (serviceType === "pickup_point" && !selectedServicePoint) return false;
    return true;
  }, [listing, jersey, selectedShippingOption, serviceType, isAddressValid, selectedServicePoint]);

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
              Back
            </Button>

            <Alert variant="destructive" className="max-w-md mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>
                {isNotFound ? "Listing not found" : "An error occurred"}
              </AlertTitle>
              <AlertDescription>
                {isNotFound
                  ? "This listing does not exist or has been removed."
                  : `Could not load listing: ${errorMessage}`}
              </AlertDescription>
            </Alert>

            <div className="mt-6 text-center">
              <Button onClick={() => router.push("/marketplace")}>
                Go to Marketplace
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
              Back
            </Button>
            <h1 className="text-3xl font-bold">Checkout</h1>
            <p className="text-muted-foreground">Complete your purchase securely</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Jersey Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Product
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
                    <CheckoutSummary
                      jersey={{
                        id: jersey.id,
                        club: jersey.club,
                        season: jersey.season,
                        jersey_type: jersey.jersey_type,
                        player_name: jersey.player_name,
                        player_number: jersey.player_number,
                        condition_rating: jersey.condition_rating,
                        images: jersey.images,
                      }}
                      seller={
                        sellerProfile
                          ? {
                              id: sellerProfile.id,
                              username: sellerProfile.username,
                              avatar_url: sellerProfile.avatar_url,
                              country: sellerProfile.country,
                            }
                          : null
                      }
                      listingPrice={listing.price}
                      currency={listing.currency || "€"}
                    />
                  ) : null}
                </CardContent>
              </Card>

              {/* Shipping Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Shipping
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {isLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <>
                      {/* Shipping Address Picker - shown first */}
                      <ShippingAddressPicker
                        onAddressChange={handleAddressChange}
                        selectedAddress={shippingAddress}
                      />

                      {/* Shipping Method Selector - only shown after address is selected */}
                      {isAddressValid && shippingAddress && (
                        <div className="pt-4 border-t">
                          <ShippingMethodSelector
                            listingId={listingId}
                            shippingAddress={shippingAddress}
                            serviceType={serviceType}
                            onServiceTypeChange={handleServiceTypeChange}
                            onSelect={handleShippingSelect}
                            selectedOptionId={selectedShippingOption?.id}
                            onCourierIdAvailable={handleCourierIdAvailable}
                            showTabs={true}
                          />
                        </div>
                      )}

                      {/* Pickup Point: Service Point Picker */}
                      {serviceType === "pickup_point" && isAddressValid && shippingAddress && (
                        <div className="pt-4 border-t">
                          <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Select Pickup Point
                          </h4>
                          <ServicePointPicker
                            courierId={courierIdForPudo}
                            country={shippingAddress.country || "DK"}
                            postalCode={shippingAddress.postal_code}
                            city={shippingAddress.city}
                            onSelect={handleServicePointSelect}
                            selectedPointId={selectedServicePoint?.id}
                            preferredPickupTime={preferredPickupTime}
                            onPreferredPickupTimeChange={setPreferredPickupTime}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Payment Section - Phase 4 placeholder */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment
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
                        Payment form coming in next phase
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
                  <CardTitle>Order Summary</CardTitle>
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
                        shippingCost={
                          selectedShippingOption ? priceBreakdown.shippingCost : undefined
                        }
                        platformFee={priceBreakdown.platformFee}
                        totalAmount={priceBreakdown.totalAmount}
                        currency={listing?.currency || "€"}
                        showShipping={true}
                        buyerCountry={buyerProfile?.country || shippingAddress?.country}
                        sellerCountry={sellerProfile?.country || undefined}
                        shippingMethodName={selectedShippingOption?.name}
                        serviceType={serviceType}
                      />

                      {/* Selected Service Point Info */}
                      {serviceType === "pickup_point" && selectedServicePoint && (
                        <div className="pt-4 border-t">
                          <p className="text-xs text-muted-foreground mb-1">
                            Pickup Point
                          </p>
                          <p className="text-sm font-medium">
                            {selectedServicePoint.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedServicePoint.address}
                          </p>
                        </div>
                      )}

                      {/* Security badges */}
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ShieldCheck className="h-4 w-4 text-green-600" />
                          <span>Secure payment via Stripe</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Package className="h-4 w-4 text-blue-600" />
                          <span>Buyer protection included</span>
                        </div>
                      </div>

                      {/* CTA Button */}
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={!isCheckoutReady}
                      >
                        Pay Now
                      </Button>
                      {!isCheckoutReady && (
                        <p className="text-xs text-muted-foreground text-center">
                          {!selectedShippingOption
                            ? "Select a shipping method to continue"
                            : serviceType === "pickup_point" && !selectedServicePoint
                            ? "Select a pickup point to continue"
                            : "Fill in shipping address to continue"}
                        </p>
                      )}
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

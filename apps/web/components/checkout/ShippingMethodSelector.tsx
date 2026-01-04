"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useApiRequest } from "@/lib/api/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Home, MapPin, AlertCircle, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShippingOption {
  id: string;
  name: string;
  price: number; // in cents
  estimatedDays: number | null;
  serviceType: "home_delivery" | "pickup_point";
  provider: string;
  method: string;
  metadata?: {
    courierId?: number; // Eurosender courierId for PUDO point search (when provider is "eurosender")
  };
}

interface ShippingMethodSelectorProps {
  listingId?: string;
  auctionId?: string;
  shippingAddress: {
    street: string;
    city: string;
    postal_code: string;
    country: string;
    state?: string;
  };
  serviceType?: "home_delivery" | "pickup_point";
  onServiceTypeChange?: (serviceType: "home_delivery" | "pickup_point") => void;
  onSelect: (option: ShippingOption) => void;
  selectedOptionId?: string;
  /** Called when a courierId is available for PUDO search */
  onCourierIdAvailable?: (courierId: number) => void;
  /** Show tabs for service type selection (default: true) */
  showTabs?: boolean;
  className?: string;
}

export function ShippingMethodSelector({
  listingId,
  auctionId,
  shippingAddress,
  serviceType = "home_delivery",
  onServiceTypeChange,
  onSelect,
  selectedOptionId,
  onCourierIdAvailable,
  showTabs = true,
  className,
}: ShippingMethodSelectorProps) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const apiRequest = useApiRequest();
  // Use ref to prevent infinite loop from apiRequest changing
  const apiRequestRef = useRef(apiRequest);
  apiRequestRef.current = apiRequest;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize shipping address to prevent unnecessary re-renders
  const shippingAddressKey = useMemo(
    () => JSON.stringify(shippingAddress),
    [shippingAddress.street, shippingAddress.city, shippingAddress.postal_code, shippingAddress.country, shippingAddress.state]
  );

  // Handle service type tab change
  const handleServiceTypeChange = useCallback(
    (value: string) => {
      const newType = value as "home_delivery" | "pickup_point";
      onServiceTypeChange?.(newType);
    },
    [onServiceTypeChange]
  );

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount((prev) => prev + 1);
  }, []);

  // Check if address is complete enough to fetch shipping options
  const isAddressComplete = useMemo(() => {
    return (
      shippingAddress.street?.trim().length > 0 &&
      shippingAddress.city?.trim().length > 0 &&
      shippingAddress.postal_code?.trim().length > 0 &&
      shippingAddress.country?.trim().length > 0
    );
  }, [shippingAddress.street, shippingAddress.city, shippingAddress.postal_code, shippingAddress.country]);

  useEffect(() => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't fetch if neither listingId nor auctionId is provided
    if (!listingId && !auctionId) {
      setLoading(false);
      setError(null);
      setOptions([]);
      return;
    }

    // Don't fetch if address is incomplete - show helpful message instead of error
    if (!isAddressComplete) {
      setLoading(false);
      setError(null);
      setOptions([]);
      return;
    }

    // Debounce: Wait a bit before fetching to avoid too many requests
    const timeoutId = setTimeout(() => {
      const fetchOptions = async () => {
        abortControllerRef.current = new AbortController();
        setLoading(true);
        setError(null);

        try {
          const effectiveServiceType = serviceType || "home_delivery";

          const data = await apiRequestRef.current<{ options: ShippingOption[] }>(
            "/shipping/calculate",
            {
              method: "POST",
              body: JSON.stringify({
                listingId,
                auctionId,
                shippingAddress,
                serviceType: effectiveServiceType,
              }),
              signal: abortControllerRef.current.signal,
            }
          );

          if (!abortControllerRef.current.signal.aborted) {
            const fetchedOptions = data.options || [];
            setOptions(fetchedOptions);

            // Always notify parent if courierId is available (for PUDO search)
            // The courierId is needed when user switches to pickup_point tab
            if (fetchedOptions.length > 0 && onCourierIdAvailable) {
              const optionWithCourierId = fetchedOptions.find(
                (opt) => opt.metadata?.courierId
              );
              if (optionWithCourierId?.metadata?.courierId) {
                onCourierIdAvailable(optionWithCourierId.metadata.courierId);
              }
            }
          }
        } catch (err: unknown) {
          if (
            (err instanceof Error && err.name === "AbortError") ||
            abortControllerRef.current?.signal.aborted
          ) {
            return;
          }

          if (err instanceof Error) {
            if (err.message.includes("listingId or auctionId required")) {
              setError("Please provide a listing or auction ID");
            } else if (err.message.includes("No shipping rates")) {
              setError(null);
              setOptions([]);
            } else if (err.message.includes("NOT_FOUND") || err.message.includes("404")) {
              setError("Listing or auction not found");
              setOptions([]);
            } else if (err.message.includes("INVALID_COUNTRY")) {
              setError("Shipping not available to this country");
              setOptions([]);
            } else {
              setError("Failed to load shipping options. Please try again.");
              setOptions([]);
            }
          } else {
            setError("Failed to load shipping options");
            setOptions([]);
          }
          console.error(err);
        } finally {
          if (!abortControllerRef.current?.signal.aborted) {
            setLoading(false);
          }
        }
      };

      fetchOptions();
    }, 500);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [listingId, auctionId, shippingAddressKey, serviceType, retryCount, onCourierIdAvailable, isAddressComplete]);

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  // Render loading state
  const renderLoading = () => (
    <div className="flex items-center justify-center p-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <span className="ml-2 text-muted-foreground">Loading shipping options...</span>
    </div>
  );

  // Render error state with retry
  const renderError = () => (
    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-destructive">Loading Error</p>
          <p className="text-sm text-destructive/80 mt-1">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            className="mt-3"
            aria-label="Retry loading shipping options"
          >
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Try again
          </Button>
        </div>
      </div>
    </div>
  );

  // Render empty state (different for incomplete address vs no options)
  const renderEmpty = () => {
    // If address is not complete, show helpful prompt
    if (!isAddressComplete) {
      return (
        <div className="p-4 bg-muted/50 rounded-lg border border-dashed">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5" />
            <p className="font-medium">Enter shipping address</p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Shipping options will appear once address is complete
          </p>
        </div>
      );
    }

    // Address is complete but no options found
    return (
      <div className="p-4 bg-muted rounded-lg">
        <p className="font-medium">No shipping options</p>
        <p className="text-sm text-muted-foreground mt-1">
          {serviceType === "pickup_point"
            ? "No pickup points found. Try home delivery instead."
            : "No shipping options found for this address."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          className="mt-3"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  };

  // Render options list
  const renderOptions = () => (
    <RadioGroup
      value={selectedOptionId}
      onValueChange={(value) => {
        const option = options.find((o) => o.id === value);
        if (option) {
          onSelect(option);
        }
      }}
      className="space-y-2"
      aria-label="Shipping options"
    >
      {options.map((option, index) => {
        // Create unique key using index to handle potential duplicate IDs from API
        const uniqueKey = `${option.id}-${index}`;
        const inputId = `shipping-option-${index}`;
        return (
        <div
          key={uniqueKey}
          className={cn(
            "flex items-center space-x-3 p-4 border rounded-lg transition-colors cursor-pointer",
            selectedOptionId === option.id
              ? "border-primary bg-primary/5"
              : "hover:bg-muted/50"
          )}
        >
          <RadioGroupItem value={option.id} id={inputId} />
          <Label htmlFor={inputId} className="flex-1 cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{option.name}</div>
                {option.estimatedDays && (
                  <div className="text-sm text-muted-foreground">
                    Delivery in ~{option.estimatedDays} day
                    {option.estimatedDays !== 1 ? "s" : ""}
                  </div>
                )}
                {option.provider && option.provider !== "manual" && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    via {option.provider}
                  </div>
                )}
              </div>
              <div className="font-semibold text-lg">
                {option.price === 0 ? (
                  <span className="text-green-600">Free</span>
                ) : (
                  formatPrice(option.price)
                )}
              </div>
            </div>
          </Label>
        </div>
        );
      })}
    </RadioGroup>
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Service Type Tabs */}
      {showTabs && (
        <Tabs
          value={serviceType}
          onValueChange={handleServiceTypeChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2" aria-label="Shipping method selection">
            <TabsTrigger 
              value="home_delivery" 
              className="flex items-center gap-2"
              aria-label="Home delivery - deliver to your address"
            >
              <Home className="h-4 w-4" aria-hidden="true" />
              Home Delivery
            </TabsTrigger>
            <TabsTrigger 
              value="pickup_point" 
              className="flex items-center gap-2"
              aria-label="Pickup point - collect from a nearby location"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              Pickup Point
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {/* Content */}
      <div className="min-h-[120px]">
        {loading && renderLoading()}
        {!loading && error && renderError()}
        {!loading && !error && options.length === 0 && renderEmpty()}
        {!loading && !error && options.length > 0 && renderOptions()}
      </div>
    </div>
  );
}

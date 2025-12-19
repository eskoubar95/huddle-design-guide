"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useApiRequest } from "@/lib/api/client";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface ShippingOption {
  id: string;
  name: string;
  price: number; // in cents
  estimatedDays: number | null;
  serviceType: "home_delivery" | "pickup_point";
  provider: string;
  method: string;
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
  onSelect: (option: ShippingOption) => void;
  selectedOptionId?: string;
}

export function ShippingMethodSelector({
  listingId,
  auctionId,
  shippingAddress,
  serviceType,
  onSelect,
  selectedOptionId,
}: ShippingMethodSelectorProps) {
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [loading, setLoading] = useState(false); // Start with false, only set true when actually fetching
  const [error, setError] = useState<string | null>(null);
  const apiRequest = useApiRequest();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize shipping address to prevent unnecessary re-renders
  const shippingAddressKey = useMemo(
    () => JSON.stringify(shippingAddress),
    [shippingAddress.street, shippingAddress.city, shippingAddress.postal_code, shippingAddress.country, shippingAddress.state]
  );

  useEffect(() => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't fetch if neither listingId nor auctionId is provided
    if (!listingId && !auctionId) {
      setLoading(false);
      setError("Please provide either a listing ID or auction ID");
      setOptions([]);
      return;
    }

    // Don't fetch if country is missing
    if (!shippingAddress.country) {
      setLoading(false);
      setError("Please provide a shipping address with country");
      setOptions([]);
      return;
    }

    // Debounce: Wait a bit before fetching to avoid too many requests
    const timeoutId = setTimeout(() => {
      const fetchOptions = async () => {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        setLoading(true);
        setError(null);

        try {
          const data = await apiRequest<{ options: ShippingOption[] }>(
            "/shipping/calculate",
            {
              method: "POST",
              body: JSON.stringify({
                listingId,
                auctionId,
                shippingAddress,
                serviceType,
              }),
              signal: abortControllerRef.current.signal,
            }
          );

          // Only update if request wasn't aborted
          if (!abortControllerRef.current.signal.aborted) {
            setOptions(data.options || []);
          }
        } catch (err: any) {
          // Ignore abort errors
          if (err.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
            return;
          }

          // Handle specific error messages
          if (err instanceof Error) {
            if (err.message.includes("listingId or auctionId required")) {
              setError("Please provide either a listing ID or auction ID");
            } else if (err.message.includes("No shipping rates")) {
              // This is not necessarily an error - just means no rates available
              setError(null);
              setOptions([]);
            } else if (err.message.includes("NOT_FOUND") || err.message.includes("404")) {
              setError("Listing or auction not found. Please check the ID.");
              setOptions([]);
            } else if (err.message.includes("INVALID_COUNTRY")) {
              setError("Shipping not available to this country");
              setOptions([]);
            } else {
              setError(`Failed to load shipping options: ${err.message}`);
              setOptions([]);
            }
          } else {
            setError("Failed to load shipping options");
            setOptions([]);
          }
          console.error(err);
        } finally {
          // Only update loading state if request wasn't aborted
          if (!abortControllerRef.current?.signal.aborted) {
            setLoading(false);
          }
        }
      };

      fetchOptions();
    }, 500); // 500ms debounce

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [listingId, auctionId, shippingAddressKey, serviceType]); // Removed apiRequest from dependencies

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading shipping options...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
        <p className="font-medium">Error</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <div className="p-4 bg-muted rounded-lg">
        <p className="font-medium">No shipping options available</p>
        <p className="text-sm text-muted-foreground mt-1">
          No shipping rates were found for this address. This might be because:
        </p>
        <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
          <li>Shipping provider returned no rates (check address or try again)</li>
          <li>No Medusa shipping options configured for this region</li>
          <li>Shipping not available to this country</li>
        </ul>
      </div>
    );
  }

  const formatPrice = (cents: number) => {
    return `€${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Shipping Method</h3>
      <RadioGroup
        value={selectedOptionId}
        onValueChange={(value) => {
          const option = options.find((o) => o.id === value);
          if (option) {
            onSelect(option);
          }
        }}
      >
        {options.map((option) => (
          <div
            key={option.id}
            className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50"
          >
            <RadioGroupItem value={option.id} id={option.id} />
            <Label htmlFor={option.id} className="flex-1 cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{option.name}</div>
                  {option.estimatedDays && (
                    <div className="text-sm text-muted-foreground">
                      Estimated {option.estimatedDays} day
                      {option.estimatedDays !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <div className="font-semibold">{formatPrice(option.price)}</div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}


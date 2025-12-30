"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useApiRequest } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  MapPin,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ServicePoint {
  id: string;
  provider: string;
  provider_id: string;
  name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  type: "service_point" | "locker" | "store";
  opening_hours: {
    openingHours?: Array<{
      dayNameLong: string;
      dayNameShort: string;
      times: Array<{ from: string; to: string }>;
    }>;
  } | null;
  distance_km: number | null;
}

interface ServicePointPickerProps {
  /** Courier ID from shipping quote (required for Eurosender PUDO) */
  courierId?: number;
  /** Country ISO code (required) */
  country: string;
  /** Default postal code for initial search (from shipping address) */
  postalCode?: string;
  /** City from shipping address (for display) */
  city?: string;
  /** Called when a service point is selected */
  onSelect: (point: ServicePoint) => void;
  /** Currently selected point ID */
  selectedPointId?: string;
  /** Optional preferred pickup time note */
  preferredPickupTime?: string;
  onPreferredPickupTimeChange?: (time: string) => void;
  className?: string;
}

export function ServicePointPicker({
  courierId,
  country,
  postalCode,
  city,
  onSelect,
  selectedPointId,
  preferredPickupTime = "",
  onPreferredPickupTimeChange,
  className,
}: ServicePointPickerProps) {
  const [points, setPoints] = useState<ServicePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [showDifferentArea, setShowDifferentArea] = useState(false);
  const [customPostalCode, setCustomPostalCode] = useState("");
  
  // Track if we've done initial auto-fetch
  const hasAutoFetched = useRef(false);
  
  // Track last fetched params to prevent duplicate fetches
  const lastFetchParams = useRef<string>("");

  const apiRequest = useApiRequest();
  const apiRequestRef = useRef(apiRequest);
  apiRequestRef.current = apiRequest;

  // Stable fetch function
  const fetchPoints = useCallback(async (postalCodeToSearch: string) => {
    if (!country || !postalCodeToSearch) {
      return;
    }

    // Build params key to detect duplicates (include courierId)
    const paramsKey = `${country}:${postalCodeToSearch}:${courierId || ""}`;
    if (paramsKey === lastFetchParams.current && hasFetched) {
      return; // Already fetched with same params
    }

    setLoading(true);
    setError(null);
    lastFetchParams.current = paramsKey;

    try {
      const params = new URLSearchParams();
      params.set("country", country.toLowerCase());
      params.set("postal_code", postalCodeToSearch);
      params.set("limit", "10");
      params.set("radius_km", "20");

      // Pass courierId for Eurosender PUDO API (uses address.zip search)
      if (courierId) {
        params.set("courier_id", courierId.toString());
      }

      const data = await apiRequestRef.current<{ points: ServicePoint[] }>(
        `/shipping/service-points?${params.toString()}`
      );

      setPoints(data.points || []);
      setHasFetched(true);
    } catch (err) {
      console.error("Service points fetch error:", err);
      setError("Failed to load pickup points. Please try again.");
      setPoints([]);
    } finally {
      setLoading(false);
    }
  }, [country, courierId, hasFetched]);

  // Auto-fetch when postal code is provided (only once)
  useEffect(() => {
    if (postalCode && !hasAutoFetched.current) {
      hasAutoFetched.current = true;
      fetchPoints(postalCode);
    }
  }, [postalCode, fetchPoints]);

  // Re-fetch when courierId becomes available (for better Eurosender PUDO results)
  const prevCourierIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    // Only re-fetch if courierId changed and we have a postal code
    if (
      courierId &&
      courierId !== prevCourierIdRef.current &&
      postalCode &&
      hasAutoFetched.current
    ) {
      prevCourierIdRef.current = courierId;
      // Clear hasFetched to allow re-fetch with courierId
      lastFetchParams.current = "";
      fetchPoints(postalCode);
    }
    prevCourierIdRef.current = courierId;
  }, [courierId, postalCode, fetchPoints]);

  // Handle search in different area
  const handleSearchDifferentArea = useCallback(() => {
    const trimmedCode = customPostalCode.trim();
    if (trimmedCode) {
      lastFetchParams.current = ""; // Force new fetch
      fetchPoints(trimmedCode);
      setShowDifferentArea(false);
    }
  }, [customPostalCode, fetchPoints]);

  // Format distance
  const formatDistance = (km: number | null) => {
    if (km === null) return null;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  // Format opening hours for today
  const getTodayHours = (point: ServicePoint): string | null => {
    if (!point.opening_hours?.openingHours) return null;

    const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
    const todayEntry = point.opening_hours.openingHours.find(
      (h) => h.dayNameShort.toLowerCase() === today.toLowerCase()
    );

    if (!todayEntry || todayEntry.times.length === 0) return "Closed today";

    const times = todayEntry.times.map((t) => `${t.from}-${t.to}`).join(", ");
    return times;
  };

  // Get display location text
  const locationText = city && postalCode 
    ? `${postalCode} ${city}` 
    : postalCode || "";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Searching pickup points near {locationText}...</span>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <Skeleton className="h-5 w-2/3 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-1/3 mt-2" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => postalCode && fetchPoints(postalCode)}
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && points.length === 0 && hasFetched && (
        <div className="p-6 bg-muted rounded-lg text-center">
          <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="font-medium">No pickup points found</p>
          <p className="text-sm text-muted-foreground mt-1">
            No pickup points available near {locationText}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setShowDifferentArea(true)}
          >
            Search in a different area
          </Button>
        </div>
      )}

      {/* Points List */}
      {!loading && !error && points.length > 0 && (
        <>
          {/* Results header */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {points.length} pickup point{points.length !== 1 ? "s" : ""} near{" "}
              <span className="font-medium text-foreground">{locationText}</span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={() => setShowDifferentArea(!showDifferentArea)}
            >
              {showDifferentArea ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Different area
                </>
              )}
            </Button>
          </div>

          {/* Different area search (collapsible) */}
          {showDifferentArea && (
            <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
              <Input
                placeholder="Enter postal code..."
                value={customPostalCode}
                onChange={(e) => setCustomPostalCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchDifferentArea()}
                className="flex-1"
              />
              <Button 
                variant="secondary" 
                onClick={handleSearchDifferentArea}
                disabled={!customPostalCode.trim()}
              >
                Search
              </Button>
            </div>
          )}

          <RadioGroup
            value={selectedPointId}
            onValueChange={(value) => {
              const point = points.find((p) => p.id === value);
              if (point) {
                onSelect(point);
              }
            }}
            className="space-y-2"
          >
            {points.map((point) => {
              const todayHours = getTodayHours(point);
              const distance = formatDistance(point.distance_km);

              return (
                <div
                  key={point.id}
                  className={cn(
                    "p-4 border rounded-lg transition-colors cursor-pointer",
                    selectedPointId === point.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={point.id} id={point.id} className="mt-1" />
                    <Label htmlFor={point.id} className="flex-1 cursor-pointer">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{point.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {point.address}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {point.postal_code} {point.city}
                          </div>
                        </div>
                        {distance && (
                          <span className="text-sm font-medium text-muted-foreground shrink-0">
                            {distance}
                          </span>
                        )}
                      </div>

                      {/* Opening Hours */}
                      {todayHours && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>Today: {todayHours}</span>
                        </div>
                      )}

                      {/* Type Badge */}
                      <div className="mt-2">
                        <span
                          className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            point.type === "locker"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : point.type === "store"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          )}
                        >
                          {point.type === "locker"
                            ? "Parcel Locker"
                            : point.type === "store"
                            ? "Store"
                            : "Pickup Point"}
                        </span>
                      </div>
                    </Label>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </>
      )}

      {/* Preferred Pickup Time (optional) */}
      {selectedPointId && onPreferredPickupTimeChange && (
        <div className="pt-4 border-t">
          <Label htmlFor="preferred-time" className="text-sm font-medium">
            Preferred pickup time (optional)
          </Label>
          <Input
            id="preferred-time"
            placeholder="e.g., Afternoon, After 4pm"
            value={preferredPickupTime}
            onChange={(e) => onPreferredPickupTimeChange(e.target.value)}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            This is just a note for the seller – not a guarantee.
          </p>
        </div>
      )}
    </div>
  );
}

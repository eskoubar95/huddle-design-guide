"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Truck, Globe, Home } from "lucide-react";

/**
 * PriceBreakdown - Shows buyer price breakdown
 *
 * Displays:
 * - Item price
 * - Shipping cost (with domestic/international indicator)
 * - Platform fee (service fee)
 * - Total amount
 * - Customs disclaimer for cross-border shipments
 *
 * Used in:
 * - Checkout pages
 * - Jersey detail page (before Buy Now)
 * - Payment confirmation
 */

interface PriceBreakdownProps {
  itemPrice: number; // in major units (EUR)
  shippingCost?: number; // in major units (EUR), optional
  platformFee: number; // in major units (EUR)
  totalAmount: number; // in major units (EUR)
  currency?: string; // Default: "€"
  showShipping?: boolean; // Whether to show shipping line (always shows if true, even if 0)
  /** Buyer country ISO code */
  buyerCountry?: string;
  /** Seller country ISO code */
  sellerCountry?: string;
  /** Shipping method name (e.g., "Standard", "Express") */
  shippingMethodName?: string;
  /** Service type for icon display */
  serviceType?: "home_delivery" | "pickup_point";
  className?: string;
}

export function PriceBreakdown({
  itemPrice,
  shippingCost,
  platformFee,
  totalAmount,
  currency = "€",
  showShipping = true,
  buyerCountry,
  sellerCountry,
  shippingMethodName,
  serviceType,
  className = "",
}: PriceBreakdownProps) {
  // Determine if cross-border (international)
  const isCrossBorder =
    buyerCountry && sellerCountry && buyerCountry !== sellerCountry;

  // Format currency with symbol
  const formatAmount = (amount: number) => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="text-sm font-medium text-muted-foreground">
        Price Breakdown
      </div>

      <div className="space-y-2">
        {/* Item Price */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Item Price</span>
          <span className="font-medium">{formatAmount(itemPrice)}</span>
        </div>

        {/* Shipping - always show if showShipping is true */}
        {showShipping && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              {serviceType === "pickup_point" ? (
                <Truck className="h-3.5 w-3.5" />
              ) : (
                <Home className="h-3.5 w-3.5" />
              )}
              <span>
                Shipping
                {shippingMethodName && (
                  <span className="text-xs ml-1">({shippingMethodName})</span>
                )}
              </span>
              {/* Domestic/International badge */}
              {buyerCountry && sellerCountry && (
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full",
                    isCrossBorder
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  )}
                >
                  {isCrossBorder ? (
                    <span className="flex items-center gap-0.5">
                      <Globe className="h-2.5 w-2.5" />
                      Intl
                    </span>
                  ) : (
                    "Domestic"
                  )}
                </span>
              )}
            </div>
            <span className="font-medium">
              {shippingCost === undefined ? (
                <span className="text-muted-foreground italic">Select shipping</span>
              ) : shippingCost === 0 ? (
                <span className="text-green-600">Free</span>
              ) : (
                formatAmount(shippingCost)
              )}
            </span>
          </div>
        )}

        {/* Platform Fee */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Service Fee (5%)</span>
          <span className="font-medium">{formatAmount(platformFee)}</span>
        </div>

        {/* Divider and Total */}
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{formatAmount(totalAmount)}</span>
          </div>
        </div>

        {/* Shipping not selected hint */}
        {!showShipping && (
          <p className="text-xs text-muted-foreground">
            Total excluding shipping
          </p>
        )}

        {/* Cross-border customs disclaimer */}
        {showShipping && isCrossBorder && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                  International Shipping
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  For deliveries from {sellerCountry} to {buyerCountry}, additional
                  customs duties or VAT charges may apply upon receipt and are
                  the buyer&apos;s responsibility.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

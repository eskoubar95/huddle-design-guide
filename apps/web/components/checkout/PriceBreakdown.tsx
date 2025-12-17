'use client'

/**
 * PriceBreakdown - Shows buyer price breakdown
 * 
 * Displays:
 * - Item price
 * - Shipping cost (if applicable)
 * - Platform fee (service fee)
 * - Total amount
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
  showShipping?: boolean; // Whether to show shipping line
  className?: string;
}

export function PriceBreakdown({
  itemPrice,
  shippingCost,
  platformFee,
  totalAmount,
  currency = "€",
  showShipping = true,
  className = "",
}: PriceBreakdownProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-muted-foreground">
        Price Breakdown
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Item Price</span>
          <span className="font-medium">
            {currency} {itemPrice.toFixed(2)}
          </span>
        </div>
        {showShipping && shippingCost !== undefined && shippingCost > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span className="font-medium">
              {currency} {shippingCost.toFixed(2)}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Service Fee (5%)</span>
          <span className="font-medium">
            {currency} {platformFee.toFixed(2)}
          </span>
        </div>
        <div className="border-t border-border pt-1.5 mt-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">
              {currency} {totalAmount.toFixed(2)}
            </span>
          </div>
        </div>
        {!showShipping && (
          <p className="text-xs text-muted-foreground mt-2">
            Total excl. shipping
          </p>
        )}
      </div>
    </div>
  );
}


'use client'

/**
 * PayoutBreakdown - Shows seller payout breakdown
 * 
 * Displays:
 * - Item price
 * - Seller fee (deducted)
 * - Payout amount (net)
 * 
 * Used in:
 * - Seller dashboard
 * - Listing creation preview
 * - Transaction details
 */

interface PayoutBreakdownProps {
  itemPrice: number; // in major units (EUR)
  sellerFee: number; // in major units (EUR)
  payoutAmount: number; // in major units (EUR)
  currency?: string; // Default: "€"
  className?: string;
}

export function PayoutBreakdown({
  itemPrice,
  sellerFee,
  payoutAmount,
  currency = "€",
  className = "",
}: PayoutBreakdownProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-muted-foreground">
        Payout Breakdown
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Item Price</span>
          <span className="font-medium">
            {currency} {itemPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Seller Fee (1%)</span>
          <span className="font-medium text-destructive">
            -{currency} {sellerFee.toFixed(2)}
          </span>
        </div>
        <div className="border-t border-border pt-1.5 mt-1.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold">You Will Receive</span>
            <span className="text-lg font-bold text-primary">
              {currency} {payoutAmount.toFixed(2)}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Payout calculated excl. shipping, depends on shipping method
        </p>
      </div>
    </div>
  );
}


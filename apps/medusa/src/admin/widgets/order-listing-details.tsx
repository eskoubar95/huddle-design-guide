import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, clx } from "@medusajs/ui"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"

/**
 * Listing Details Widget
 * 
 * Displays listing/auction details and shipping/tracking info:
 * - Listing type (sale/auction) with badge
 * - Listing ID / Auction ID
 * - Jersey ID
 * - Shipping method and cost
 * - Tracking number and provider
 * 
 * Data is read from order.metadata (populated by create_medusa_order RPC).
 */

// Extended order type with our custom metadata
interface HuddleOrderMetadata {
  listing_id?: string
  auction_id?: string
  listing_type?: "sale" | "auction"
  jersey_id?: string
  shipping_method?: string
  shipping_cost?: number
  tracking_number?: string
  shipping_provider?: string
  transaction_id?: string
}

interface OrderWithMetadata extends AdminOrder {
  metadata?: HuddleOrderMetadata | null
}

// Info row component
const InfoRow = ({ 
  label, 
  value, 
  mono = false,
  copyable = false 
}: { 
  label: string
  value: string | null | undefined
  mono?: boolean
  copyable?: boolean
}) => {
  if (!value) return null
  
  return (
    <div className={clx("grid grid-cols-2 items-start px-6 py-3")}>
      <Text size="small" weight="plus" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Text 
        size="small" 
        className={clx(
          "text-ui-fg-base break-all",
          mono && "font-mono text-xs"
        )}
      >
        {value}
      </Text>
    </div>
  )
}

const OrderListingDetailsWidget = ({
  data,
}: DetailWidgetProps<AdminOrder>) => {
  const order = data as OrderWithMetadata
  const metadata = order.metadata

  // If no listing metadata, don't render the widget
  if (!metadata || (!metadata.listing_id && !metadata.auction_id && !metadata.jersey_id)) {
    return null
  }

  const listingTypeDisplay = metadata.listing_type === "auction" ? "Auction" : "Sale"
  const listingTypeBadgeColor = metadata.listing_type === "auction" ? "purple" : "blue"
  
  // Get the right listing ID based on type
  const listingIdLabel = metadata.listing_type === "auction" ? "Auction ID" : "Listing ID"
  const listingIdValue = metadata.listing_type === "auction" ? metadata.auction_id : metadata.listing_id

  const hasShippingInfo = metadata.shipping_method || metadata.tracking_number

  return (
    <Container className="divide-y p-0">
      {/* Header with listing type badge */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Listing Details</Heading>
        {metadata.listing_type && (
          <Badge color={listingTypeBadgeColor} size="small">
            {listingTypeDisplay}
          </Badge>
        )}
      </div>

      {/* IDs Section */}
      <div className="divide-y">
        <InfoRow label={listingIdLabel} value={listingIdValue} mono />
        <InfoRow label="Jersey ID" value={metadata.jersey_id} mono />
        {metadata.transaction_id && (
          <InfoRow label="Transaction ID" value={metadata.transaction_id} mono />
        )}
      </div>

      {/* Shipping & Tracking Section */}
      {hasShippingInfo && (
        <div className="divide-y">
          <div className="px-6 py-3">
            <Text size="small" weight="plus" className="text-ui-fg-muted">
              Shipping & Tracking
            </Text>
          </div>
          <InfoRow label="Shipping Method" value={metadata.shipping_method} />
          {metadata.shipping_cost !== undefined && (
            <InfoRow 
              label="Shipping Cost" 
              value={`€${(metadata.shipping_cost / 100).toFixed(2)}`} 
            />
          )}
          {metadata.tracking_number && (
            <InfoRow 
              label="Tracking Number" 
              value={metadata.tracking_number}
              mono
            />
          )}
          {metadata.shipping_provider && (
            <InfoRow 
              label="Shipping Provider" 
              value={metadata.shipping_provider} 
            />
          )}
        </div>
      )}
    </Container>
  )
}

// Widget configuration - inject in right sidebar after Seller widget
export const config = defineWidgetConfig({
  zone: "order.details.side.after",
})

export default OrderListingDetailsWidget


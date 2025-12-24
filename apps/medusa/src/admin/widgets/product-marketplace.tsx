import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, clx } from "@medusajs/ui"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"

/**
 * Product Marketplace Widget
 * 
 * Displays Huddle marketplace context for products:
 * - Seller handle
 * - Listing type (sale/auction) and ID
 * - Jersey details (club, season, type, condition)
 * 
 * Data is read from product.metadata (populated by create_medusa_product RPC).
 */

// Extended product type with our custom metadata
interface HuddleProductMetadata {
  seller_handle?: string
  seller_id?: string
  listing_id?: string
  auction_id?: string
  listing_type?: "sale" | "auction"
  jersey_id?: string
  club?: string
  season?: string
  jersey_type?: string
  condition_rating?: number
  league?: string
}

interface ProductWithMetadata extends AdminProduct {
  metadata?: HuddleProductMetadata | null
}

const InfoRow = ({ 
  label, 
  value, 
  isBadge = false,
  badgeColor = "grey" 
}: { 
  label: string
  value: string | number | null | undefined
  isBadge?: boolean
  badgeColor?: "green" | "grey" | "blue" | "orange" | "red" | "purple"
}) => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  return (
    <div
      className={clx(
        "text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-3"
      )}
    >
      <Text size="small" weight="plus" leading="compact">
        {label}
      </Text>
      {isBadge ? (
        <Badge color={badgeColor} size="xsmall">
          {String(value)}
        </Badge>
      ) : (
        <Text
          size="small"
          leading="compact"
          className="text-ui-fg-base"
        >
          {String(value)}
        </Text>
      )}
    </div>
  )
}

const ConditionBadge = ({ rating }: { rating: number }) => {
  let color: "green" | "orange" | "red" = "grey" as never
  let label = "Unknown"

  if (rating >= 8) {
    color = "green"
    label = `Excellent (${rating}/10)`
  } else if (rating >= 5) {
    color = "orange"
    label = `Good (${rating}/10)`
  } else {
    color = "red"
    label = `Fair (${rating}/10)`
  }

  return (
    <Badge color={color} size="xsmall">
      {label}
    </Badge>
  )
}

const ProductMarketplaceWidget = ({
  data,
}: DetailWidgetProps<AdminProduct>) => {
  const product = data as ProductWithMetadata
  const metadata = product.metadata

  // If no marketplace metadata, don't render the widget
  if (!metadata || (!metadata.seller_handle && !metadata.listing_id && !metadata.jersey_id)) {
    return null
  }

  const listingTypeDisplay = metadata.listing_type === "auction" ? "Auction" : "Sale"
  const listingTypeBadgeColor = metadata.listing_type === "auction" ? "purple" : "blue"
  const listingId = metadata.listing_type === "auction" ? metadata.auction_id : metadata.listing_id

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Marketplace Info</Heading>
        {metadata.listing_type && (
          <Badge color={listingTypeBadgeColor} size="small">
            {listingTypeDisplay}
          </Badge>
        )}
      </div>

      {/* Seller Section */}
      <div className="divide-y">
        <InfoRow label="Seller" value={metadata.seller_handle} />
        {listingId && (
          <InfoRow 
            label={metadata.listing_type === "auction" ? "Auction ID" : "Listing ID"} 
            value={listingId} 
          />
        )}
        <InfoRow label="Jersey ID" value={metadata.jersey_id} />
      </div>

      {/* Jersey Details Section */}
      {(metadata.club || metadata.season || metadata.jersey_type) && (
        <div className="divide-y">
          <div className="px-6 py-3">
            <Text size="small" weight="plus" className="text-ui-fg-muted">
              Jersey Details
            </Text>
          </div>
          <InfoRow label="Club" value={metadata.club} />
          <InfoRow label="League" value={metadata.league} />
          <InfoRow label="Season" value={metadata.season} />
          <InfoRow label="Type" value={metadata.jersey_type} />
          {metadata.condition_rating !== undefined && (
            <div
              className={clx(
                "text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-3"
              )}
            >
              <Text size="small" weight="plus" leading="compact">
                Condition
              </Text>
              <ConditionBadge rating={metadata.condition_rating} />
            </div>
          )}
        </div>
      )}
    </Container>
  )
}

// Widget configuration - inject at top of product details page
export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductMarketplaceWidget


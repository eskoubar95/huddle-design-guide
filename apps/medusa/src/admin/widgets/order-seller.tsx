import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, clx } from "@medusajs/ui"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Link } from "react-router-dom"

/**
 * Seller Widget
 * 
 * Displays seller information for marketplace orders:
 * - Seller profile (with link to customer page)
 * - Contact details (email, phone)
 * - Shipping address
 * 
 * Note: Buyer info is shown in Medusa's built-in Customer section.
 * Data is read from order.metadata (populated by create_medusa_order RPC).
 */

// Extended order type with our custom metadata
interface HuddleOrderMetadata {
  seller_handle?: string
  seller_id?: string
  seller_customer_id?: string
  seller_email?: string
  seller_phone?: string
  seller_address?: {
    street?: string
    city?: string
    postal_code?: string
    country?: string
    state?: string
  }
  listing_type?: "sale" | "auction"
}

interface OrderWithMetadata extends AdminOrder {
  metadata?: HuddleOrderMetadata | null
}

// Info row component
const InfoRow = ({ label, value, mono = false }: { 
  label: string
  value: string | null | undefined
  mono?: boolean
}) => {
  if (!value) return null
  
  return (
    <div className={clx("grid grid-cols-2 items-start px-6 py-3")}>
      <Text size="small" weight="plus" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Text size="small" className={clx("text-ui-fg-base", mono && "font-mono")}>
        {value}
      </Text>
    </div>
  )
}

const OrderSellerWidget = ({
  data,
}: DetailWidgetProps<AdminOrder>) => {
  const order = data as OrderWithMetadata
  const metadata = order.metadata

  // If no seller metadata, don't render the widget
  if (!metadata || (!metadata.seller_handle && !metadata.seller_id && !metadata.seller_customer_id)) {
    return null
  }

  // Seller display name
  const sellerDisplayName = metadata.seller_handle || 
    (metadata.seller_id ? metadata.seller_id.slice(0, 12) + "..." : "Unknown")

  // Format address if available
  const formattedAddress = metadata.seller_address ? 
    [
      metadata.seller_address.street,
      metadata.seller_address.city,
      metadata.seller_address.state,
      metadata.seller_address.postal_code,
      metadata.seller_address.country?.toUpperCase()
    ].filter(Boolean).join(", ") : null

  return (
    <Container className="divide-y p-0">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Seller</Heading>
        <Text size="small" className="text-ui-fg-muted">...</Text>
      </div>

      {/* Seller Profile Section */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Avatar circle with first letter */}
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ui-bg-component border border-ui-border-base">
            <Text size="small" weight="plus" className="text-ui-fg-subtle uppercase">
              {sellerDisplayName.charAt(0)}
            </Text>
          </div>
          <div className="flex flex-col">
            {metadata.seller_customer_id ? (
              <Link 
                to={`/customers/${metadata.seller_customer_id}`}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover text-sm font-medium"
              >
                {sellerDisplayName}
              </Link>
            ) : (
              <Text size="small" weight="plus" className="text-ui-fg-base">
                {sellerDisplayName}
              </Text>
            )}
            {metadata.seller_handle && metadata.seller_id && (
              <Text size="xsmall" className="text-ui-fg-muted font-mono">
                {metadata.seller_id.slice(0, 16)}...
              </Text>
            )}
          </div>
        </div>
      </div>

      {/* Contact Details */}
      {(metadata.seller_email || metadata.seller_phone) && (
        <div className="divide-y">
          <div className="px-6 py-3">
            <Text size="small" weight="plus" className="text-ui-fg-muted">
              Contact
            </Text>
          </div>
          <InfoRow label="Email" value={metadata.seller_email} />
          <InfoRow label="Phone" value={metadata.seller_phone} />
        </div>
      )}

      {/* Shipping Address */}
      {formattedAddress && (
        <div className="divide-y">
          <div className="px-6 py-3">
            <Text size="small" weight="plus" className="text-ui-fg-muted">
              Shipping address
            </Text>
          </div>
          <div className="px-6 py-3">
            <Text size="small" className="text-ui-fg-base whitespace-pre-line">
              {metadata.seller_address?.street}
              {metadata.seller_address?.city && `\n${metadata.seller_address.city}`}
              {metadata.seller_address?.state && `, ${metadata.seller_address.state}`}
              {metadata.seller_address?.postal_code && ` ${metadata.seller_address.postal_code}`}
              {metadata.seller_address?.country && `\n${metadata.seller_address.country.toUpperCase()}`}
            </Text>
          </div>
        </div>
      )}
    </Container>
  )
}

// Widget configuration - inject in right sidebar of order details page
export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderSellerWidget


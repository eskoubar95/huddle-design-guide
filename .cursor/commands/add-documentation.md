# Add Documentation

Generate or update comprehensive documentation for Beauty Shop codebase.

## Objective
Create clear, maintainable documentation that helps developers understand and use the code effectively.

## Context
- Follow `.cursor/rules/00-foundations.mdc` documentation principles
- Document the "why", not the obvious "what"
- Keep documentation close to code
- Update documentation when code changes

## Documentation Scope

What to document:
- [ ] Component/feature: `{{target}}`
- [ ] API endpoints: `{{endpoints}}`
- [ ] Service/utility: `{{service}}`
- [ ] Complex algorithm/logic: `{{logic}}`

## Documentation Types

### 1. README Files

**When:** New feature, service, or major component
**Where:** Same directory as the code

```markdown
# Feature Name

## Purpose
Brief description of what this feature does and why it exists.

## Usage
```typescript
// Basic usage example
import { FeatureComponent } from './feature-component'

<FeatureComponent prop="value" />
```

## API
### Props / Parameters
- `prop1` (type): Description
- `prop2` (type, optional): Description

## Examples
### Example 1: Basic Use Case
```typescript
// Code example
```

### Example 2: Advanced Use Case
```typescript
// Code example
```

## Dependencies
- External: Next.js, React
- Internal: @/lib/utils/format

## Notes
- Important considerations
- Known limitations
- Future improvements
```

### 2. JSDoc Comments

**When:** Public functions, components, types
**Format:** TSDoc standard

```typescript
/**
 * Calculates the total price of cart items including tax and discounts.
 * 
 * @param items - Array of cart items with price and quantity
 * @param discountCode - Optional discount code to apply
 * @returns Total price in øre (minor units)
 * 
 * @example
 * ```ts
 * const total = calculateCartTotal(items, 'SUMMER10')
 * // returns 89900 (899 DKK)
 * ```
 * 
 * @throws {ValidationError} If items array is empty
 * @throws {InvalidDiscountError} If discount code is invalid
 */
export function calculateCartTotal(
  items: CartItem[],
  discountCode?: string
): number {
  // Implementation
}
```

**Component Documentation:**
```typescript
/**
 * Product card component displaying product information with add-to-cart action.
 * 
 * @component
 * @example
 * ```tsx
 * <ProductCard 
 *   product={product}
 *   onAddToCart={handleAddToCart}
 * />
 * ```
 */
interface ProductCardProps {
  /** Product data to display */
  product: Product
  /** Callback fired when add-to-cart button is clicked */
  onAddToCart: (productId: string) => void
  /** Optional custom className for styling */
  className?: string
}

export function ProductCard({ product, onAddToCart, className }: ProductCardProps) {
  // Implementation
}
```

### 3. Inline Comments

**When:** Non-obvious decisions, complex logic
**Keep:** Short and focused on "why"

```typescript
// ✅ Good - explains why
// We batch API calls to reduce latency and avoid rate limits
// Max batch size is 100 per Stripe API documentation
const batches = chunk(items, 100)

// We use UTC timezone for consistency across regions
// Danish timezone (CET/CEST) is converted in the UI layer
const orderDate = new Date().toISOString()

// Workaround for MedusaJS v2 bug #1234
// Can be removed after upgrading to v2.1.0
const processedVariants = variants.map(v => ({ ...v, _temp: true }))

// ❌ Bad - states the obvious
// Loop through items
for (const item of items) {
  // Get the price
  const price = item.price
}
```

### 4. API Documentation

**For API Endpoints:**
```typescript
/**
 * GET /api/v1/products
 * 
 * Retrieves a paginated list of products.
 * 
 * @auth Required
 * @ratelimit 100 requests per minute
 * 
 * @queryparam {string} [cursor] - Pagination cursor
 * @queryparam {number} [limit=20] - Items per page (max 100)
 * @queryparam {string} [category] - Filter by category
 * @queryparam {string} [q] - Search query
 * 
 * @response 200 - Success
 * ```json
 * {
 *   "data": [
 *     {
 *       "id": "prod_123",
 *       "name": "Starter Kit",
 *       "price": 89900,
 *       "currency": "DKK"
 *     }
 *   ],
 *   "pagination": {
 *     "nextCursor": "prod_456",
 *     "hasMore": true
 *   }
 * }
 * ```
 * 
 * @response 400 - Invalid parameters
 * @response 401 - Unauthorized
 * @response 429 - Rate limit exceeded
 * 
 * @example
 * ```ts
 * const response = await fetch('/api/v1/products?limit=10&category=kits')
 * const { data, pagination } = await response.json()
 * ```
 */
export async function GET(request: Request) {
  // Implementation
}
```

### 5. Architecture Decision Records (ADR)

**When:** Significant architectural decisions
**Where:** `.project/` directory

```markdown
# ADR-001: Use Zustand for State Management

## Status
Accepted

## Context
Beauty Shop needs client-side state management for cart, user preferences, and UI state. Options considered:
- Redux Toolkit
- Zustand
- Jotai
- React Context

## Decision
We will use Zustand for state management.

## Rationale
- Lightweight (2.5kb vs Redux 20kb)
- Minimal boilerplate
- TypeScript native
- Perfect for our use cases (cart, UI state)
- Easy to learn for team

## Consequences
### Positive
- Fast development
- Small bundle size
- Easy testing
- Good DX

### Negative
- Less ecosystem than Redux
- No DevTools (acceptable for our scale)

### Mitigations
- Document store patterns
- Create typed store examples
- Establish conventions

## Alternatives Considered
### Redux Toolkit
- Pros: Large ecosystem, DevTools
- Cons: More boilerplate, larger bundle
- Rejected: Overkill for our needs

## References
- Zustand docs: https://zustand-demo.pmnd.rs/
- Discussion in #tech-decisions channel
```

### 6. Environment Variables Documentation

**In `.env.example`:**
```bash
# Beauty Shop Environment Variables

# ===== API Keys =====
# MedusaJS Backend URL
NEXT_PUBLIC_MEDUSA_URL=http://localhost:9000

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ===== Authentication =====
# Clerk (get from https://dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# ===== Database =====
# Supabase (get from project settings)
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# ===== Monitoring =====
# Sentry (get from sentry.io project settings)
NEXT_PUBLIC_SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=... # For source maps upload

# ===== Feature Flags =====
# LaunchDarkly (get from dashboard)
NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID=...
LAUNCHDARKLY_SDK_KEY=...

# ===== Email =====
# Resend (get from resend.com/api-keys)
RESEND_API_KEY=re_...

# ===== Other =====
# App URL (for emails, webhooks)
NEXT_PUBLIC_SITE_URL=https://beauty-shop.dk
```

### 7. Component API Documentation

**For Complex Components:**
```typescript
/**
 * Multi-step checkout form with validation and Stripe payment integration.
 * 
 * Features:
 * - 3-step wizard (Shipping → Payment → Review)
 * - Real-time validation with Zod
 * - Stripe Elements integration
 * - Cart summary with live updates
 * - Mobile-optimized layout
 * 
 * @component
 * 
 * @example
 * Basic usage
 * ```tsx
 * <CheckoutForm 
 *   cart={cart}
 *   onComplete={handleOrderComplete}
 * />
 * ```
 * 
 * @example
 * With custom success handler
 * ```tsx
 * <CheckoutForm 
 *   cart={cart}
 *   onComplete={(order) => {
 *     router.push(`/orders/${order.id}`)
 *   }}
 *   onError={(error) => {
 *     Sentry.captureException(error)
 *   }}
 * />
 * ```
 */
interface CheckoutFormProps {
  /** Shopping cart with items to checkout */
  cart: Cart
  /** Callback when order is successfully created */
  onComplete: (order: Order) => void
  /** Optional error handler */
  onError?: (error: Error) => void
  /** Optional discount code to pre-apply */
  discountCode?: string
}
```

### 8. Testing Documentation

```typescript
/**
 * @jest-environment jsdom
 * 
 * Tests for ProductCard component.
 * 
 * Coverage:
 * - Renders product information correctly
 * - Handles add-to-cart interaction
 * - Shows out-of-stock state
 * - Displays loading state
 * - Keyboard accessible
 */
describe('ProductCard', () => {
  it('should render product information correctly', () => {
    // Test implementation
  })
})
```

## Documentation Checklist

### For Components
- [ ] JSDoc comment with description
- [ ] Props interface documented
- [ ] Usage examples provided
- [ ] Edge cases noted
- [ ] Dependencies listed

### For Functions/Services
- [ ] JSDoc with parameters and return type
- [ ] Usage examples
- [ ] Error cases documented
- [ ] Side effects noted
- [ ] Performance considerations

### For API Endpoints
- [ ] HTTP method and path
- [ ] Authentication requirements
- [ ] Request parameters documented
- [ ] Response format with examples
- [ ] Error codes and meanings
- [ ] Rate limiting info

### For Features
- [ ] README in feature directory
- [ ] Purpose and use cases
- [ ] Setup instructions
- [ ] Configuration options
- [ ] Known limitations
- [ ] Future improvements

## Common Documentation Patterns

### Beauty Shop Specific

**Price Documentation:**
```typescript
/**
 * Formats a price from minor units (øre) to display format.
 * 
 * Beauty Shop stores all prices in øre (minor units) in the database
 * and converts to human-readable format only in the UI layer.
 * 
 * @param priceInOere - Price in øre (1 DKK = 100 øre)
 * @returns Formatted price string (e.g., "899,00 DKK")
 * 
 * @example
 * formatPrice(89900) // "899,00 DKK"
 * formatPrice(100) // "1,00 DKK"
 */
export function formatPrice(priceInOere: number): string {
  // Implementation
}
```

**MedusaJS Integration:**
```typescript
/**
 * Creates an order in MedusaJS backend.
 * 
 * This function handles the complete order creation flow:
 * 1. Validates cart items and inventory
 * 2. Creates draft order in MedusaJS
 * 3. Processes payment with Stripe
 * 4. Finalizes order
 * 5. Sends confirmation email
 * 
 * @param cartId - MedusaJS cart ID
 * @returns Created order with payment status
 * 
 * @throws {InsufficientInventoryError} If items out of stock
 * @throws {PaymentError} If payment processing fails
 */
```

## Output Format

Provide documentation in appropriate format:

### For Components
```typescript
// Component file with JSDoc
```

### For Features
```markdown
# Feature README.md
```

### For Architectural Decisions
```markdown
# ADR-XXX: Decision Title
```

## Checklist
- [ ] Public APIs documented with JSDoc
- [ ] Complex logic has explanatory comments
- [ ] README updated if feature added
- [ ] API endpoints documented
- [ ] Examples provided
- [ ] Edge cases noted
- [ ] Dependencies listed
- [ ] ADR created if architectural decision


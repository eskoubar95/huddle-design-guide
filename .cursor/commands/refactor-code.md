# Refactor Code

Improve code quality, maintainability, and structure while preserving functionality.

## Objective
Refactor code to follow Beauty Shop standards without changing external behavior or breaking existing tests.

## Context
- Follow `.cursor/rules/00-foundations.mdc` principles
- Maintain backward compatibility
- All existing tests must continue passing
- No new features - refactoring only

## Refactoring Scope

What to refactor:
- [ ] File/component: `{{target}}`
- [ ] Reason for refactoring: `{{reason}}`
- [ ] Specific code smell: `{{smell}}`

## Code Quality Checklist

### 1. Single Responsibility Principle (SRP)
- [ ] Each file has one clear purpose
- [ ] Each function does one thing well
- [ ] Components have single responsibility
- [ ] Services are focused and cohesive

**Extract responsibilities:**
```typescript
// ❌ Bad - multiple responsibilities
function processOrder(order) {
  // Validate
  if (!order.items.length) throw new Error('Empty order')
  
  // Calculate
  const total = order.items.reduce((sum, item) => sum + item.price, 0)
  
  // Save to DB
  await db.orders.create({ ...order, total })
  
  // Send email
  await sendOrderConfirmation(order.email)
  
  return order
}

// ✅ Good - separated concerns
function validateOrder(order) {
  if (!order.items.length) throw new Error('Empty order')
}

function calculateOrderTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

async function processOrder(order) {
  validateOrder(order)
  const total = calculateOrderTotal(order.items)
  const savedOrder = await saveOrder({ ...order, total })
  await sendOrderConfirmation(order.email)
  return savedOrder
}
```

### 2. File Size
- [ ] Files < 500 LOC
- [ ] If file > 400 LOC, consider refactoring
- [ ] Extract large components into smaller ones
- [ ] Split utility files by domain

### 3. Function Size & Complexity
- [ ] Functions < 50 lines
- [ ] Cyclomatic complexity reasonable
- [ ] Deep nesting removed (< 3 levels)
- [ ] Early returns for clarity

**Reduce nesting:**
```typescript
// ❌ Bad - deeply nested
function processPayment(order) {
  if (order) {
    if (order.total > 0) {
      if (order.paymentMethod) {
        if (order.paymentMethod === 'card') {
          return processCardPayment(order)
        }
      }
    }
  }
}

// ✅ Good - early returns
function processPayment(order) {
  if (!order) return null
  if (order.total <= 0) return null
  if (!order.paymentMethod) return null
  if (order.paymentMethod !== 'card') return null
  
  return processCardPayment(order)
}
```

### 4. Naming
Reference: `.cursor/rules/00-foundations.mdc`

- [ ] Intention-revealing names
- [ ] No generic names (`data`, `info`, `helper`, `temp`, `utils`)
- [ ] Consistent naming conventions
- [ ] Boolean variables start with `is`, `has`, `should`, `can`

**Better naming:**
```typescript
// ❌ Bad
const data = await fetchData()
const info = processInfo(data)
const result = doStuff(info)

// ✅ Good
const products = await fetchProducts()
const enrichedProducts = enrichWithInventory(products)
const displayableProducts = formatForDisplay(enrichedProducts)
```

### 5. Code Duplication (DRY)
- [ ] Extract repeated code into functions
- [ ] Create reusable components
- [ ] Shared utilities in `lib/utils/`
- [ ] Keep abstractions simple

**Extract duplication:**
```typescript
// ❌ Bad - duplication
const product1Price = (product1.price / 100).toFixed(2) + ' DKK'
const product2Price = (product2.price / 100).toFixed(2) + ' DKK'
const product3Price = (product3.price / 100).toFixed(2) + ' DKK'

// ✅ Good - extracted function
function formatPrice(priceInOere: number): string {
  return `${(priceInOere / 100).toFixed(2)} DKK`
}

const product1Price = formatPrice(product1.price)
const product2Price = formatPrice(product2.price)
const product3Price = formatPrice(product3.price)
```

### 6. Type Safety
- [ ] Explicit TypeScript types
- [ ] No `any` types (use `unknown` if needed)
- [ ] Proper interface/type definitions
- [ ] DTOs and domain types separated

**Improve types:**
```typescript
// ❌ Bad
function processOrder(order: any) {
  return order.items.map((item: any) => item.price)
}

// ✅ Good
interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
}

interface Order {
  id: string
  items: OrderItem[]
  total: number
}

function processOrder(order: Order): number[] {
  return order.items.map(item => item.price)
}
```

### 7. Error Handling
- [ ] Consistent error handling
- [ ] Meaningful error messages
- [ ] No swallowed errors
- [ ] Proper error types

```typescript
// ❌ Bad
try {
  await createOrder(data)
} catch (e) {
  console.log('Error')
}

// ✅ Good
try {
  await createOrder(data)
} catch (error) {
  console.error('Failed to create order', { 
    orderId: data.id,
    error: error.message 
  })
  throw new OrderCreationError('Unable to process order', { cause: error })
}
```

### 8. Dependencies & Imports
- [ ] Remove unused imports
- [ ] Remove unused dependencies
- [ ] Organize imports (built-in, external, internal)
- [ ] No circular dependencies

**Organize imports:**
```typescript
// ✅ Good import organization
// Built-in / framework
import { useState, useEffect } from 'react'
import Image from 'next/image'

// External dependencies
import { z } from 'zod'
import { useForm } from 'react-hook-form'

// Internal - lib
import { formatPrice } from '@/lib/utils/format'
import { createOrder } from '@/lib/services/orders'

// Internal - components
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/products/product-card'

// Types
import type { Product } from '@/lib/domain/product/types'
```

### 9. Component Structure (React)
- [ ] Logical component organization
- [ ] Extract large components
- [ ] Composition over props drilling
- [ ] Proper separation of concerns

**Component structure:**
```typescript
// ✅ Good component structure
interface ProductCardProps {
  product: Product
  onAddToCart: (id: string) => void
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  // 1. Hooks
  const [isAdding, setIsAdding] = useState(false)
  
  // 2. Derived state / computations
  const formattedPrice = formatPrice(product.price)
  const isOutOfStock = product.inventory === 0
  
  // 3. Handlers
  const handleAddToCart = async () => {
    setIsAdding(true)
    await onAddToCart(product.id)
    setIsAdding(false)
  }
  
  // 4. Early returns for edge cases
  if (!product) return null
  
  // 5. Render
  return (
    <article className="product-card">
      <ProductImage src={product.image} alt={product.name} />
      <ProductInfo name={product.name} price={formattedPrice} />
      <AddToCartButton 
        onClick={handleAddToCart}
        disabled={isOutOfStock || isAdding}
        loading={isAdding}
      />
    </article>
  )
}
```

### 10. Comments & Documentation
- [ ] Remove obvious comments
- [ ] Keep "why" comments for non-obvious decisions
- [ ] Add JSDoc for public APIs
- [ ] Update outdated comments

```typescript
// ❌ Bad - obvious comment
// Get the user
const user = await getUser()

// ✅ Good - explains why
// We cache user data for 5 minutes to reduce Clerk API calls
// while keeping auth relatively fresh
const user = await getCachedUser(userId, { ttl: 300 })
```

## Refactoring Patterns

### Extract Function
When: Function is too long or has repeated code
```typescript
// Before
function checkout(cart, user) {
  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = total * 0.25
  const finalTotal = total + tax
  // ... more code
}

// After
function calculateCartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}

function calculateTax(amount, rate = 0.25) {
  return amount * rate
}

function checkout(cart, user) {
  const subtotal = calculateCartTotal(cart.items)
  const tax = calculateTax(subtotal)
  const total = subtotal + tax
  // ... more code
}
```

### Extract Component
When: Component is too large or has multiple responsibilities
```tsx
// Before - large component
function CheckoutPage() {
  // 200 lines of code
}

// After - extracted components
function CheckoutPage() {
  return (
    <>
      <CheckoutHeader />
      <CartSummary />
      <ShippingForm />
      <PaymentForm />
      <OrderReview />
    </>
  )
}
```

### Replace Conditional with Polymorphism
```typescript
// Before
function getShippingCost(type: string, weight: number) {
  if (type === 'express') {
    return weight * 50
  } else if (type === 'standard') {
    return weight * 25
  } else if (type === 'economy') {
    return weight * 10
  }
}

// After
interface ShippingMethod {
  calculateCost(weight: number): number
}

class ExpressShipping implements ShippingMethod {
  calculateCost(weight: number) {
    return weight * 50
  }
}

class StandardShipping implements ShippingMethod {
  calculateCost(weight: number) {
    return weight * 25
  }
}
```

### Introduce Parameter Object
```typescript
// Before
function createOrder(
  customerId: string,
  items: OrderItem[],
  shippingAddress: string,
  billingAddress: string,
  paymentMethod: string
) { }

// After
interface CreateOrderParams {
  customerId: string
  items: OrderItem[]
  shippingAddress: string
  billingAddress: string
  paymentMethod: string
}

function createOrder(params: CreateOrderParams) { }
```

## Testing During Refactoring

### Before Refactoring
1. Ensure all existing tests pass
2. Add tests if coverage is low
3. Document current behavior

### During Refactoring
1. Run tests frequently
2. Refactor in small steps
3. Commit after each successful step

### After Refactoring
1. All tests still pass
2. No new linter errors
3. Type check passes
4. No breaking changes

```bash
# Run before and after refactoring
npm run test
npm run type-check
npm run lint
```

## Common Refactoring Smells

### Long Method
**Smell:** Method > 50 lines
**Fix:** Extract smaller functions

### Large Class/Component
**Smell:** File > 400 lines
**Fix:** Extract responsibilities

### Long Parameter List
**Smell:** Function has > 5 parameters
**Fix:** Introduce parameter object

### Duplicated Code
**Smell:** Same code in multiple places
**Fix:** Extract function/component

### Comments
**Smell:** Lots of comments explaining code
**Fix:** Make code self-explanatory

### Dead Code
**Smell:** Commented code, unused functions
**Fix:** Delete it (git has history)

## Output Format

### Refactoring Plan

#### Current Issues
List code smells and problems:
1. Issue description
   - Location: file:line
   - Smell type: Long method, duplication, etc.

#### Proposed Changes
1. Refactoring description
   - Before: current code snippet
   - After: refactored code snippet
   - Reason: why this improves code

#### Risk Assessment
- Breaking changes: None/Low/Medium/High
- Test coverage: Good/Needs improvement
- Dependencies affected: List

#### Verification Steps
- [ ] All tests pass
- [ ] No type errors
- [ ] No linter errors
- [ ] Manual testing if needed

## Checklist
- [ ] Files < 500 LOC
- [ ] Functions < 50 lines
- [ ] Intention-revealing names
- [ ] No code duplication
- [ ] Explicit types (no `any`)
- [ ] Consistent error handling
- [ ] Unused imports removed
- [ ] Tests still pass
- [ ] No breaking changes
- [ ] Backward compatible


# Write Unit Tests

Generate comprehensive unit tests for the current code or feature.

## Objective
Create focused, maintainable unit tests that follow Beauty Shop's testing standards and provide good coverage of critical paths.

## Context
- Follow `.cursor/rules/00-foundations.mdc` testing principles
- Use Vitest as test framework
- AAA pattern (Arrange-Act-Assert)
- Test behavior, not implementation details

## Requirements
- **Test Framework**: Vitest with React Testing Library for components
- **Coverage**: Focus on critical paths (happy path, failure paths, edge cases)
- **Structure**: One test file per source file (`.test.ts` or `.test.tsx`)
- **Naming**: Intention-revealing test names describing what is being tested
- **Mocking**: Mock external dependencies and API calls
- **No snapshots**: Avoid large snapshots; test specific behaviors

## Test Types

### For React Components:
- Render tests (component renders without errors)
- User interaction tests (clicks, form inputs, keyboard navigation)
- Accessibility tests (semantic elements, ARIA labels, keyboard nav)
- Conditional rendering based on props/state
- Error state handling

### For Services/Functions:
- Happy path with valid inputs
- Error handling with invalid inputs
- Edge cases (empty arrays, null values, boundary conditions)
- Side effects (API calls, database operations)

### For Server Actions:
- Valid input processing
- Validation error handling
- Authorization checks
- Database transaction success/failure
- Return value structure

## Output Format

```typescript
// Example structure
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

describe('ComponentName', () => {
  it('should render with correct initial state', () => {
    // Arrange
    const props = { ... }
    
    // Act
    render(<ComponentName {...props} />)
    
    // Assert
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should handle user interaction correctly', async () => {
    // Arrange & Act & Assert
  })

  it('should handle error state gracefully', () => {
    // Arrange & Act & Assert
  })
})
```

## Checklist
- [ ] Test file created in correct location
- [ ] All critical paths covered
- [ ] Edge cases included
- [ ] Mocks for external dependencies
- [ ] Accessibility tests for UI components
- [ ] Tests pass locally (`npm run test`)
- [ ] No implementation details tested (test public API only)

## Examples

**Component Test:**
```typescript
describe('ProductCard', () => {
  it('should display product information correctly', () => {
    const product = {
      id: '1',
      name: 'Starter Kit',
      price: 89900, // øre
      imageUrl: '/kit.jpg'
    }
    
    render(<ProductCard product={product} />)
    
    expect(screen.getByText('Starter Kit')).toBeInTheDocument()
    expect(screen.getByText('899 DKK')).toBeInTheDocument()
  })

  it('should call onAddToCart when button is clicked', async () => {
    const onAddToCart = vi.fn()
    const product = { id: '1', name: 'Kit', price: 89900 }
    
    render(<ProductCard product={product} onAddToCart={onAddToCart} />)
    
    fireEvent.click(screen.getByRole('button', { name: /add to cart/i }))
    
    expect(onAddToCart).toHaveBeenCalledWith('1')
  })
})
```

**Service Test:**
```typescript
describe('calculateDiscount', () => {
  it('should return correct discount for valid percentage', () => {
    const result = calculateDiscount(10000, 10) // 100 DKK, 10%
    expect(result).toBe(9000)
  })

  it('should throw error for invalid percentage', () => {
    expect(() => calculateDiscount(10000, -5)).toThrow('Invalid discount')
  })

  it('should handle zero price', () => {
    expect(calculateDiscount(0, 10)).toBe(0)
  })
})
```

**Server Action Test:**
```typescript
describe('createOrder', () => {
  it('should create order successfully with valid data', async () => {
    const orderData = {
      customerId: 'cust_123',
      items: [{ productId: 'prod_1', quantity: 1 }],
      total: 89900
    }
    
    const result = await createOrder(orderData)
    
    expect(result.success).toBe(true)
    expect(result.data?.orderId).toBeDefined()
  })

  it('should return error for invalid order data', async () => {
    const invalidData = { items: [] } // Missing required fields
    
    const result = await createOrder(invalidData)
    
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})
```


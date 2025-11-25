# Run All Tests and Fix

Execute full test suite, identify failures, and fix issues systematically.

## Objective
Run all tests, triage failures, fix issues, and ensure 100% passing test suite.

## Context
- Follow `.cursor/rules/00-foundations.mdc` testing principles
- Beauty Shop uses Vitest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests (when implemented)

## Test Execution Workflow

### 1. Run Full Test Suite

```bash
# Run all tests
npm run test

# Run with coverage
npm run test:coverage

# Run in watch mode (during development)
npm run test:watch

# Run specific test file
npm run test path/to/file.test.ts
```

### 2. Analyze Test Results

**Review output for:**
- [ ] Total tests run
- [ ] Tests passed
- [ ] Tests failed
- [ ] Tests skipped
- [ ] Coverage percentage

### 3. Triage Failures

For each failed test:
1. **Categorize failure type:**
   - Assertion failure
   - Runtime error
   - Timeout
   - Setup/teardown issue
   - Mock/stub problem

2. **Identify root cause:**
   - Code change broke functionality
   - Test was flaky
   - Test setup incorrect
   - Environment issue

3. **Priority:**
   - 🔴 Critical: Core functionality broken
   - 🟡 Important: Non-critical feature affected
   - 🟢 Low: Edge case or flaky test

## Common Test Failures & Fixes

### Failure Type 1: Assertion Failure

**Symptom:**
```
FAIL  lib/utils/format.test.ts
  ✕ should format price correctly (5ms)

  expect(received).toBe(expected)

  Expected: "899,00 DKK"
  Received: "899.00 DKK"
```

**Fix:**
1. Understand expected behavior
2. Check if code or test is wrong
3. Fix the issue

```typescript
// ❌ Wrong implementation
export function formatPrice(price: number): string {
  return `${(price / 100).toFixed(2)} DKK`
}

// ✅ Fixed - Danish locale with comma decimal separator
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK'
  }).format(price / 100)
}
```

### Failure Type 2: Runtime Error

**Symptom:**
```
FAIL  components/ProductCard.test.tsx
  ✕ should render product card (12ms)

  TypeError: Cannot read property 'price' of undefined
```

**Fix:**
1. Check test setup
2. Ensure all required props/data provided
3. Add null checks if needed

```typescript
// ❌ Missing product data
it('should render product card', () => {
  render(<ProductCard product={undefined} />)
})

// ✅ Fixed - provide required data
it('should render product card', () => {
  const product = {
    id: '1',
    name: 'Starter Kit',
    price: 89900,
    image: '/kit.jpg'
  }
  render(<ProductCard product={product} />)
})
```

### Failure Type 3: Timeout

**Symptom:**
```
FAIL  lib/api/orders.test.ts
  ✕ should create order (5002ms)

  Timeout - Async callback was not invoked within the 5000ms timeout
```

**Fix:**
1. Increase timeout if legitimate slow operation
2. Fix slow code
3. Mock slow dependencies

```typescript
// ❌ Slow test
it('should create order', async () => {
  const order = await createOrder(data)
  expect(order).toBeDefined()
}, 5000)

// ✅ Fixed - mock slow API call
it('should create order', async () => {
  vi.mock('@/lib/medusa/client')
  const mockMedusa = {
    orders: {
      create: vi.fn().mockResolvedValue({ id: 'order_123' })
    }
  }
  
  const order = await createOrder(data)
  expect(order.id).toBe('order_123')
})
```

### Failure Type 4: Mock Not Working

**Symptom:**
```
FAIL  lib/services/email.test.ts
  ✕ should send order confirmation email (8ms)

  Expected mock function to have been called, but it was not called
```

**Fix:**
1. Verify mock setup
2. Check mock is in correct scope
3. Ensure mock is called before assertion

```typescript
// ❌ Mock after import
import { sendEmail } from './email'
vi.mock('./email')

// ✅ Fixed - mock before import
vi.mock('./email')
import { sendEmail } from './email'

it('should send order confirmation email', async () => {
  const mockSendEmail = vi.mocked(sendEmail)
  mockSendEmail.mockResolvedValue({ success: true })
  
  await sendOrderConfirmation(order)
  
  expect(mockSendEmail).toHaveBeenCalledWith({
    to: order.email,
    template: 'order-confirmation',
    data: order
  })
})
```

### Failure Type 5: Component Not Found

**Symptom:**
```
FAIL  components/Checkout.test.tsx
  ✕ should display checkout form (15ms)

  TestingLibraryElementError: Unable to find role="button" with name="Place Order"
```

**Fix:**
1. Check component renders correctly
2. Verify query selector
3. Use screen.debug() to see rendered output

```typescript
// ❌ Wrong query
it('should display checkout form', () => {
  render(<CheckoutForm />)
  expect(screen.getByRole('button', { name: 'Place Order' })).toBeInTheDocument()
})

// ✅ Fixed - debug and correct query
it('should display checkout form', () => {
  render(<CheckoutForm />)
  screen.debug() // See what's actually rendered
  
  // Use correct button text
  expect(screen.getByRole('button', { name: 'Gennemfør køb' })).toBeInTheDocument()
})
```

### Failure Type 6: Flaky Test

**Symptom:**
Test passes sometimes, fails others

**Fix:**
1. Remove timing dependencies
2. Use `waitFor` for async operations
3. Ensure test isolation

```typescript
// ❌ Flaky - timing dependent
it('should show success message', () => {
  render(<Component />)
  fireEvent.click(screen.getByRole('button'))
  
  // Might fail if message appears slowly
  expect(screen.getByText('Success!')).toBeInTheDocument()
})

// ✅ Fixed - wait for async update
it('should show success message', async () => {
  render(<Component />)
  fireEvent.click(screen.getByRole('button'))
  
  await waitFor(() => {
    expect(screen.getByText('Success!')).toBeInTheDocument()
  })
})
```

## Test Fix Workflow

### Step 1: Isolate Failure
```bash
# Run only failing test
npm run test -- path/to/failing.test.ts

# Run with verbose output
npm run test -- --reporter=verbose path/to/failing.test.ts
```

### Step 2: Debug Test
```typescript
import { screen } from '@testing-library/react'

it('failing test', () => {
  render(<Component />)
  
  // See what's actually rendered
  screen.debug()
  
  // Or debug specific element
  screen.debug(screen.getByRole('button'))
  
  // Add temporary console.logs
  console.log('Component state:', component.state)
})
```

### Step 3: Fix Issue
1. Identify root cause
2. Fix code or test
3. Re-run test
4. Verify fix doesn't break other tests

### Step 4: Verify All Tests Pass
```bash
# Run full suite again
npm run test

# Check coverage
npm run test:coverage
```

## Coverage Requirements

Beauty Shop targets:
- **Statements:** 80%+
- **Branches:** 75%+
- **Functions:** 80%+
- **Lines:** 80%+

### Check Coverage
```bash
npm run test:coverage

# View HTML report
open coverage/index.html
```

### Improve Coverage
```typescript
// Identify uncovered code
// Add tests for:
// - Uncovered branches (if/else, switch cases)
// - Uncovered functions
// - Edge cases
// - Error paths

// Example: Cover error path
describe('createOrder', () => {
  it('should create order successfully', async () => {
    // Happy path ✅
  })
  
  it('should handle payment failure', async () => {
    // Error path - was missing! ✅
    mockStripe.paymentIntents.create.mockRejectedValue(
      new Error('Card declined')
    )
    
    await expect(createOrder(data)).rejects.toThrow('Payment failed')
  })
})
```

## Test Quality Checks

### Good Test Characteristics
- [ ] **Independent:** Test doesn't depend on others
- [ ] **Repeatable:** Same result every time
- [ ] **Fast:** Runs quickly (< 100ms for unit tests)
- [ ] **Clear:** Intention-revealing name
- [ ] **Focused:** Tests one thing
- [ ] **AAA Pattern:** Arrange, Act, Assert

### Bad Test Patterns to Avoid
```typescript
// ❌ Bad - tests implementation detail
it('should call handleClick', () => {
  const handleClick = vi.fn()
  render(<Button onClick={handleClick} />)
  
  const button = screen.getByRole('button')
  expect(button.onclick).toBe(handleClick) // Testing implementation
})

// ✅ Good - tests behavior
it('should call onClick handler when clicked', () => {
  const handleClick = vi.fn()
  render(<Button onClick={handleClick} />)
  
  fireEvent.click(screen.getByRole('button'))
  expect(handleClick).toHaveBeenCalled() // Testing behavior
})
```

## Continuous Testing

### Pre-commit Hook
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run test:staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "npm run test -- --related --bail"
    ]
  }
}
```

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

## Output Format

### Test Results Summary

```
✅ All tests passed! (125/125)
⏱️  Total time: 12.5s
📊 Coverage: 85% (target: 80%)

Details:
- Unit tests: 98 passed
- Component tests: 22 passed
- Integration tests: 5 passed
```

or

```
❌ Tests failed (120/125 passed)

Failed tests (5):
🔴 Critical (2):
1. lib/services/orders.test.ts › should create order with payment
   - Error: Payment validation failed
   - Fix: Add payment validation before order creation

2. lib/api/checkout.test.ts › should process checkout
   - Error: Cart not found
   - Fix: Mock cart data in test setup

🟡 Important (3):
3. components/ProductCard.test.tsx › should handle out of stock
   - Expected: "Udsolgt"
   - Received: "Out of Stock"
   - Fix: Use Danish translation

... (list continues)

📋 Next steps:
1. Fix critical tests first
2. Run npm run test after each fix
3. Verify all tests pass before committing
```

## Checklist
- [ ] All tests executed
- [ ] Failed tests identified and categorized
- [ ] Root causes determined
- [ ] Fixes implemented
- [ ] All tests passing
- [ ] Coverage meets requirements (80%+)
- [ ] No flaky tests
- [ ] Test quality verified (independent, repeatable, fast)


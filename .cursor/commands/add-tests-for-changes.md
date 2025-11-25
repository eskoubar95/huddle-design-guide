# Add Tests for Changes

**Goal:** Generate tests for changed code to ensure adequate coverage.

**Context:**
- Analyzes git diff for untested code
- Suggests appropriate test types (unit, integration, E2E)
- Generates test skeletons
- Implements tests based on approval

---

## Usage

```
/add-tests-for-changes
/add-tests-for-changes --file path/to/file.ts
```

---

## Process

### Step 1: Analyze Changes

```
Analyzing changed code for test coverage...

**Branch:** feature/BS-152-product-catalog
**Changes:** +427 / -89 lines
**Files:** 12
```

---

### Step 2: Identify Untested Code

```
## Test Coverage Analysis

### Files with Tests: ✅
1. lib/stores/filter-store.ts
   - Test file: lib/stores/filter-store.test.ts ✅
   - Coverage: 100% (12/12 functions)

2. components/filters/FilterSidebar.tsx
   - Test file: components/filters/FilterSidebar.test.tsx ✅
   - Coverage: 85% (missing edge cases)

### Files Missing Tests: ❌
3. lib/services/products/filter-products.ts
   - No test file ❌
   - Functions: 3 (filterProducts, buildQueryParams, handleFilterError)
   - **Priority: High** (business logic)

4. lib/utils/url-params.ts
   - No test file ❌
   - Functions: 2 (paramsToFilters, filtersToParams)
   - **Priority: Medium** (utility)

5. components/filters/CategoryFilter.tsx
   - No test file ❌
   - Component with user interaction
   - **Priority: High** (UI component)

### Partially Tested: ⚠️
6. lib/hooks/useFilterState.ts
   - Test file exists ⚠️
   - Missing: Error handling tests, cleanup tests
```

---

### Step 3: Suggest Test Types

```
## Suggested Tests by Type

### Unit Tests (Recommended):
1. **lib/services/products/filter-products.ts**
   - Test each function in isolation
   - Mock API calls
   - Test error handling

2. **lib/utils/url-params.ts**
   - Test URL parsing edge cases
   - Test special characters
   - Test invalid inputs

3. **lib/hooks/useFilterState.ts**
   - Test hook state updates
   - Test cleanup
   - Test error scenarios

### Component Tests (Recommended):
4. **components/filters/CategoryFilter.tsx**
   - Render test
   - User interaction (click, keyboard)
   - Accessibility (ARIA, roles)

5. **components/filters/PriceRangeFilter.tsx**
   - Slider interaction
   - Value validation
   - Accessible

### Integration Tests (Nice to Have):
6. **Full filter flow**
   - Apply filters → API call → Results update
   - URL state sync
   - Clear filters

### E2E Tests (Future):
7. **User journey**
   - Browse products → Apply filters → See results
   - Share filtered URL
```

---

### Step 4: Generate Test Skeletons

```
## Proposed Tests

### 1. lib/services/products/filter-products.test.ts (New File)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { filterProducts, buildQueryParams } from './filter-products'
import { api } from '@/lib/utils/api-client'

// Mock API client
vi.mock('@/lib/utils/api-client')

describe('filterProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch products with filters', async () => {
    // Arrange
    const filters = {
      category: 'electronics',
      minPrice: 5000,
      maxPrice: 50000,
      searchQuery: 'laptop'
    }
    const mockResponse = {
      data: [{ id: '1', title: 'Laptop' }],
      nextCursor: 'abc123',
      hasMore: true
    }
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

    // Act
    const result = await filterProducts(filters)

    // Assert
    expect(api.get).toHaveBeenCalledWith('/products', {
      params: expect.objectContaining({
        category: 'electronics',
        minPrice: 5000,
        maxPrice: 50000,
        q: 'laptop'
      })
    })
    expect(result.data).toHaveLength(1)
    expect(result.nextCursor).toBe('abc123')
  })

  it('should handle API errors gracefully', async () => {
    // Arrange
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    // Act & Assert
    await expect(filterProducts({})).rejects.toThrow('Failed to load products')
  })

  it('should handle empty filters', async () => {
    // Arrange
    const mockResponse = { data: [], nextCursor: null, hasMore: false }
    vi.mocked(api.get).mockResolvedValue({ data: mockResponse })

    // Act
    const result = await filterProducts({})

    // Assert
    expect(result.data).toEqual([])
    expect(result.hasMore).toBe(false)
  })

  // TODO: Add more test cases
  // - Test cursor pagination
  // - Test invalid price range
  // - Test category not found
})

describe('buildQueryParams', () => {
  it('should build query params from filters', () => {
    const filters = {
      category: 'electronics',
      minPrice: 5000,
      maxPrice: 50000,
      searchQuery: 'laptop'
    }

    const params = buildQueryParams(filters)

    expect(params).toEqual({
      category: 'electronics',
      minPrice: 5000,
      maxPrice: 50000,
      q: 'laptop'
    })
  })

  it('should exclude null/empty values', () => {
    const filters = {
      category: null,
      minPrice: null,
      maxPrice: 50000,
      searchQuery: ''
    }

    const params = buildQueryParams(filters)

    expect(params).toEqual({ maxPrice: 50000 })
    expect(params).not.toHaveProperty('category')
    expect(params).not.toHaveProperty('minPrice')
    expect(params).not.toHaveProperty('q')
  })
})
```

**Generate this test file?** (y/n)

---

### 2. components/filters/CategoryFilter.test.tsx (New File)

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategoryFilter } from './CategoryFilter'

describe('CategoryFilter', () => {
  const mockOnChange = vi.fn()
  const categories = [
    { id: '1', name: 'Electronics', slug: 'electronics' },
    { id: '2', name: 'Clothing', slug: 'clothing' }
  ]

  it('should render category dropdown', () => {
    render(<CategoryFilter categories={categories} onChange={mockOnChange} />)

    expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument()
  })

  it('should call onChange when category selected', async () => {
    const user = userEvent.setup()
    render(<CategoryFilter categories={categories} onChange={mockOnChange} />)

    const dropdown = screen.getByRole('combobox')
    await user.click(dropdown)
    await user.click(screen.getByText('Electronics'))

    expect(mockOnChange).toHaveBeenCalledWith('electronics')
  })

  it('should be keyboard navigable', async () => {
    const user = userEvent.setup()
    render(<CategoryFilter categories={categories} onChange={mockOnChange} />)

    const dropdown = screen.getByRole('combobox')
    await user.tab() // Focus dropdown
    expect(dropdown).toHaveFocus()

    await user.keyboard('{Enter}') // Open dropdown
    await user.keyboard('{ArrowDown}') // Select first option
    await user.keyboard('{Enter}') // Confirm

    expect(mockOnChange).toHaveBeenCalled()
  })

  it('should have proper ARIA attributes', () => {
    render(<CategoryFilter categories={categories} onChange={mockOnChange} />)

    const dropdown = screen.getByRole('combobox')
    expect(dropdown).toHaveAttribute('aria-label')
    expect(dropdown).toHaveAttribute('aria-expanded')
  })

  // TODO: Add more tests
  // - Test empty categories
  // - Test pre-selected category
  // - Test clear selection
})
```

**Generate this test file?** (y/n)

---

[Continue for all untested files...]
```

---

### Step 5: Test Recommendations

```
## Test Priorities

### Critical (Must Add):
1. ❌ lib/services/products/filter-products.ts
   - Business logic
   - External API calls
   - Error handling

2. ❌ components/filters/CategoryFilter.tsx
   - User-facing UI
   - Interactions
   - Accessibility

### Important (Should Add):
3. ⚠️ lib/utils/url-params.ts
   - URL parsing edge cases
   - Used throughout app

4. ⚠️ lib/hooks/useFilterState.ts
   - Complete coverage
   - Edge cases

### Nice to Have:
5. 💡 Integration test for full filter flow
6. 💡 E2E test for user journey

---

## Coverage Targets

**Current Coverage:**
- Unit tests: 65%
- Component tests: 45%
- Integration tests: 20%

**After Adding Suggested Tests:**
- Unit tests: 95% ✅
- Component tests: 85% ✅
- Integration tests: 35% ⚠️

**Recommended:** Add integration test for critical path
```

---

## Generate Tests

```
I can generate all suggested tests now.

**Will create:**
- 3 new test files
- ~150 lines of test code
- Cover critical paths and edge cases

**Estimated time:** 5-10 minutes to review and adjust

Proceed? (y/n)

If yes, I'll create each test file and you can review/adjust before committing.
```

---

## Tips for Good Tests

### Unit Tests:
- **Arrange-Act-Assert** pattern
- **One assertion per test** (when possible)
- **Test behavior, not implementation**
- **Mock external dependencies**

### Component Tests:
- **Render + user interaction**
- **Test accessibility**
- **Test different states** (loading, error, empty)
- **Avoid testing implementation details**

### Test Naming:
```typescript
// ✅ Good: Describes behavior
it('should display error message when API fails')

// ❌ Bad: Implementation detail
it('should set error state to true')
```

### Coverage Goals:
- **Critical paths:** 100%
- **Business logic:** 90%+
- **UI components:** 80%+
- **Utilities:** 90%+

---

## Related Commands

- `/write-unit-tests` - Detailed unit test generation
- `/run-all-tests-and-fix` - Run and fix failing tests
- `/code-review` - Check test quality
- `/prepare-pr` - Verify test coverage before PR


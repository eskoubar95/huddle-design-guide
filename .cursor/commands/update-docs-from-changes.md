# Update Documentation from Changes

**Goal:** Identify and generate documentation updates based on code changes.

**Context:**
- Analyzes changes for documentation impact
- Suggests README, API docs, JSDoc updates
- Generates documentation content
- Ensures docs stay in sync with code

---

## Usage

```
/update-docs-from-changes
/update-docs-from-changes --scope readme
/update-docs-from-changes --scope api
```

---

## Process

### Step 1: Analyze Changes

```
Analyzing changes for documentation impact...

**Branch:** feature/BS-152-product-catalog
**Files changed:** 12
**New features:** 1 (Product filtering)
**New API endpoints:** 0 (uses existing)
**New components:** 5
**New hooks:** 1
```

---

### Step 2: Identify Documentation Needs

```
## Documentation Updates Needed

### README.md ⚠️
**Impact:** High - New user-facing feature

**Changes needed:**
- Add "Product Filtering" section
- Document filter options
- Explain URL parameters for shareable links
- Add usage examples

---

### API Documentation ✅
**Impact:** None - No API changes

Existing `/api/v1/products` endpoint supports filtering.
No documentation updates needed.

---

### JSDoc Comments ⚠️
**Impact:** Medium - Complex functions lack documentation

**Files needing JSDoc:**
1. `lib/services/products/filter-products.ts` - 3 functions
2. `lib/hooks/useFilterState.ts` - 1 hook
3. `lib/utils/url-params.ts` - 2 functions

---

### Component Documentation ⚠️
**Impact:** Low - Internal components

**Storybook entries** (if using Storybook):
- FilterSidebar
- CategoryFilter
- PriceRangeFilter

---

### User Guide / Wiki ℹ️
**Impact:** Low - Can add later

Consider adding:
- "How to use product filters" guide
- "Filter URL parameters" reference
```

---

### Step 3: Generate Documentation

```
## Proposed Documentation Updates

### 1. README.md Updates

**Add to "Features" section:**

````markdown
### Product Filtering

Browse and filter products by:
- **Category** - Filter by product category (e.g., Electronics, Clothing)
- **Price Range** - Set minimum and maximum price in DKK
- **Search** - Search products by name

**Usage:**

Visit the products page and use the filter sidebar:
```
https://beauty-shop.dk/products?category=electronics&minPrice=500&maxPrice=5000
```

**URL Parameters:**
- `category` - Category slug (e.g., `electronics`, `clothing`)
- `minPrice` - Minimum price in øre (e.g., `50000` = 500 DKK)
- `maxPrice` - Maximum price in øre (e.g., `500000` = 5000 DKK)
- `q` - Search query (e.g., `laptop`)

**Examples:**
```
# Electronics under 1000 DKK
/products?category=electronics&maxPrice=100000

# Search for "laptop" in Electronics category
/products?category=electronics&q=laptop

# Price range 500-2000 DKK
/products?minPrice=50000&maxPrice=200000
```

**Shareable Links:**
Filter states are stored in URL, making links shareable.
````

**Apply this update?** (y/n)

---

### 2. JSDoc for filter-products.ts

````typescript
/**
 * Fetches filtered products from the MedusaJS API.
 *
 * @param filters - Filter criteria (category, price range, search query)
 * @param cursor - Optional pagination cursor
 * @returns Promise resolving to filtered products with pagination info
 *
 * @throws {UserFacingError} When API request fails
 *
 * @example
 * ```typescript
 * const result = await filterProducts({
 *   category: 'electronics',
 *   minPrice: 50000, // 500 DKK in øre
 *   maxPrice: 500000, // 5000 DKK
 *   searchQuery: 'laptop'
 * })
 * console.log(result.data) // Array of products
 * console.log(result.nextCursor) // Cursor for next page
 * ```
 */
export async function filterProducts(
  filters: ProductFilters,
  cursor?: string
): Promise<FilteredProductsResponse> {
  // ... implementation
}

/**
 * Builds URL query parameters from filter object.
 *
 * @param filters - Filter criteria object
 * @returns Object with query parameters, excluding null/empty values
 *
 * @example
 * ```typescript
 * const params = buildQueryParams({
 *   category: 'electronics',
 *   minPrice: null, // Will be excluded
 *   searchQuery: ''  // Will be excluded
 * })
 * // Result: { category: 'electronics' }
 * ```
 */
export function buildQueryParams(filters: ProductFilters): Record<string, any> {
  // ... implementation
}

/**
 * Handles filter API errors with user-friendly messages.
 *
 * Captures error in Sentry (without PII) and throws UserFacingError.
 *
 * @param error - Original error from API
 * @throws {UserFacingError} Always throws with user-friendly message
 *
 * @internal
 */
function handleFilterError(error: Error): never {
  // ... implementation
}
````

**Apply these JSDoc updates?** (y/n)

---

### 3. JSDoc for useFilterState.ts

````typescript
/**
 * Custom hook for managing product filter state with URL synchronization.
 *
 * Provides filter state and actions, automatically syncing with URL parameters
 * for shareable links.
 *
 * @returns Object with filter state and actions
 *
 * @example
 * ```typescript
 * function ProductsPage() {
 *   const { filters, setCategory, setPriceRange, clearFilters } = useFilterState()
 *
 *   return (
 *     <div>
 *       <CategoryFilter
 *         value={filters.category}
 *         onChange={setCategory}
 *       />
 *       <button onClick={clearFilters}>Clear All</button>
 *     </div>
 *   )
 * }
 * ```
 *
 * @see ProductFilters for filter type definition
 * @see useURLParams for URL synchronization logic
 */
export function useFilterState() {
  // ... implementation
}
````

**Apply this JSDoc update?** (y/n)

---

### 4. JSDoc for url-params.ts

````typescript
/**
 * Parses URL query parameters into ProductFilters object.
 *
 * Handles type conversions (strings to numbers) and validates values.
 *
 * @param searchParams - URLSearchParams from Next.js router
 * @returns ProductFilters object with parsed values
 *
 * @example
 * ```typescript
 * const params = new URLSearchParams('?category=electronics&minPrice=50000')
 * const filters = paramsToFilters(params)
 * // Result: { category: 'electronics', minPrice: 50000, maxPrice: null, searchQuery: '' }
 * ```
 */
export function paramsToFilters(searchParams: URLSearchParams): ProductFilters {
  // ... implementation
}

/**
 * Converts ProductFilters object to URL query parameters.
 *
 * Excludes null/empty values for clean URLs.
 *
 * @param filters - Filter criteria object
 * @returns URLSearchParams ready for router.push()
 *
 * @example
 * ```typescript
 * const filters = { category: 'electronics', minPrice: null, searchQuery: '' }
 * const params = filtersToParams(filters)
 * // Result: URLSearchParams with only 'category=electronics'
 * ```
 */
export function filtersToParams(filters: ProductFilters): URLSearchParams {
  // ... implementation
}
````

**Apply these JSDoc updates?** (y/n)

---

### 5. Component Props Documentation

For TypeScript components, ensure interfaces are documented:

````typescript
/**
 * Props for FilterSidebar component.
 */
interface FilterSidebarProps {
  /** Available product categories for filtering */
  categories: Category[]
  /** Current filter state */
  filters: ProductFilters
  /** Callback when filters change */
  onFiltersChange: (filters: ProductFilters) => void
  /** Whether sidebar is open (mobile) */
  isOpen?: boolean
  /** Callback to close sidebar (mobile) */
  onClose?: () => void
}

/**
 * Main filter sidebar component.
 *
 * Displays all available filters (category, price, search) in a sidebar layout.
 * Responsive: full sidebar on desktop, modal on mobile.
 *
 * @example
 * ```tsx
 * <FilterSidebar
 *   categories={categories}
 *   filters={currentFilters}
 *   onFiltersChange={handleFilterChange}
 * />
 * ```
 */
export function FilterSidebar(props: FilterSidebarProps) {
  // ... implementation
}
````

**Apply these interface docs?** (y/n)
```

---

## Summary

```
## Documentation Update Summary

**Updates Needed:** 5 areas

### High Priority (User-Facing):
1. ✅ README.md - Product filtering section
   - Estimated: 5 minutes
   - Impact: Users need to know how to use filters

### Medium Priority (Developer):
2. ⚠️ JSDoc for services (3 files)
   - Estimated: 10 minutes
   - Impact: Makes code easier to understand

3. ⚠️ Component interface docs
   - Estimated: 5 minutes
   - Impact: Better IDE autocomplete

### Low Priority:
4. ℹ️ Storybook entries (if using)
   - Estimated: 15 minutes
   - Impact: Nice to have for component library

5. ℹ️ User guide wiki
   - Estimated: 30 minutes
   - Impact: Can add post-launch

---

**Total Time:** ~20 minutes for high + medium priority

**Apply all documentation updates?** (y/update individually/n)
```

---

## Auto-Generate Mode

```
/update-docs-from-changes --auto
```

Automatically applies all high and medium priority updates:
- Updates README
- Adds JSDoc to functions
- Documents component interfaces

---

## Documentation Best Practices

### README Updates:
- **Keep it user-focused** - What can users do?
- **Show examples** - Code snippets and URLs
- **Link to details** - Don't overwhelm with everything

### JSDoc:
- **Document public APIs** - Especially exported functions
- **Include examples** - Show typical usage
- **Note edge cases** - Document validation, errors
- **Link related functions** - Use `@see` tags

### Examples of Good JSDoc:

```typescript
/**
 * Calculates discounted price for a product.
 *
 * @param price - Original price in øre
 * @param discount - Discount percentage (0-100)
 * @returns Discounted price in øre, rounded down
 *
 * @throws {Error} If discount is not between 0-100
 *
 * @example
 * ```typescript
 * const discountedPrice = calculateDiscount(10000, 20)
 * // Returns: 8000 (100 DKK with 20% off = 80 DKK)
 * ```
 */
```

### Component Documentation:

```typescript
/**
 * ProductCard displays a single product with image, title, and price.
 *
 * @component
 * @example
 * ```tsx
 * <ProductCard
 *   product={product}
 *   onAddToCart={() => addToCart(product.id)}
 * />
 * ```
 */
```

---

## Tips

### When to Update Docs:
- ✅ New user-facing features
- ✅ API changes
- ✅ Complex functions
- ✅ Breaking changes

### When Docs NOT Needed:
- ❌ Internal refactoring (no behavior change)
- ❌ Simple utility functions (self-explanatory)
- ❌ Tests (unless test utilities)

### Keeping Docs Up-to-Date:
1. **Update with code** - Don't defer documentation
2. **Review in PR** - Check docs are accurate
3. **Use examples** - Makes docs easier to maintain
4. **Link to code** - Use `@see` to reference implementation

---

## Related Commands

- `/add-documentation` - Generate docs for specific files
- `/prepare-pr` - Checks if docs need updates
- `/code-review` - Reviews documentation quality


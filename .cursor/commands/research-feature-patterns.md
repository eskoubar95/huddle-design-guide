# Research Feature Patterns

**Goal:** Guided research of codebase patterns before planning or implementing features.

**Inspiration:** Adapted from HumanLayer's research workflow

**Context:**
- Find similar features to model after
- Identify patterns and conventions
- Discover reusable components
- Understand constraints and dependencies
- Interactive guided process

---

## Usage

```
/research-feature-patterns [feature-description]
```

**Examples:**
```
/research-feature-patterns product filtering
/research-feature-patterns checkout payment flow
/research-feature-patterns user authentication
```

---

## Research Process

### Step 1: Understand Feature

```
I'll help research patterns for: [feature-description]

**What I'll look for:**
- Similar existing features
- Reusable components/services
- Patterns to follow
- Database schema relevant to feature
- API endpoints
- Integration points
```

---

### Step 2: Search Similar Features

```
## Step 1: Finding Similar Features

Searching codebase for similar patterns...
```

I'll use `codebase_search` to find:

**Query 1: Similar UI Components**
```
Searching: "filter component patterns"

Found:
1. components/admin/ProductFilters.tsx
   - Similar filtering UI for admin panel
   - Uses dropdown + search pattern
   - Reusable FilterDropdown component

2. components/search/SearchFilters.tsx
   - Search with faceted filters
   - Debounced input (300ms)
   - URL state sync implemented

3. components/ui/Dropdown.tsx
   - Generic dropdown component
   - Accessible (ARIA labels)
   - Keyboard navigation
```

**Query 2: State Management**
```
Searching: "Zustand store patterns"

Found:
1. lib/stores/cart-store.ts
   - Zustand with devtools
   - Clear actions pattern
   - Persistent state (localStorage)

2. lib/stores/auth-store.ts
   - Similar structure
   - TypeScript interfaces
   - Error handling pattern

**Pattern to follow:** Zustand with devtools + TypeScript
```

**Query 3: API Integration**
```
Searching: "product API integration"

Found:
1. lib/services/products/list-products.ts
   - MedusaJS integration
   - Cursor-based pagination
   - Error handling with try/catch + Sentry

2. lib/services/products/get-product.ts
   - Single product fetch
   - Caching strategy
   - Loading states
```

---

### Step 3: Database Schema

```
## Step 2: Database Schema Review

Checking `.project/04-Database_Schema.md`...

### Relevant Tables:

**products table:**
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  price INTEGER,  -- in øre (minor units)
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_price ON products(price);
```

**Observations:**
- ✅ category_id indexed for efficient filtering
- ✅ price indexed for range queries
- ℹ️ Price stored in minor units (øre) - need conversion for display
- ℹ️ Full-text search may need separate index or solution

**categories table:**
```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  slug VARCHAR(255) UNIQUE,
  parent_id UUID REFERENCES categories(id)
);
```

**Observations:**
- ✅ Hierarchical categories supported (parent_id)
- ✅ Slug for URL-friendly category filters
```

---

### Step 4: API Patterns

```
## Step 3: API Patterns

Checking `.project/05-API_Design.md`...

### Relevant Endpoints:

**GET /api/v1/products**
- Supports query params: `?limit=20&cursor=XXX`
- Response format:
```typescript
{
  data: Product[],
  nextCursor: string | null,
  hasMore: boolean
}
```

**Filtering Support:**
- Category: `?category=slug`
- Price: `?minPrice=X&maxPrice=Y` (in øre)
- Search: `?q=search+term`

**Example:**
```
GET /api/v1/products?category=electronics&minPrice=5000&maxPrice=50000&q=laptop&limit=20
```

**Error Responses:**
```typescript
{
  error: {
    code: "INVALID_FILTER",
    message: "Price range invalid",
    details: { minPrice: 5000, maxPrice: 3000 }
  }
}
```

**Patterns to follow:**
- ✅ Cursor pagination
- ✅ Query param filtering
- ✅ Structured error responses
```

---

### Step 5: Existing Components

```
## Step 4: Reusable Components

Found components we can reuse:

### UI Components:
1. **components/ui/Dropdown.tsx**
   - Generic dropdown
   - Accessible, keyboard nav
   - **Use for:** Category filter

2. **components/ui/Slider.tsx**
   - Range slider component
   - Min/max values
   - **Use for:** Price range

3. **components/ui/SearchInput.tsx**
   - Debounced search
   - Clear button
   - **Use for:** Product search

4. **components/ui/Button.tsx**
   - Primary/secondary variants
   - Loading states
   - **Use for:** Apply/Clear filters

### Hooks:
1. **lib/hooks/useDebounce.ts**
   - Debounces values (300ms default)
   - **Use for:** Search input

2. **lib/hooks/useURLParams.ts**
   - Sync state with URL
   - **Use for:** Shareable filters

### Utils:
1. **lib/utils/currency.ts**
   - Format øre to DKK
   - **Use for:** Price display

2. **lib/utils/api-client.ts**
   - API request wrapper
   - Error handling
   - **Use for:** All API calls
```

---

### Step 6: Integration Points

```
## Step 5: Integration Points

### Backend (MedusaJS):
- **Service:** Product service already supports filtering
- **Endpoint:** `/admin/products` (authenticated)
- **Public:** `/store/products` (public-facing)
- **No changes needed** - API ready to use

### Database (Supabase):
- **Direct queries:** Consider for complex filters
- **RLS policies:** Ensure public read access
- **Indexes:** Already in place for category_id, price

### State Management:
- **Zustand:** For filter state
- **React Query/SWR:** Consider for API caching
- **URL state:** Use useURLParams hook

### Styling:
- **Tailwind:** Follow existing utility classes
- **shadcn/ui:** If using, leverage filter components
```

---

## Summary & Recommendations

```
## Research Summary

**For Feature:** Product Filtering

---

### Key Findings:

**✅ What Exists:**
- Similar filtering in admin panel (can adapt)
- Zustand store pattern established
- UI components ready to use (Dropdown, Slider, SearchInput)
- API supports all needed filters
- Database indexes in place

**⚠️ What's Missing:**
- No public-facing filter UI yet
- URL state sync needed for shareable links
- Mobile filter modal pattern (exists in checkout, can adapt)

**📋 Dependencies:**
- MedusaJS Product API ✅ Available
- Supabase direct queries ℹ️ Optional (API sufficient)
- Zustand ✅ Already in use
- Tailwind ✅ Configured

---

### Recommended Approach:

**Architecture:**
```
User Input
  ↓
Zustand Store (filter state)
  ↓
URL Sync (useURLParams)
  ↓
MedusaJS API (/store/products?filters)
  ↓
Product List Update
```

**Component Structure:**
```
components/filters/
  ├── FilterSidebar.tsx          # Main container
  ├── CategoryFilter.tsx         # Uses ui/Dropdown
  ├── PriceRangeFilter.tsx       # Uses ui/Slider
  ├── SearchFilter.tsx           # Uses ui/SearchInput
  └── FilterChips.tsx            # Active filter display
```

**State Management:**
```typescript
// lib/stores/filter-store.ts
interface FilterState {
  category: string | null
  minPrice: number | null
  maxPrice: number | null
  searchQuery: string
  // Actions
  setCategory: (category: string | null) => void
  setPriceRange: (min: number | null, max: number | null) => void
  setSearchQuery: (query: string) => void
  clearFilters: () => void
}
```

---

### Implementation Phases:

**Phase 1: Foundation** (~150 LOC)
- Create Zustand filter store
- Define TypeScript types
- Setup URL param sync

**Phase 2: UI Components** (~200 LOC)
- Build FilterSidebar container
- Adapt existing UI components
- Mobile responsive design

**Phase 3: API Integration** (~100 LOC)
- Connect to MedusaJS API
- Handle loading/error states
- Implement pagination

**Phase 4: Polish** (~80 LOC)
- Accessibility improvements
- Performance optimization
- Edge case handling

**Total Estimate:** ~530 LOC, 12-15 files

**Complexity:** Medium
**Risk:** Low (all dependencies exist)
**Timeline:** 6-8 hours

---

### Files to Modify/Create:

**New Files:**
- `lib/stores/filter-store.ts`
- `lib/types/filters.ts`
- `lib/services/products/filter-products.ts`
- `components/filters/FilterSidebar.tsx`
- `components/filters/CategoryFilter.tsx`
- `components/filters/PriceRangeFilter.tsx`
- `components/filters/SearchFilter.tsx`
- `components/filters/FilterChips.tsx`
- Tests for above

**Modified Files:**
- `app/(shop)/products/page.tsx` - Integrate filters
- `components/products/ProductList.tsx` - Accept filter props
- `README.md` - Document filter usage

---

### Ready to Proceed:

**Option 1: Create Implementation Plan**
```
/create-implementation-plan [feature-description]
```
Use this research to create detailed plan with phases.

**Option 2: Direct Implementation**
```
/setup-nextjs-feature
```
For simpler features, implement directly.

**Option 3: More Research**
Continue researching specific areas (e.g., mobile patterns, accessibility).

---

Which option would you like to proceed with?
```

---

## Tips for Effective Research

### Before Researching:
1. **Define feature clearly** - Specific vs vague
2. **Know your unknowns** - What are you looking for?
3. **Check Linear ticket** - Use `/fetch-linear-ticket` first

### During Research:
1. **Be thorough** - Don't rush, find all relevant patterns
2. **Take notes** - Document findings for plan
3. **Check dependencies** - Ensure everything exists

### After Research:
1. **Validate findings** - Read actual code, don't assume
2. **Estimate complexity** - Based on what exists
3. **Plan phases** - Break down implementation

---

## Related Commands

- `/fetch-linear-ticket` - Get requirements first
- `/create-implementation-plan` - Use research in planning
- `/codebase-search` - For more specific searches
- `/read-file` - Read files identified in research


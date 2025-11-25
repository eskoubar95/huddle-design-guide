# Optimize Performance

Analyze and optimize code/feature performance for Beauty Shop.

## Objective
Improve performance to meet Beauty Shop's requirement of < 2 second page load time while maintaining code quality.

## Context
- PRD requirement: Page load time < 2 seconds
- E-commerce: Performance directly impacts conversion rates
- Target: Excellent Core Web Vitals scores
- Nordic market: Consider international latency

## Performance Targets

### Core Web Vitals (Target: Good)
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **INP (Interaction to Next Paint)**: < 200ms

### Page Load Metrics
- **Time to First Byte (TTFB)**: < 600ms
- **First Contentful Paint (FCP)**: < 1.8s
- **Time to Interactive (TTI)**: < 3.5s
- **Total Blocking Time (TBT)**: < 200ms

## Performance Audit Checklist

### 1. Bundle Size & JavaScript

- [ ] **Bundle Analysis**: Run bundle analyzer
- [ ] **Code Splitting**: Dynamic imports for heavy components
- [ ] **Tree Shaking**: Remove unused code
- [ ] **Minimal Dependencies**: Remove unnecessary packages
- [ ] **Lazy Loading**: Route-based code splitting

**Check Bundle:**
```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

**Optimize:**
```typescript
// ❌ Bad - loads everything upfront
import HeavyComponent from './HeavyComponent'

// ✅ Good - lazy load
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
  ssr: false // if not needed for SEO
})
```

### 2. Images & Assets

- [ ] **Image Optimization**: Use Next.js Image component
- [ ] **Proper Sizing**: Serve appropriate image sizes
- [ ] **Modern Formats**: WebP with fallbacks
- [ ] **Lazy Loading**: Below-fold images lazy loaded
- [ ] **Priority Loading**: LCP image has priority
- [ ] **Compression**: Images properly compressed

**Next.js Image:**
```tsx
import Image from 'next/image'

// ✅ Optimized image
<Image
  src="/product.jpg"
  alt="Starter Kit"
  width={800}
  height={600}
  priority={isAboveFold} // true for LCP image
  quality={85}
  placeholder="blur"
  blurDataURL="data:image/..." // low quality placeholder
/>
```

### 3. React Performance

- [ ] **Unnecessary Re-renders**: Profile with React DevTools
- [ ] **Memoization**: Use React.memo, useMemo, useCallback where beneficial
- [ ] **List Virtualization**: Virtualize long lists
- [ ] **Key Props**: Proper keys on list items
- [ ] **State Management**: Zustand state optimized

**Avoid Unnecessary Re-renders:**
```typescript
// ❌ Bad - re-renders on every parent update
const ProductCard = ({ product }) => { ... }

// ✅ Good - only re-renders if product changes
const ProductCard = React.memo(({ product }) => { ... })

// ✅ Good - memoize expensive calculations
const expensiveValue = useMemo(() => {
  return calculateDiscount(product.price, discount)
}, [product.price, discount])

// ✅ Good - memoize callbacks passed to children
const handleAddToCart = useCallback(() => {
  addToCart(product.id)
}, [product.id])
```

### 4. API & Data Fetching

- [ ] **Minimize Requests**: Batch related requests
- [ ] **Caching**: Appropriate cache headers
- [ ] **Parallel Fetching**: Fetch data in parallel
- [ ] **No Waterfall**: Avoid sequential dependent fetches
- [ ] **SWR/React Query**: Use data fetching libraries
- [ ] **Prefetching**: Prefetch likely next pages

**Optimize Data Fetching:**
```typescript
// ❌ Bad - waterfall requests
const products = await fetchProducts()
const details = await fetchProductDetails(products[0].id)

// ✅ Good - parallel requests
const [products, details] = await Promise.all([
  fetchProducts(),
  fetchProductDetails(productId)
])

// ✅ Good - SWR with caching
import useSWR from 'swr'

const { data, error } = useSWR('/api/products', fetcher, {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000 // 1 minute
})
```

### 5. Database Queries

- [ ] **N+1 Queries**: Eliminate N+1 query patterns
- [ ] **Indexes**: Proper indexes on queried columns
- [ ] **Select Specific Fields**: Don't select *
- [ ] **Pagination**: Implement cursor-based pagination
- [ ] **Connection Pooling**: Use connection pool (Supabase handles this)

**Query Optimization:**
```typescript
// ❌ Bad - N+1 queries
const orders = await db.orders.findMany()
for (const order of orders) {
  const customer = await db.customers.findUnique({ where: { id: order.customerId } })
}

// ✅ Good - single query with join
const orders = await db.orders.findMany({
  include: { customer: true }
})

// ✅ Good - select only needed fields
const products = await supabase
  .from('products')
  .select('id, name, price, image_url') // specific fields
  .limit(20)
```

### 6. Caching Strategy

- [ ] **HTTP Caching**: Proper Cache-Control headers
- [ ] **CDN**: Static assets on CDN (Vercel handles this)
- [ ] **ISR**: Incremental Static Regeneration for product pages
- [ ] **Edge Caching**: Cache API responses at edge when possible

**Next.js ISR:**
```typescript
// app/products/[id]/page.tsx
export const revalidate = 3600 // revalidate every hour

export async function generateStaticParams() {
  const products = await getProducts()
  return products.map(product => ({ id: product.id }))
}
```

### 7. CSS & Styling

- [ ] **Minimal CSS**: Remove unused CSS
- [ ] **Critical CSS**: Inline critical CSS
- [ ] **Tailwind Purge**: Ensure Tailwind purges unused classes
- [ ] **No Layout Shift**: Reserve space for dynamic content

**Prevent Layout Shift:**
```tsx
// ❌ Bad - causes layout shift
<img src="/product.jpg" />

// ✅ Good - reserves space
<div className="aspect-[4/3] relative">
  <Image 
    src="/product.jpg" 
    fill 
    className="object-cover"
  />
</div>
```

### 8. Third-Party Scripts

- [ ] **Defer Non-critical**: Defer analytics, social widgets
- [ ] **Next.js Script**: Use Next.js Script component
- [ ] **Self-host**: Self-host fonts and critical scripts

**Optimize Scripts:**
```tsx
import Script from 'next/script'

// ✅ Load analytics after page interactive
<Script
  src="https://analytics.example.com/script.js"
  strategy="afterInteractive"
/>

// ✅ Defer non-critical scripts
<Script
  src="https://widget.example.com/script.js"
  strategy="lazyOnload"
/>
```

### 9. Fonts

- [ ] **Font Loading Strategy**: Use font-display swap
- [ ] **Variable Fonts**: Use variable fonts when possible
- [ ] **Subset Fonts**: Load only needed character sets
- [ ] **Preload Fonts**: Preload critical fonts

**Next.js Font Optimization:**
```typescript
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter'
})

export default function RootLayout({ children }) {
  return (
    <html lang="da" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
```

### 10. Server-Side Performance

- [ ] **Fast Server Response**: Optimize server-side rendering
- [ ] **Edge Functions**: Use edge functions for simple logic
- [ ] **Streaming**: Use React Suspense for streaming
- [ ] **Background Jobs**: Move slow tasks to background

**Streaming with Suspense:**
```tsx
import { Suspense } from 'react'

export default function ProductPage() {
  return (
    <>
      <ProductHeader /> {/* Renders immediately */}
      
      <Suspense fallback={<Skeleton />}>
        <ProductDetails /> {/* Streams in when ready */}
      </Suspense>
      
      <Suspense fallback={<Skeleton />}>
        <Reviews /> {/* Streams in when ready */}
      </Suspense>
    </>
  )
}
```

## Performance Testing Tools

### Lighthouse Audit
```bash
# Run Lighthouse
npx lighthouse https://beauty-shop.dk --view

# Or use Chrome DevTools
# Open DevTools > Lighthouse > Generate Report
```

### Next.js Bundle Analyzer
```bash
npm install -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
})

module.exports = withBundleAnalyzer({
  // your config
})

# Analyze
ANALYZE=true npm run build
```

### React DevTools Profiler
1. Open React DevTools
2. Go to Profiler tab
3. Start recording
4. Perform action
5. Stop and analyze flamegraph

### Web Vitals Monitoring
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

## Common Performance Issues & Fixes

### Issue: Large Bundle Size
**Problem:** Bundle > 500KB
**Fix:**
1. Run bundle analyzer
2. Identify large dependencies
3. Replace with lighter alternatives
4. Use dynamic imports

### Issue: Slow Image Loading
**Problem:** LCP > 2.5s due to images
**Fix:**
```tsx
// Add priority to LCP image
<Image src="/hero.jpg" priority />

// Optimize image size
<Image 
  src="/product.jpg"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

### Issue: Excessive Re-renders
**Problem:** Component re-renders unnecessarily
**Fix:**
```typescript
// Memoize component
export default React.memo(ProductCard)

// Memoize expensive calculations
const total = useMemo(() => 
  items.reduce((sum, item) => sum + item.price, 0),
  [items]
)
```

### Issue: Slow API Responses
**Problem:** API calls taking > 1s
**Fix:**
1. Add database indexes
2. Optimize queries (avoid N+1)
3. Implement caching
4. Use edge functions

### Issue: Layout Shift (CLS > 0.1)
**Problem:** Content jumping after load
**Fix:**
```tsx
// Reserve space for images
<div className="aspect-[16/9] relative">
  <Image src="/image.jpg" fill />
</div>

// Reserve space for dynamic content
<div className="min-h-[200px]">
  {loading ? <Skeleton /> : <Content />}
</div>
```

## Monitoring

### Real User Monitoring (RUM)
```typescript
// Track Core Web Vitals
import { onCLS, onFID, onLCP } from 'web-vitals'

onCLS(console.log)
onFID(console.log)
onLCP(console.log)
```

### Performance Budget
Set performance budgets in Lighthouse CI:
```json
{
  "performance": 90,
  "first-contentful-paint": 1800,
  "largest-contentful-paint": 2500,
  "interactive": 3500,
  "speed-index": 3000
}
```

## Output Format

### Performance Report

#### Metrics Summary
- LCP: X.Xs (Target: < 2.5s) ✅/❌
- FID: XXms (Target: < 100ms) ✅/❌
- CLS: X.XX (Target: < 0.1) ✅/❌
- Lighthouse Score: XX/100

#### Critical Issues 🔴
1. Issue description
   - Impact: High/Medium/Low
   - Fix: optimization example

#### Optimization Opportunities 🟡
1. Opportunity description
   - Potential improvement: X%

#### Implemented Optimizations ✅
- What's performing well

## Checklist
- [ ] Bundle size analyzed and optimized
- [ ] Images optimized with Next.js Image
- [ ] LCP image has priority attribute
- [ ] No unnecessary React re-renders
- [ ] API calls optimized (no N+1 queries)
- [ ] Database queries have proper indexes
- [ ] Fonts optimized and preloaded
- [ ] Third-party scripts deferred
- [ ] Core Web Vitals meet targets
- [ ] Lighthouse score > 90


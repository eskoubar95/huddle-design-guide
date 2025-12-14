# Hero Carousel Dimensions

## Desktop (≥1024px)
- **Container Width:** Full width (constrained by parent container max-width `max-w-7xl` to prevent over-stretching on 27"+ screens)
- **Container Height:** min-h-[600px], optimal 600px
- **Padding:** p-20 (80px) vertical, p-12 (48px) horizontal
- **Border Radius:** rounded-3xl (24px)
- **Content Layout:** 2-column grid (md:grid-cols-2) med gap-8

## Large Screens (≥1536px / 27"+)
- **Container Width:** `max-w-[1600px]` (increased from standard 7xl if design allows, otherwise keep 7xl)
- **Container Height:** `min-h-[700px]` (scaling up for larger viewports)
- **Padding:** `p-24` (96px) vertical
- **Note:** Ensure aspect ratio remains consistent without stretching images awkwardly.

## iPad (768px - 1023px)
- **Container Width:** Full width
- **Container Height:** min-h-[600px]
- **Padding:** p-12 (48px)
- **Border Radius:** rounded-3xl (24px)
- **Content Layout:** 2-column grid (md:grid-cols-2) med gap-8

## Mobile (< 768px)
- **Will be implemented in Phase 8**
- **Note:** Fokus i Phase 1-7 er på desktop/iPad


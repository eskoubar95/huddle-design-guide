# Design Audit

Extract design system from existing codebase through visual analysis.

## Objective
Document current design patterns by analyzing live rendered components using Playwright MCP, not just code.

## Context
- **Uses Playwright MCP** to screenshot components with AI visual analysis
- Follow `.cursor/rules/10-nextjs_frontend.mdc`
- Extract patterns from visual reality + code
- Create `.design-standards.md` as single source of truth

## Prerequisites
- [ ] Local dev server running: `npm run dev` (usually http://localhost:3000)
- [ ] Playwright MCP configured in Cursor
- [ ] Homepage components built and visible

## Process

### 1. Visual Capture (Playwright MCP)

Use Playwright to navigate and screenshot:

**Homepage sections:**
- Hero section
- Brand logos
- Step cards
- Product cards
- Storytelling section
- FAQ section
- Final CTA

**Viewports:**
- Desktop: 1440px width
- Mobile: 375px width

**Save screenshots to:** `.design/screenshots/baseline/`

### 2. Visual Analysis

Analyze screenshots using AI vision for:

**Colors:**
- [ ] Primary colors (navy variations)
- [ ] Accent colors (orange, etc.)
- [ ] Background colors
- [ ] Text colors and opacity patterns
- [ ] Border colors

**Spacing:**
- [ ] Section padding (py-*)
- [ ] Container padding (px-*)
- [ ] Internal gaps (gap-*)
- [ ] Element margins
- [ ] Whitespace distribution

**Typography:**
- [ ] H1, H2, H3 sizes (as rendered)
- [ ] Body text sizes
- [ ] Font weights
- [ ] Line heights
- [ ] Letter spacing (tracking)
- [ ] Text hierarchies

**Shadows:**
- [ ] Hero box shadow
- [ ] Card shadows
- [ ] Hover shadows
- [ ] Shadow colors and depths

**Border Radius:**
- [ ] Card corners
- [ ] Button corners
- [ ] Image corners
- [ ] Consistency across components

**Hover States:**
- [ ] Transform effects (lift)
- [ ] Transition durations
- [ ] Color changes
- [ ] Shadow changes

### 3. Code Correlation

Match visual patterns to code:
- Find Tailwind classes producing the visuals
- Identify hardcoded hex values vs. theme tokens
- Document custom shadow patterns
- Note spacing that breaks 8px scale
- List components with inconsistent patterns

### 4. Compare Components

Identify inconsistencies by comparing:
- Step card vs. Product card (padding, shadows)
- Hero vs. Storytelling (typography hierarchy)
- All cards (border radius consistency)
- All sections (spacing patterns)

## Audit Scope

Analyze these areas:

### Colors
- [ ] All custom hex colors (`bg-[#...]`, `text-[#...]`)
- [ ] Opacity patterns (`/75`, `/80`, `/60`)
- [ ] Color usage consistency
- [ ] Missing theme tokens

### Spacing
- [ ] Section padding patterns
- [ ] Container max-widths
- [ ] Container horizontal padding
- [ ] Internal component spacing
- [ ] Adherence to 8px scale (4, 8, 12, 16, 24, 32, 48, 64, 96, 128)
- [ ] Off-scale values (px-10, py-7, etc.)

### Typography
- [ ] H1 sizes: text-3xl, text-4xl, text-5xl usage
- [ ] H2 sizes: text-4xl, text-5xl usage
- [ ] H3 sizes: text-2xl, text-3xl usage
- [ ] Body: text-base, text-lg
- [ ] Small text: text-sm, text-xs
- [ ] Tracking patterns: tracking-tight, tracking-[-0.02em], etc.
- [ ] Leading patterns: leading-tight, leading-relaxed

### Shadows
- [ ] Hero shadow: `shadow-[0_28px_70px_rgba(5,21,55,0.18)]`
- [ ] Product card shadow: `shadow-[0_22px_60px_rgba(5,21,55,0.08)]`
- [ ] Step card shadow: `shadow-[0_15px_30px_-12px...]`
- [ ] Other custom shadows
- [ ] Hover shadow patterns

### Component Patterns
- [ ] Hero structure
- [ ] Card structures (Step, Product)
- [ ] Section structures (Storytelling, FAQ, Why)
- [ ] Button variants
- [ ] Image containers
- [ ] Uppercase labels pattern

## Deliverables

### 1. Screenshot Archive
```
.design/screenshots/baseline/
  ├── desktop/
  │   ├── hero.png
  │   ├── step-cards.png
  │   ├── product-cards.png
  │   ├── storytelling.png
  │   ├── faq.png
  │   └── full-page.png
  └── mobile/
      ├── hero.png
      ├── step-cards.png
      ├── product-cards.png
      ├── storytelling.png
      ├── faq.png
      └── full-page.png
```

### 2. `.design-standards.md`

Document extracted patterns:

```markdown
# Beauty Shop Design Standards

## Colors
### Primary
- Navy: #051537, #08152D, #0B2142 (variations)
- Usage: Headers, navigation, important text

### Accent
- Orange: #F2542D
- Usage: CTAs, important actions, highlights

### Background
- Warm beige: #efeeec
- Light: #fafaf8
- Usage: Page background, card backgrounds

### Text Opacity Hierarchy
- Primary: /100 (headings)
- Secondary: /80 (body text)
- Tertiary: /75 (descriptions)
- Muted: /60 (labels, kickers)

## Spacing Scale (8px base)
- xs: 4px (gap-1, p-1)
- sm: 8px (gap-2, p-2)
- md: 12px (gap-3, p-3)
- base: 16px (gap-4, p-4)
- lg: 24px (gap-6, p-6)
- xl: 32px (gap-8, p-8)
- 2xl: 48px (gap-12, p-12)
- 3xl: 64px (gap-16, p-16)
- 4xl: 96px (gap-24, p-24)
- 5xl: 128px (gap-32, p-32)

### Section Spacing
- Desktop: py-16, py-20, py-24
- Mobile → Desktop: py-16 sm:py-20 lg:py-24

### Container
- Max width: max-w-[1440px]
- Padding: px-4 sm:px-8 lg:px-16

## Typography

### Hierarchy
- H1 (Hero): text-3xl sm:text-[34px] lg:text-[40px]
- H2 (Section): text-4xl sm:text-5xl lg:text-[56px]
- H3 (Card): text-3xl sm:text-[34px]
- Body: text-base (16px), sometimes sm:text-lg
- Small: text-sm (14px)
- Tiny: text-xs (12px)

### Tracking
- Tight headings: tracking-tight or tracking-[-0.02em]
- Section headings: tracking-[-0.04em]
- Uppercase labels: tracking-[0.22em] or tracking-[0.2em]

### Leading
- Tight: leading-tight (headings)
- Relaxed: leading-relaxed (body text)

## Shadows

### Hero Box
`shadow-[0_28px_70px_rgba(5,21,55,0.18)]`

### Product Card
`shadow-[0_22px_60px_rgba(5,21,55,0.08)]`

### Step Card
`shadow-[0_15px_30px_-12px_rgba(0,0,0,0.1),0_4px_12px_-8px_rgba(0,0,0,0.1)]`

## Border Radius
- soft: 2px
- base: 4px
- rounded: 8px (cards, buttons)
- large: 16px (prominent cards)
- circle: 9999px (avatars, pills)

## Hover States
- Lift: hover:-translate-y-1 or hover:-translate-y-0.5
- Transition: duration-200
- Shadow: Often combined with lift

## Component Patterns
[Document structure of Hero, Cards, Sections]
```

### 3. Inconsistencies Report

List issues found:

```markdown
## Inconsistencies Found

### Critical (Breaks pattern)
1. **Border radius variation**
   - Step cards: rounded-none
   - Product cards: no explicit border-radius
   - Should be: rounded-lg (16px) for cards

2. **Custom hex in components**
   - bg-[#08152D] in 5 files
   - Should be: theme token bg-primary-darker

### Medium (Off standard)
1. **Spacing off-scale**
   - px-10 in ProductCard (not 8px multiple)
   - Should be: px-8

### Low (Enhancement)
1. **Shadow duplication**
   - Custom shadow-[...] repeated in 3 components
   - Should be: named token shadow-hero
```

## Checklist

- [ ] Dev server running
- [ ] Playwright screenshots captured (desktop + mobile)
- [ ] All homepage sections documented
- [ ] Visual measurements taken
- [ ] Colors extracted from renders
- [ ] Spacing patterns analyzed
- [ ] Typography hierarchy documented
- [ ] Shadows catalogued
- [ ] Component patterns identified
- [ ] Code correlation completed
- [ ] Inconsistencies listed with locations
- [ ] `.design-standards.md` created
- [ ] Screenshot baseline saved

## Output Format

Provide structured report:

### Screenshot Archive
- Location of saved screenshots
- Confirmation all sections captured

### Extracted Patterns
- Colors (with hex values)
- Spacing scale
- Typography hierarchy
- Shadow tokens
- Border radius scale
- Hover patterns

### Inconsistencies
Grouped by severity:
- 🔴 Critical: Breaks established pattern
- 🟡 Medium: Off standard but functional
- 🟢 Low: Nice-to-have improvements

For each:
- Description
- Location (file:line)
- Current value
- Expected value
- Fix suggestion

### Next Steps
- Recommend running `/design-consistency-fix` to address issues
- Suggest priority order for fixes


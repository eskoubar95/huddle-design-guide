# Design Adapt Inspiration

Analyze design inspiration from external site and adapt specific patterns to your component.

## Objective
Extract actionable design patterns from inspiration site (colors, spacing, layout, typography) and provide concrete recommendations for adapting them to your Beauty Shop component while maintaining brand consistency.

## Context
- **Uses Playwright MCP** to screenshot and analyze inspiration site
- **AI visual analysis** to extract specific patterns
- Compares with your existing code
- Provides multiple adaptation alternatives
- Maintains Beauty Shop brand constraints from `.design-standards.md`

## Prerequisites
- [ ] Inspiration site URL accessible
- [ ] Clear idea of what pattern to extract (colors, spacing, layout, etc.)
- [ ] Target component/file in your codebase identified
- [ ] Dev server running (optional, for before/after comparison)

## Input Parameters

Define what to analyze:
- [ ] **Inspiration URL:** `{{url}}` (e.g., https://linear.app, https://aesop.com/dk/r/c/hair/)
- [ ] **What to extract:** `{{pattern_focus}}` (colors, spacing, layout, typography, shadows, card design, etc.)
- [ ] **Target code:** `{{file_path}}` (e.g., src/components/TestimonialSection.tsx)
- [ ] **Goal:** `{{desired_outcome}}` (e.g., "Make our cards feel more premium like Linear's")

## Process

### Phase 1: Capture Inspiration (Playwright MCP)

**Navigate to inspiration site:**
```
Playwright: Navigate to {{url}}
Wait for: Page fully loaded
```

**Screenshot capture:**
- Full page or specific section
- Focus on the pattern mentioned (e.g., if "card design", screenshot cards)
- Desktop view (1440px)
- Optional: Mobile view if responsive design relevant

**Save screenshot:**
- Descriptive name: `inspiration-[site]-[date].png`
- Location: `.design/screenshots/inspiration/`

### Phase 2: Extract Patterns (AI Visual Analysis)

Analyze screenshot based on `{{pattern_focus}}`:

#### If Focus: Colors

**Extract:**
- [ ] Primary colors (hex values)
- [ ] Accent colors
- [ ] Background colors
- [ ] Text colors and opacity patterns
- [ ] Hover/active state colors

**Analyze:**
- Color palette harmony
- Contrast ratios
- How colors create hierarchy
- Where each color is used (CTA, text, background, borders)

#### If Focus: Spacing

**Extract:**
- [ ] Section padding (top/bottom)
- [ ] Container padding (left/right)
- [ ] Element gaps (between cards, buttons, text blocks)
- [ ] Internal component spacing
- [ ] Whitespace distribution

**Analyze:**
- Spacing scale (is it 8px-based? 4px? 12px?)
- Ratios between different spacing levels
- What creates the "spacious" or "tight" feel
- Section-to-section transitions

#### If Focus: Layout/Grid

**Extract:**
- [ ] Grid structure (columns, rows)
- [ ] Container max-width
- [ ] Responsive breakpoints
- [ ] Alignment patterns
- [ ] Content distribution

**Analyze:**
- How content is organized
- Visual balance and symmetry
- Negative space usage
- Grid system (12-col, custom, flexbox, grid)

#### If Focus: Typography

**Extract:**
- [ ] Heading sizes (H1, H2, H3)
- [ ] Body text size
- [ ] Font weights
- [ ] Line heights
- [ ] Letter spacing
- [ ] Font family (if identifiable)

**Analyze:**
- Hierarchy (size jumps between levels)
- Scale ratios (e.g., H1 is 2x body)
- Readability factors
- Tracking/leading patterns

#### If Focus: Component Design (Cards, Buttons, etc.)

**Extract:**
- [ ] Component dimensions
- [ ] Padding/internal spacing
- [ ] Border radius
- [ ] Shadows/elevation
- [ ] Hover states
- [ ] Border styles

**Analyze:**
- What makes it feel "premium" or "modern"
- Interaction patterns
- Visual hierarchy within component
- Consistency across similar components

### Phase 3: Read Target Code

**Analyze existing component:**
```
Read: {{file_path}}
Identify:
- Current Tailwind classes
- Current spacing, colors, typography
- Structure and layout
- Opportunities for improvement
```

**Compare with `.design-standards.md`:**
- What constraints do we have? (brand colors, spacing scale)
- What can be changed vs. what must stay consistent?
- Where is there flexibility?

### Phase 4: Generate Adaptation Options

Provide **3 alternatives** with trade-offs:

#### Option 1: Conservative Adaptation
"Adopt the pattern while staying close to Beauty Shop brand"

**Changes:**
- Minimal modifications
- Keeps brand colors/fonts
- Adapts only spacing/structure
- Safe, low-risk option

**Example:**
```tsx
// Current
<section className="py-12 px-4">

// Option 1: Conservative
<section className="py-20 px-4"> 
// → Adopts their generous spacing (128px → 80px) 
//    but keeps our container structure
```

#### Option 2: Bold Adaptation
"Embrace their design language more strongly"

**Changes:**
- Adopts colors (adapted to brand)
- Adopts spacing scale
- Adopts layout patterns
- Moderate risk, higher impact

**Example:**
```tsx
// Current
<div className="bg-background p-8">

// Option 2: Bold
<div className="bg-[#F7F9FC] p-12 lg:p-16">
// → Their lighter background + more generous padding
// Note: Add #F7F9FC to tailwind.config as bg-surface-light
```

#### Option 3: Full Reimagination
"Rebuild component inspired by their approach"

**Changes:**
- New structure/layout
- Adopted design patterns
- Potential component refactor
- High risk, maximum impact

**Example:**
```tsx
// Current
<div className="grid grid-cols-3 gap-6">

// Option 3: Full Reimagination
<div className="flex flex-col lg:flex-row gap-16 items-start">
// → Their asymmetric layout creates more visual interest
// Requires restructuring component logic
```

### Phase 5: Brand Constraint Validation

For each option, validate against Beauty Shop constraints:

**Colors:**
- Does it conflict with primary (#051537) or accent (#F2542D)?
- Can we adapt their colors to our palette?
- Contrast ratios still WCAG AA?

**Spacing:**
- Fits 8px scale? (adjust if 12px or other base)
- Consistent with existing sections?
- Works on mobile?

**Typography:**
- Compatible with Inter font?
- Hierarchy still clear?
- Readable sizes?

**Brand Feel:**
- Still feels "premium beauty"?
- Matches Hero, ProductCard feel?
- Too corporate? Too playful?

### Phase 6: Implementation Guidance

For chosen option, provide:

**Concrete Tailwind changes:**
```tsx
File: {{file_path}}

Line 15:
- Before: py-12 px-4 gap-6
- After: py-20 px-4 sm:px-8 gap-12 lg:gap-16
- Why: Adopts their generous spacing pattern

Line 23:
- Before: text-3xl font-semibold
- After: text-4xl sm:text-5xl font-semibold tracking-tight
- Why: Stronger hierarchy + refined tracking like inspiration
```

**If new colors needed:**
```javascript
// Add to tailwind.config.js
colors: {
  surface: {
    light: '#F7F9FC',  // Adapted from Linear
  }
}
```

**Visual prediction:**
- What will improve visually
- What might feel different
- Any risks of breaking existing design

## Output Format

### 🎨 Inspiration Analysis

**Site:** {{url}}
**Focus:** {{pattern_focus}}

**Screenshots captured:**
- Desktop: [reference]
- Key section: [reference]

**Extracted Patterns:**

*[Based on focus area]*

**Colors:**
- Primary: #XXXXXX (used for headers, CTAs)
- Background: #XXXXXX (page/section)
- Accent: #XXXXXX (highlights)

**Spacing:**
- Section padding: 128px (py-32)
- Element gaps: 64px (gap-16)
- Container: max-w-[1200px]

**Typography:**
- H1: 60px (text-6xl)
- H2: 40px (text-4xl)
- Body: 17px (text-lg)
- Tracking: -0.02em for headings

**Key Insight:**
[What creates the aesthetic you're drawn to]

---

### 🎯 Target Component Analysis

**File:** {{file_path}}
**Current state:**
- Spacing: py-12, gap-6
- Colors: bg-background
- Typography: text-3xl

**Opportunities:**
- Could increase spacing for premium feel
- Typography hierarchy could be stronger
- Background could be lighter for contrast

---

### 🔀 Adaptation Options

#### ✅ Option 1: Conservative (Recommended)

**Changes:**
- Increase section padding: py-12 → py-20
- Increase gaps: gap-6 → gap-12
- Refine heading: add tracking-tight

**Pros:**
- Low risk, maintains brand consistency
- Quick to implement
- Measurable improvement

**Cons:**
- Less dramatic transformation
- Still fairly conservative

**Code:**
```tsx
// Line 15
- <section className="py-12 px-4 gap-6">
+ <section className="py-20 px-4 sm:px-8 gap-12">

// Line 23  
- <h2 className="text-3xl font-semibold">
+ <h2 className="text-4xl font-semibold tracking-tight">
```

---

#### 🎨 Option 2: Bold

**Changes:**
- Adopt their spacing scale fully
- Add surface color variant
- Restructure heading hierarchy

**Pros:**
- Significant visual upgrade
- Feels more modern/polished
- Closer to inspiration aesthetic

**Cons:**
- Need to add new color to theme
- More testing required
- Might feel less "Beauty Shop"

**Code:**
```tsx
// Add to tailwind.config.js
surface: {
  light: '#F7F9FC'
}

// Line 15
- <section className="py-12 px-4 bg-background">
+ <section className="py-24 px-4 sm:px-8 lg:px-16 bg-surface-light">

// Line 23
- <h2 className="text-3xl font-semibold">
+ <h2 className="text-5xl font-semibold tracking-tight">
```

---

#### 🚀 Option 3: Full Reimagination

**Changes:**
- Complete layout restructure
- Asymmetric grid like inspiration
- New component organization

**Pros:**
- Maximum impact
- Fresh, modern feel
- Closest to inspiration

**Cons:**
- High effort (component refactor)
- Needs thorough testing
- Risk of breaking existing integrations

**Code:**
```tsx
// Requires restructuring - see detailed implementation guide
```

---

### 📊 Recommendation

**Suggested:** Option 1 (Conservative)

**Why:**
- Quick win with measurable improvement
- Maintains brand consistency
- Low risk of regressions
- Can iterate to Option 2 later if desired

**Next Steps:**
1. Apply Option 1 changes
2. Run `/design-review {{file_path}}`
3. If score improves significantly, done
4. If want more impact, try Option 2 elements

---

### ⚠️ Brand Constraints Validated

**Colors:**
- ✅ No conflicts with primary/accent
- ⚠️ Option 2 adds new surface color (needs approval)

**Spacing:**
- ✅ All options fit 8px scale
- ✅ Consistent with other sections

**Typography:**
- ✅ Compatible with Inter
- ✅ Hierarchy maintained

**Brand Feel:**
- ✅ Option 1: Still feels Beauty Shop
- ⚠️ Option 2: More modern, less warm
- ⚠️ Option 3: Significant departure

---

### 📸 Visual Comparison (Optional)

If dev server running:

**Before:**
- Current component screenshot

**Predicted After (Option 1):**
- Apply changes → Screenshot → Show difference

---

## Example Session

```
You: /design-adapt-inspiration

URL: https://linear.app
Pattern: Card design and spacing
Target: src/components/TestimonialCard.tsx
Goal: Make testimonials feel more polished like Linear's issue cards

Cursor:

📸 Capturing Linear.app with Playwright...
✅ Screenshot saved: inspiration-linear-2025-01-21.png

🔍 Analyzing card design patterns...

EXTRACTED PATTERNS:

Card Structure:
- Padding: 24px (p-6)
- Gap between elements: 12px (gap-3)
- Border: 1px solid rgba(0,0,0,0.06)
- Border radius: 8px (rounded-lg)
- Shadow: Subtle - 0 1px 3px rgba(0,0,0,0.04)
- Background: White with hover state

Spacing Hierarchy:
- Title → Description: 8px
- Description → Meta: 12px
- Card → Card: 16px

Typography:
- Title: 16px medium (text-base font-medium)
- Description: 14px regular (text-sm)
- Meta: 12px regular (text-xs)

Key Insight:
Their cards feel polished because of:
1. Generous internal padding (24px vs our 16px)
2. Subtle border (not shadow-heavy)
3. Hover state adds slight shadow elevation
4. Consistent 8/12px gaps create rhythm

---

🎯 YOUR COMPONENT ANALYSIS

File: src/components/TestimonialCard.tsx
Current:
- Padding: p-4 (16px) - feels tight
- Shadow: shadow-md - too heavy
- Gap: gap-2 (8px) - inconsistent
- Border: none

Opportunities:
- Increase padding to 24px
- Replace heavy shadow with subtle border + light shadow
- Make gaps consistent (12px)
- Add hover state

---

🔀 ADAPTATION OPTIONS

✅ OPTION 1: CONSERVATIVE (Recommended)

Changes:
- Padding: p-4 → p-6
- Shadow: shadow-md → shadow-sm
- Gap: gap-2 → gap-3
- Add: border border-gray-200

Code:
```tsx
- <div className="p-4 shadow-md gap-2">
+ <div className="p-6 border border-gray-200 shadow-sm gap-3 
+              hover:shadow-md transition-shadow duration-200">
```

Pros: Quick, low-risk, measurable improvement
Cons: Not quite as polished as Linear

---

🎨 OPTION 2: BOLD

Changes:
- Full padding + border adoption
- Add subtle background color
- Refine typography sizing
- Enhanced hover state

Code:
```tsx
- <div className="p-4 shadow-md bg-white">
+ <div className="p-6 border border-gray-200/60 shadow-sm 
+              bg-gray-50/30 rounded-lg
+              hover:bg-white hover:shadow-md hover:border-gray-300/60
+              transition-all duration-200">
```

Pros: Closer to Linear polish, modern feel
Cons: New background color, more complex hover

---

📊 RECOMMENDATION: Option 1

Why:
- Gets 80% of Linear's polish with 20% effort
- Maintains Beauty Shop aesthetic
- Low risk, high impact
- Can iterate later if needed

Next Steps:
1. Apply Option 1
2. Screenshot before/after
3. If feels good, done!
4. If want more polish, try Option 2 hover state

Try it? [yes/no]
```

## Tips for Best Results

### Be Specific with Pattern Focus
- ❌ "Make it look like Linear"
- ✅ "Extract Linear's card spacing and subtle borders"

### Choose Right Inspiration
- Sites with similar purpose (SaaS, e-commerce, content)
- Modern, well-designed sites
- Sites you actually like (not just popular)

### Consider Brand Fit
- Premium beauty ≠ corporate SaaS
- Adapt patterns, not copy wholesale
- Keep Beauty Shop warm, elegant aesthetic

### Start Conservative
- Try Option 1 first
- See impact
- Iterate if needed
- Avoid over-engineering

## Checklist

- [ ] Inspiration URL accessible
- [ ] Clear pattern focus identified
- [ ] Target component/file specified
- [ ] Desired outcome articulated
- [ ] Playwright MCP enabled
- [ ] `.design-standards.md` reviewed for constraints
- [ ] Ready to see 3 adaptation options
- [ ] Prepared to choose and implement option

## Related Commands

After adaptation:
- `/design-review` - Verify improvement
- `/design-optimize` - Further polish
- `/design-consistency-fix` - Ensure brand consistency


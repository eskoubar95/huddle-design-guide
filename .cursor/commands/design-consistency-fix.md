# Design Consistency Fix

Fix design inconsistencies with visual verification using Playwright MCP.

## Objective
Standardize colors, spacing, shadows, and border radius across codebase to follow documented design system with visual before/after verification.

## Context
- Reference `.design-standards.md` (run `/design-audit` first if missing)
- **Uses Playwright MCP** with AI visual analysis for before/after comparison
- Update code → verify visually → iterate until perfect
- Follow `.cursor/rules/10-nextjs_frontend.mdc`

## Prerequisites
- [ ] `.design-standards.md` exists and is complete
- [ ] Dev server running: `npm run dev`
- [ ] Playwright MCP configured
- [ ] Inconsistencies report from `/design-audit` available

## Process

### Phase 1: Baseline Screenshots (Playwright MCP)

Before making ANY code changes:

**Capture current state:**
- Screenshot all components being modified
- Desktop (1440px) + mobile (375px)
- Save to `.design/screenshots/before/`

**Components to capture:**
- Hero section
- Step cards
- Product cards
- Any other affected components

**Purpose:** Ensure we can detect any visual regressions

### Phase 2: Update Theme Configuration

#### 1. Color Tokens (✅ Allerede implementeret)

**Status:** Color tokens er allerede tilføjet til `tailwind.config.js` baseret på godkendt palette fra `color-palette-final.md`.

**Godkendte tokens:**
- Primary: DEFAULT, dark, darker, light, darkest
- Accent: DEFAULT (#f1433a), dark, light
- Background: DEFAULT (#eef1f2), light, lighter, white, dark, darker
- Border: DEFAULT, light, lighter, dark, accent, primary
- Text: primary, secondary, tertiary, muted, accent, white, inverse
- Image: placeholder, border

**Næste skridt:** Opdater komponenter til at bruge disse tokens i stedet for hardcoded hex values.

#### 2. Add Shadow Tokens

Add to `tailwind.config.js` theme.extend:

```javascript
boxShadow: {
  'hero': '0 28px 70px rgba(5, 21, 55, 0.18)',
  'card-lg': '0 22px 60px rgba(5, 21, 55, 0.08)',
  'card-base': '0 15px 30px -12px rgba(0, 0, 0, 0.1), 0 4px 12px -8px rgba(0, 0, 0, 0.1)',
  // Keep existing shadows
}
```

#### 3. Verify Spacing/Border Radius

Check that existing scales match standards:
- Spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px (8px base)
- Border radius: 2px (soft), 4px (base), 8px (rounded), 16px (large)

### Phase 3: Update Components

#### Fix Priority Order
1. 🔴 Critical issues (breaks patterns)
2. 🟡 Medium issues (off standard)
3. 🟢 Low priority (enhancements)

#### Common Fixes

**Replace hardcoded colors (Godkendt palette):**
```tsx
// ❌ Before
<div className="bg-[#08152D] text-white">
<p className="text-[#0B2142]">
<div className="border-[#DFE3EC]">
<div className="bg-[#F2542D]">  // Gammel accent
<div className="bg-[#efeeec]">  // Gammel background

// ✅ After (Godkendt palette fra color-palette-final.md)
<div className="bg-primary-darker text-white">
<p className="text-primary-light">
<div className="border-border">
<div className="bg-accent">  // Ny accent: #f1433a
<div className="bg-background">  // Ny background: #eef1f2
```

**Replace custom shadows:**
```tsx
// ❌ Before
<div className="shadow-[0_28px_70px_rgba(5,21,55,0.18)]">
<article className="shadow-[0_22px_60px_rgba(5,21,55,0.08)]">

// ✅ After
<div className="shadow-hero">
<article className="shadow-card-lg">
```

**Fix off-scale spacing:**
```tsx
// ❌ Before
<div className="px-10 py-7">

// ✅ After
<div className="px-8 py-8">
```

**Standardize border radius:**
```tsx
// ❌ Before
<Card className="rounded-none">
<div className="rounded-md">  {/* 6px - not in scale */}

// ✅ After
<Card className="rounded-lg">   {/* 16px - large cards */}
<div className="rounded">        {/* 8px - standard */}
```

### Phase 4: Visual Verification (Playwright MCP)

After each batch of changes:

**1. Rebuild and refresh:**
```bash
# If needed
npm run build
```

**2. Capture new state:**
- Playwright: Screenshot same components
- Same viewports (1440px + 375px)
- Save to `.design/screenshots/after/`

**3. Side-by-side comparison:**
- Open before/after screenshots
- Use AI visual analysis to compare differences
- Check for visual regressions

**4. Verification checklist:**
- [ ] Spacing visually identical (±2px acceptable)
- [ ] Colors visually identical
- [ ] Shadows maintain visual quality
- [ ] Border radius looks correct
- [ ] Hover states still work
- [ ] Mobile responsive behavior intact
- [ ] No layout shifts
- [ ] No text overflow
- [ ] No alignment issues

### Phase 5: Iterate if Needed

If visual regressions found:
1. Identify the problematic change
2. Adjust code
3. Re-screenshot
4. Compare again
5. Repeat until perfect

## Scope

Fix these categories:

### 1. Colors
**Target:** All hardcoded hex values

**Files likely affected:**
- `src/modules/home/components/hero/index.tsx`
- `src/modules/home/components/step-cards/step-card.tsx`
- `src/modules/home/components/product-cards/product-card.tsx`
- `src/components/ui/button.tsx`

**Changes (Godkendt palette):**
- Replace `bg-[#08152D]` → `bg-primary-darker`
- Replace `text-[#0B2142]` → `text-primary-light`
- Replace `border-[#DFE3EC]` → `border-border` eller `border-border-light`
- Replace `bg-[#F2542D]` → `bg-accent` (ny accent: #f1433a)
- Replace `bg-[#efeeec]` → `bg-background` (ny background: #eef1f2)
- Replace `bg-[#fafaf8]` → `bg-background-light` (ny: #f5f7f8)
- Replace `bg-[#F7F9FC]` → `bg-background-lighter` (ny: #fafbfc)
- Replace `bg-[#E9EDF5]` → `bg-image-placeholder` (ny: #e3e6e8)
- Replace `border-[#D5DAE5]` → `border-border-lighter`
- Replace `border-[#E6E2DA]` → `border-border-light`

### 2. Shadows
**Target:** All custom shadow-[...] values

**Changes:**
- Replace hero shadow → `shadow-hero`
- Replace product card shadow → `shadow-card-lg`
- Replace step card shadow → `shadow-card-base`

### 3. Spacing
**Target:** Off-scale padding/margin values

**Changes:**
- Replace `px-10` → `px-8`
- Replace `py-7` → `py-8` or `py-6`
- Replace `gap-5` → `gap-4` or `gap-6`

### 4. Border Radius
**Target:** Inconsistent or off-scale radius

**Changes:**
- Cards: Use `rounded-lg` (16px)
- Buttons: Use `rounded` (8px)
- Remove `rounded-none` unless intentional
- Replace `rounded-md` (6px) → `rounded` (8px)

## Testing

### Automated Checks
```bash
# Type check
npm run type-check

# Lint
npm run lint

# Tests
npm run test

# Build
npm run build
```

### Manual Verification
- [ ] Navigate through homepage
- [ ] Check all updated components render correctly
- [ ] Test hover states on buttons/cards
- [ ] Verify mobile responsive behavior
- [ ] Check no console errors
- [ ] Lighthouse audit (should not regress)

### Visual Regression Testing
- [ ] Before/after screenshots compared
- [ ] No unintended visual changes
- [ ] Spacing preserved
- [ ] Colors accurate
- [ ] Shadows maintained

## Deliverables

### 1. Updated Theme Configuration
- `tailwind.config.js` with new color and shadow tokens
- Documented in commit message

### 2. Updated Components
- All hardcoded values replaced with theme tokens
- List of files changed

### 3. Visual Comparison Report
```
.design/screenshots/
  ├── before/
  │   ├── desktop-hero.png
  │   ├── desktop-cards.png
  │   ├── mobile-hero.png
  │   └── mobile-cards.png
  └── after/
      ├── desktop-hero.png
      ├── desktop-cards.png
      ├── mobile-hero.png
      └── mobile-cards.png
```

### 4. Change Summary
Document what was changed:
- Number of files updated
- Number of hardcoded values replaced
- Visual regression status (none/fixed)
- Any issues encountered

## Output Format

### Summary
Brief overview of fixes applied.

### Changes Made

#### Theme Configuration
- Colors added: [list]
- Shadows added: [list]

#### Component Updates
For each file:
- File path
- Changes made (before → after)
- Line numbers

#### Visual Verification
- ✅ No visual regressions detected
- Or: ⚠️ Issues found and fixed (describe)

### Before/After Comparison
- Screenshots location
- Key differences noted
- Confirmation of visual parity

### Testing Results
- Type check: ✅/❌
- Lint: ✅/❌
- Tests: ✅/❌
- Build: ✅/❌
- Visual regression: ✅/❌

## Checklist

- [ ] `.design-standards.md` reviewed
- [ ] Before screenshots captured (all affected components)
- [ ] `tailwind.config.js` updated with new tokens
- [ ] All hardcoded hex colors replaced
- [ ] All custom shadow values tokenized
- [ ] Spacing follows 8px scale
- [ ] Border radius uses theme tokens
- [ ] After screenshots captured
- [ ] Visual comparison completed (no regressions)
- [ ] Type check passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Manual testing completed
- [ ] Changes documented

## Common Pitfalls

### Issue: Visual regression after replacing shadow
**Cause:** Shadow token doesn't match custom shadow exactly
**Fix:** Adjust token in tailwind.config.js to match visual appearance

### Issue: Color looks different after replacing hex
**Cause:** Opacity or color value slightly off
**Fix:** Double-check hex values in theme match original

### Issue: Spacing feels different
**Cause:** Rounding px-10 (40px) to px-8 (32px) changes layout
**Fix:** May need to adjust to px-12 (48px) instead to maintain feel

### Issue: Playwright screenshots don't match reality
**Cause:** Cached styles or build not updated
**Fix:** Clear browser cache, rebuild app, hard refresh


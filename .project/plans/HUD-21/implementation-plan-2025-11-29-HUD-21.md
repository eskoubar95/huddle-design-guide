# Dashboard Layout Optimization Implementation Plan

## Overview
Optimize the main dashboard layout (`apps/web/app/(dashboard)/page.tsx`) to move away from a monotonous, uniform spacing structure. We will introduce varied spacing, size hierarchy, and refined component styles inspired by Sorare and our new "Dark Mode Default" design system.

## Linear Issue
**Issue:** HUD-21
**Title:** [Feature] Dashboard Layout Optimering - Varierende Spacing & Visual Hierarchy

## Current State Analysis
- **Layout:** `apps/web/app/(dashboard)/page.tsx` uses uniform `space-y-16`.
- **Hero:** `HeroSpotlight.tsx` has standard padding and size.
- **Stats:** `ActivitySnapshot.tsx` uses large padding (`p-8`) and massive text (`text-5xl`), taking up too much vertical space relative to its importance.
- **Navigation:** Header is hardcoded in `page.tsx` instead of being a shared layout component.

### Key Discoveries:
- `page.tsx` currently contains the Header. This should be moved to `layout.tsx` to be consistent across dashboard pages (HUD-21 doesn't explicitly ask for this, but it's good practice. However, to stick strictly to the scope of "Layout Optimization" of the *page content*, we will focus on the `main` content area first, but align it with the new TopNav design).
- `HeroSpotlight` uses standard padding. We need `min-h-[500px]` and larger padding (`p-12 md:p-20`).
- `ActivitySnapshot` needs to be more compact (`p-6`, `text-4xl`).

## Desired End State
- **Dynamic Spacing:** Sections grouped logically (e.g., Hero + Stats closer, lists further).
- **Visual Hierarchy:** Hero section dominates; stats are secondary but clear; lists are tertiary.
- **Responsive:** Layout adapts gracefully to mobile.
- **Consistency:** Uses new Shadcn/Tailwind tokens from HUD-20.

## What We're NOT Doing
- We are NOT rewriting the underlying logic of `MarketplaceForYou` or `CommunityPreview` (just container styling if needed).
- We are NOT changing the data fetching logic (Server Actions / Supabase calls remain).

## Implementation Approach
1.  **Refactor `page.tsx` Structure:** Remove `space-y-16` and use explicit margins/gaps for better control.
2.  **Update `HeroSpotlight`:** Increase minimum height and padding.
3.  **Update `ActivitySnapshot`:** Reduce padding and text size for a denser information display.
4.  **Global Layout:** Ensure the dashboard layout container handles the new Top Navigation correctly (if we decide to move it).

## Phase 1: Component Updates (Hero & Stats)

### Overview
Optimize the individual key components to support the new visual hierarchy.

### Changes Required:

#### 1. `HeroSpotlight.tsx`
**File:** `apps/web/components/home/HeroSpotlight.tsx`
**Changes:**
- Add `min-h-[500px]`.
- Increase padding to `p-12 md:p-20`.
- Ensure background gradients scale correctly.

#### 2. `ActivitySnapshot.tsx`
**File:** `apps/web/components/home/ActivitySnapshot.tsx`
**Changes:**
- Reduce card padding from `p-8` to `p-6`.
- Reduce value text from `text-5xl` to `text-4xl`.
- Make the container more compact.

### Success Criteria:
- [ ] Hero section commands attention (is significantly larger).
- [ ] Stats strip is slim and information-dense.

## Phase 2: Dashboard Page Layout Refactor

### Overview
Reassemble the dashboard page with varied spacing.

### Changes Required:

#### 1. `page.tsx`
**File:** `apps/web/app/(dashboard)/page.tsx`
**Changes:**
- Remove `space-y-16`.
- Group `HeroSpotlight` and `ActivitySnapshot` closer together (e.g., `gap-6`).
- Add larger separation before `QuickActions` and `MarketplaceForYou` (e.g., `mt-12` or `mt-16`).
- Use `max-w-7xl` consistently.
- **Note:** We will also implement the new "Top Navigation" design directly here if it's not moved to layout yet, to match the Style Guide.

### Success Criteria:
- [ ] Layout feels dynamic (not a list of equal boxes).
- [ ] Mobile view stacks correctly with appropriate spacing (smaller gaps).

## Testing Strategy
- **Visual Inspection:** Verify against Sorare inspiration/Style Guide aesthetics.
- **Responsive Check:** Toggle device toolbar to check mobile/tablet breakpoints.


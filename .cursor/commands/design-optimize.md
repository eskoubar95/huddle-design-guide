# Design Optimize

Iterative visual optimization using Playwright feedback loop.

## Objective
Improve design quality through iterative cycles of adjust → screenshot → analyze → refine using Playwright MCP with AI visual analysis.

## Context
- Premium beauty brand aesthetic (spacious, elegant, polished)
- **Uses Playwright MCP** with AI-powered visual analysis at every iteration
- Reference `.design-standards.md` for constraints
- Compare with best-in-class components and industry inspiration
- Iterate until design reaches 9/10 or meets goal

## Prerequisites
- [ ] `.design-standards.md` exists
- [ ] Dev server running: `npm run dev`
- [ ] Playwright MCP configured
- [ ] Clear goal for what "optimized" means

## Target

Define optimization target:
- [ ] Component: `{{component_name}}` (e.g., TestimonialSection, ProductCard)
- [ ] Route: `{{url_path}}` (if page-level optimization)
- [ ] Current issue: `{{what_feels_off}}` (cramped, unbalanced, hierarchy unclear, etc.)
- [ ] Goal: `{{desired_improvement}}` (more premium feel, better hierarchy, clearer CTA, etc.)
- [ ] Success metric: Visual score X/10 or specific aesthetic goal

## Iterative Optimization Process

### Iteration 1: Baseline Analysis

**Step 1: Capture current state**
```
Playwright: Navigate to component/page
Screenshot: Desktop (1440px) + Mobile (375px)
Save as: iteration-1-desktop.png, iteration-1-mobile.png
Location: .design/screenshots/optimization/{{component}}/
```

**Step 2: AI visual analysis**

Analyze screenshot for:
- What feels off? (cramped, unbalanced, cluttered?)
- Where does hierarchy break down?
- What spacing needs adjustment?
- Which elements compete for attention?
- Does it feel premium/polished?

**Step 3: Compare with reference**

Optional but recommended:
```
Playwright: Screenshot best component (Hero, ProductCard, etc.)
AI Analysis: Side-by-side comparison
- What does reference do better?
- What specific patterns to adopt?
```

**Step 4: Generate changes**

Based on visual analysis, propose:
- Specific Tailwind class changes
- File and line numbers
- Reasoning from visual perspective

**Step 5: Predict impact**
- What will improve?
- Any risks of making it worse?
- Estimated score after changes: X/10

### Iteration 2: Apply & Verify

**Step 1: Apply changes**
- Modify code with proposed Tailwind classes
- Save file

**Step 2: Capture new state**
```
Playwright: Refresh and screenshot
Save as: iteration-2-desktop.png, iteration-2-mobile.png
```

**Step 3: Side-by-side comparison**
```
AI Analysis: Compare iteration-1 vs iteration-2
- Did spacing improve? (measure visually)
- Hierarchy clearer? (easier to scan)
- More balanced? (visual weight distributed)
- Any regressions? (things that got worse)
```

**Step 4: Decision**
- ✅ Keep changes if improved
- ⚠️ Adjust if partially improved
- ❌ Revert if regressed

**Step 5: Score**
- Rate improvement: X/10
- If < 9/10, continue to Iteration 3

### Iteration 3+: Refine

Repeat the cycle:
1. Analyze current state
2. Identify remaining issues
3. Propose targeted fixes
4. Apply changes
5. Screenshot
6. Compare
7. Evaluate

**Continue until:**
- Visual quality reaches 9/10 (or target score)
- Meets aesthetic goal
- No obvious issues remain
- Further changes would be diminishing returns

**Maximum iterations:** 5
(If not improved by iteration 5, may need different approach)

## Optimization Areas

### A. Spacing & Breathing Room

**Section padding:**
- Too tight? Increase py-16 → py-20 or py-24
- Inconsistent? Standardize to pattern
- Mobile: Ensure py-12 or py-16 on mobile

**Element gaps:**
- Too close? Increase gap-6 → gap-8 or gap-12
- Uneven? Make consistent
- Strategic whitespace: Add space around key elements (CTA, images)

**Container:**
- Content hitting edges? Ensure px-4 sm:px-8 lg:px-16
- Too narrow? Check max-w-[1440px]

**Premium feel:**
- When in doubt, add space
- Beauty brands use generous whitespace
- Reference: Aesop, Glossier spacing

### B. Typography & Hierarchy

**Heading sizes:**
- Hierarchy unclear? Increase size jumps
- Too similar? Make H1 larger or H2 smaller
- Mobile: Reduce responsively but keep hierarchy

**Line height:**
- Too tight? Use leading-relaxed for body
- Too loose? Use leading-tight for headings

**Letter spacing:**
- Headings: Try tracking-tight or tracking-[-0.04em]
- Labels: Use tracking-[0.22em] for uppercase
- Body: Leave normal (don't adjust)

**Visual hierarchy test:**
- Can you scan page in 3 seconds and understand structure?
- Is most important content obvious?
- Does eye flow naturally?

### C. Visual Balance

**Weight distribution:**
- One side heavy? Adjust image sizes, text length
- Bottom heavy? Redistribute elements
- Top heavy? Add content or reduce header

**Alignment:**
- Elements feel off? Check alignment (left, center, right)
- Grid: Ensure consistent columns
- Baseline: Align text baselines if side-by-side

**Negative space:**
- Too busy? Remove non-essential elements
- Too empty? Add subtle background, texture
- Strategic: Use space to guide eye

### D. Color & Contrast

**Color usage:**
- Too much accent? Use sparingly (only CTAs, highlights)
- Too monotone? Add subtle accent touches
- Text contrast: Ensure 4.5:1 for body, 3:1 for large

**Opacity hierarchy:**
- Primary: /100 for headings
- Secondary: /80 for body
- Tertiary: /75 for descriptions
- Muted: /60 for labels

### E. Component Quality

**Shadows:**
- Too harsh? Use lighter shadow
- Too subtle? Increase depth
- Hover: Combine with lift for elegance

**Border radius:**
- Too sharp? Increase from rounded → rounded-lg
- Inconsistent? Standardize to theme scale

**Hover states:**
- Missing? Add hover:-translate-y-1 + shadow
- Too aggressive? Reduce to hover:-translate-y-0.5
- Ensure duration-200 for smooth transition

### F. Responsive Optimization

**Mobile (375px):**
- Text too large? Reduce with responsive classes
- Touch targets: Ensure min 44x44px
- Stacking: Verify columns stack properly

**Tablet (768px):**
- Layout transition graceful?
- No awkward in-between states?

## Inspiration Analysis (Optional)

If seeking aesthetic guidance:

**Step 1: Choose reference**
- Industry leader: Linear.app, Notion.so, Stripe.com
- Beauty brand: Aesop.com, Glossier.com, Fenty.com
- Similar component: Find page with similar structure

**Step 2: Capture inspiration**
```
Playwright: Navigate to reference site
Screenshot: Relevant section
```

**Step 3: Extract patterns**

AI visual analysis:
- How do they use spacing? (measure section padding, gaps)
- Typography scale: What size ratios? (H1 to body)
- Shadow approach: Subtle elevation or flat?
- Border radius: Sharp or rounded?
- What creates "premium feel"? (space, typography, simplicity?)

**Step 4: Adapt (don't copy)**
- Take patterns, not pixels
- Apply to Beauty Shop brand
- Maintain consistency with existing components

**Example insights:**
- Linear: 128px section padding creates spaciousness
- Aesop: Generous line-height (1.6-1.8) aids readability
- Notion: Subtle shadows (0-10px) vs. heavy shadows

## Deliverables

### 1. Screenshot Progression

Save all iterations:
```
.design/screenshots/optimization/{{component}}/
  ├── iteration-1-desktop.png
  ├── iteration-1-mobile.png
  ├── iteration-2-desktop.png
  ├── iteration-2-mobile.png
  ├── iteration-3-desktop.png
  ├── iteration-3-mobile.png
  └── final-comparison.png (side-by-side)
```

Purpose: Shows visual evolution and improvement

### 2. Optimization Log

Document each iteration:

```markdown
## Optimization Log: {{component}}

### Goal
{{desired_improvement}}

### Iteration 1: Baseline
- Score: X/10
- Issues: [list]
- Changes proposed: [Tailwind classes]

### Iteration 2: First Pass
- Changes applied: [specifics]
- Score: X/10 (improvement: +Y)
- Visual impact: [what improved]
- Remaining issues: [list]

### Iteration 3: Refinement
- Changes applied: [specifics]
- Score: X/10 (improvement: +Y)
- Visual impact: [what improved]

### Final Result
- Score: X/10 (total improvement: +Y)
- Goal achieved: ✅/❌
- Key changes: [summary]
```

### 3. Final Code Changes

List all Tailwind class modifications:

```markdown
## Final Changes

### File: src/components/TestimonialSection.tsx

Line 15:
- Before: py-12 px-4
- After: py-20 px-4 sm:px-8 lg:py-24 lg:px-16
- Why: Increased section padding for premium feel

Line 23:
- Before: gap-6
- After: gap-12
- Why: More breathing room between testimonials

Line 31:
- Before: text-3xl
- After: text-4xl sm:text-5xl
- Why: Stronger heading hierarchy
```

### 4. Visual Comparison

Side-by-side before/after:
- Iteration 1 (baseline) vs. Final
- Clear improvement visible
- Annotate key changes

## Output Format

### Optimization Summary

**Target:** {{component}} on {{route}}
**Goal:** {{desired_improvement}}
**Iterations:** X
**Time:** Y iterations to reach goal

### Iteration Breakdown

**Iteration 1: Baseline**
- Screenshot: [reference]
- Visual analysis: [issues identified]
- Proposed changes: [Tailwind modifications]
- Predicted score: X/10

**Iteration 2: Apply Changes**
- Changes applied: [specifics]
- Screenshot: [reference]
- Visual comparison: [what improved, what didn't]
- Actual score: X/10
- Decision: Keep/Adjust/Revert

[Repeat for each iteration]

### Final Result

**Before vs. After:**
- Visual quality: X/10 → Y/10 (improvement: +Z)
- Goal achieved: ✅ {{goal_description}}

**Key Improvements:**
- Improvement 1: [specific visual enhancement]
- Improvement 2: [specific visual enhancement]

**Code Changes:**
- X files modified
- Y Tailwind classes changed
- List of changes with reasoning

**Screenshots:**
- Baseline: [reference]
- Final: [reference]
- Side-by-side: [reference]

### Aesthetic Assessment

**Premium Feel:** Improved/Maintained/Needs Work
**Visual Balance:** Improved/Maintained/Needs Work
**Hierarchy:** Clearer/Same/Less Clear
**Spacing:** More Generous/Same/Tighter
**Overall Polish:** Higher/Same/Lower

### Recommendations

**If score < 9/10:**
- Remaining issues: [list]
- Suggest: Additional optimization pass
- Or: May need design review or structural changes

**If score ≥ 9/10:**
- Ready for production
- Consider: Document patterns for reuse
- Update: `.design-standards.md` if new patterns

## Checklist

- [ ] Goal clearly defined
- [ ] Baseline screenshots captured (iteration 1)
- [ ] Visual analysis completed
- [ ] At least 2 iterations performed
- [ ] Visual improvement measurable
- [ ] Screenshots show progression
- [ ] Code changes documented
- [ ] Final score meets goal (or close)
- [ ] Responsive behavior verified (mobile)
- [ ] No functional regressions
- [ ] Inspiration analyzed (if applicable)

## Tips for Success

### When to Stop
- Score reaches 9/10
- Goal achieved
- Further changes have minimal impact
- Diminishing returns (iteration 4-5)

### When to Try Different Approach
- Score not improving after 3 iterations
- Changes make things worse
- Structural issues (not fixable with Tailwind alone)
- May need component refactor

### How to Maximize Improvement
- Start with biggest issues (spacing usually highest impact)
- Make one type of change per iteration (spacing, then typography, then colors)
- Reference best components frequently
- Trust visual analysis over code
- Premium = space + simplicity

### Common High-Impact Changes
- Increase section padding (py-16 → py-24)
- Increase element gaps (gap-6 → gap-12)
- Increase heading sizes for hierarchy
- Add strategic whitespace around CTAs
- Simplify (remove non-essential elements)

## Example Session

```
You: /design-optimize TestimonialSection - feels cramped

Cursor:

🎯 GOAL: Make TestimonialSection feel more spacious and premium

📸 ITERATION 1: BASELINE

Playwright: Captured http://localhost:3000/#testimonials
- Desktop: 1440px
- Mobile: 375px
Saved: .design/screenshots/optimization/testimonial-section/

🔍 Visual Analysis:
❌ Section padding: py-12 (48px) feels tight
❌ Gap between testimonials: gap-4 (16px) too close
❌ Heading: text-3xl not strong enough for hero
⚠️ Mobile: Adequate but could use more space

Score: 5/10 (cramped, not premium feel)

💡 Proposed Changes:
1. Section: py-12 → py-20 lg:py-24
2. Gap: gap-4 → gap-8 lg:gap-12
3. Heading: text-3xl → text-4xl sm:text-5xl

Predicted impact: 7/10

Apply changes? [yes]

🔨 ITERATION 2: APPLYING CHANGES

Changes applied:
- File: src/components/TestimonialSection.tsx
- Line 10: py-12 → py-20 lg:py-24
- Line 18: gap-4 → gap-8 lg:gap-12
- Line 25: text-3xl → text-4xl sm:text-5xl

📸 Capturing new state...
Saved: iteration-2-desktop.png, iteration-2-mobile.png

🔍 Side-by-side Comparison:
✅ Section padding: Much better, no longer cramped
✅ Testimonial gaps: Improved breathing room
✅ Heading: Clearer hierarchy
⚠️ Still: Could use slightly more gap on desktop

Score: 7.5/10 (good improvement, small refinement needed)

Decision: ✅ Keep changes, apply refinement

💡 Refinement:
- Desktop gap could be gap-12 (48px) instead of gap-8
- Line 18: gap-8 lg:gap-12 → gap-8 lg:gap-16

Apply refinement? [yes]

🔨 ITERATION 3: REFINEMENT

Change applied: gap-8 lg:gap-12 → gap-8 lg:gap-16

📸 Capturing final state...
Saved: iteration-3-desktop.png, iteration-3-mobile.png

🔍 Final Comparison:
✅ Desktop: Perfect breathing room, feels premium
✅ Mobile: Comfortable spacing maintained
✅ Visual balance: Much improved

Score: 9/10 🎉

✅ GOAL ACHIEVED

Summary:
- Iterations: 3
- Score improvement: 5/10 → 9/10 (+4 points)
- Key changes:
  1. Section padding: +66% (48px → 80px desktop)
  2. Element gaps: +100% (16px → 32-64px)
  3. Heading size: +33% (30px → 40-48px)

Visual impact:
- Feels significantly more spacious
- Premium aesthetic achieved
- Hierarchy much clearer

Files modified: 1
- src/components/TestimonialSection.tsx (3 lines)

Screenshots saved:
- .design/screenshots/optimization/testimonial-section/
- iteration-1, iteration-2, iteration-3
- final-comparison.png (before/after)

Ready for production ✅
```


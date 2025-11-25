# Design Review

Visual + code review using Playwright screenshots and AI visual analysis.

## Objective
Review component or page against Beauty Shop design standards using live rendered screenshots for visual analysis.

## Context
- **Uses Playwright MCP** with AI-powered visual analysis
- Reference `.design-standards.md` for comparison
- Compare with best-in-class components (Hero, ProductCard, StorytellingSection)
- Focus on "premium beauty brand" aesthetic

## Prerequisites
- [ ] `.design-standards.md` exists (run `/design-audit` if missing)
- [ ] Dev server running: `npm run dev`
- [ ] Playwright MCP configured
- [ ] Component/page to review is built and accessible

## Review Target

Define what to review:
- [ ] Feature: `{{feature_name}}`
- [ ] Route: `{{url_path}}` (e.g., /products, /about)
- [ ] Component: `{{component_path}}` (if specific component)
- [ ] Context: `{{why_reviewing}}` (new feature, polish, bug fix, etc.)

## Process

### Phase 1: Capture (Playwright MCP)

**Navigate to component/page:**
```
Playwright: Navigate to http://localhost:3000{{url_path}}
Wait for: Network idle, images loaded
```

**Screenshot capture:**
- Desktop (1440px width)
- Mobile (375px width)
- Optional: Tablet (768px width) if responsive concerns

**Save screenshots:**
- Descriptive names (e.g., `product-page-desktop.png`)
- Include timestamp or iteration number

**Interactive elements:**
If component has hover states or interactions:
- Capture default state
- Capture hover state (if applicable)
- Capture focus state (for accessibility)

### Phase 2: Visual Analysis

Analyze screenshots using AI vision capabilities:

#### A. Spacing & Layout

**Section Padding:**
- [ ] Does padding feel comfortable? (not cramped, not excessive)
- [ ] Follows pattern: py-16 sm:py-20 lg:py-24?
- [ ] Consistent with similar sections?

**Element Spacing:**
- [ ] Gaps between elements balanced?
- [ ] Follows 8px scale? (16, 24, 32, 48px)
- [ ] Visual breathing room adequate?

**Container:**
- [ ] Max-width appropriate? (should be max-w-[1440px])
- [ ] Horizontal padding: px-4 sm:px-8 lg:px-16?
- [ ] Content centered properly?

**Mobile Spacing:**
- [ ] Padding reduces appropriately on mobile?
- [ ] No cramped sections?
- [ ] Touch targets adequate (min 44x44px)?

#### B. Typography

**Hierarchy:**
- [ ] Heading sizes follow scale? (H1: 40-48px, H2: 48-56px)
- [ ] Visual hierarchy clear? (can scan page easily)
- [ ] Size jumps appropriate? (not too subtle, not jarring)

**Readability:**
- [ ] Line height comfortable? (leading-tight for headings, leading-relaxed for body)
- [ ] Letter spacing appropriate? (tight for headings, normal for body)
- [ ] Text color contrast sufficient? (4.5:1 for body, 3:1 for large text)

**Consistency:**
- [ ] Matches typography in Hero/ProductCard/StorytellingSection?
- [ ] Font weights consistent with brand?

#### C. Colors

**Palette Adherence:**
- [ ] Uses only approved colors from `.design-standards.md`?
- [ ] Primary navy (#051537) used appropriately?
- [ ] Accent orange (#F2542D) used sparingly for emphasis?
- [ ] Background colors harmonious?

**Contrast:**
- [ ] Text readable against backgrounds?
- [ ] No accessibility issues? (check WCAG AA)

**Opacity Hierarchy:**
- [ ] Primary text: /100 or /80?
- [ ] Secondary text: /75?
- [ ] Muted text: /60?

#### D. Components

**Shadows:**
- [ ] Shadows match documented patterns?
- [ ] Depth appropriate for component type?
- [ ] Subtle and elegant (not harsh)?

**Border Radius:**
- [ ] Consistent with theme scale?
- [ ] Cards: rounded-lg (16px)?
- [ ] Buttons: rounded (8px)?

**Alignment:**
- [ ] Elements properly aligned?
- [ ] Grid/columns balanced?
- [ ] No visual awkwardness?

**Visual Balance:**
- [ ] Composition feels balanced?
- [ ] No sections feel "heavy" or "empty"?
- [ ] Whitespace distributed well?

#### E. Responsive Behavior

**Mobile (375px):**
- [ ] Layout adapts gracefully?
- [ ] No horizontal scrolling?
- [ ] Text sizes readable (not too small)?
- [ ] Touch targets adequate?
- [ ] Images scale properly?

**Breakpoint transitions:**
- [ ] sm: (512px) graceful?
- [ ] lg: (1024px) appropriate?
- [ ] No awkward in-between states?

### Phase 3: Compare with Reference

**Capture reference component:**
```
Playwright: Navigate to homepage (reference Hero, ProductCard, etc.)
Screenshot: Best-in-class component
AI Analysis: Side-by-side comparison
```

**Comparison questions:**
- What does the reference component do better?
- What spacing/sizing patterns should we adopt?
- What makes it feel more polished?
- What can we copy (not literally, but pattern-wise)?

**Industry inspiration (optional):**
If comparing aesthetic to other sites:
```
Playwright: Navigate to [Linear.app / Aesop.com / Glossier.com]
Screenshot: Similar component
AI Analysis: Extract patterns (spacing ratios, typography scale, visual hierarchy)
```

### Phase 4: Code Correlation

After visual analysis, find code issues:

**Search for component code:**
- Locate main component file
- Find relevant Tailwind classes
- Identify hardcoded values

**Match visual issues to code:**
For each visual issue:
- Find exact file and line number
- Note current Tailwind classes
- Suggest replacement classes
- Explain why (reference visual analysis)

## Review Checklist

### ✅ Design Standards Compliance

**Colors:**
- [ ] Uses theme tokens (not hardcoded hex)
- [ ] Primary/accent used appropriately
- [ ] Text opacity follows hierarchy
- [ ] Contrast meets WCAG AA

**Spacing:**
- [ ] Section padding follows pattern
- [ ] Container max-width + padding correct
- [ ] Internal gaps follow 8px scale
- [ ] Feels spacious (premium aesthetic)

**Typography:**
- [ ] Heading sizes match hierarchy
- [ ] Tracking appropriate for text type
- [ ] Line height comfortable
- [ ] Font weights consistent

**Components:**
- [ ] Shadows match documented patterns
- [ ] Border radius from theme scale
- [ ] Hover states: subtle lift + transition
- [ ] Responsive breakpoints consistent

**Aesthetic:**
- [ ] Feels premium/polished (not busy)
- [ ] Breathing room between elements
- [ ] Visual hierarchy clear
- [ ] Matches brand (Hero/ProductCard feel)

### ⚠️ Common Issues to Check

**Spacing problems:**
- Sections too tight (py-8 instead of py-16)
- Gaps inconsistent (gap-4 in one place, gap-6 in another)
- Content hitting edges (missing px-4)

**Typography issues:**
- Hierarchy unclear (H2 and H3 too similar)
- Text too small on mobile
- Letter spacing too tight/loose

**Color issues:**
- Hardcoded hex instead of theme
- Poor contrast (accessibility)
- Accent overused (should be sparingly)

**Component issues:**
- Custom shadow instead of token
- Border radius off-scale
- Missing hover states
- Alignment problems

**Responsive issues:**
- Layout breaks on mobile
- Text overflow
- Touch targets too small
- Horizontal scrolling

## Output Format

### 📸 Visual Analysis

**Desktop (1440px):**
- Overall impression: [polished/cramped/unbalanced/etc.]
- Key visual observations

**Mobile (375px):**
- Responsive behavior: [graceful/broken/needs work]
- Mobile-specific observations

### ✅ Visual Strengths
What looks good and should be kept:
- Strength 1
- Strength 2

### ❌ Critical Issues 🔴
Must be fixed (breaks standards or functionality):

1. **Issue description**
   - Visual problem: [describe what looks wrong]
   - Location: `{{file_path}}:{{line}}`
   - Current: `{{current_classes}}`
   - Suggested: `{{suggested_classes}}`
   - Why: [reasoning from visual analysis]

### ⚠️ Important Issues 🟡
Should be fixed (off standard but functional):

1. **Issue description**
   - Visual concern: [describe]
   - Location: `{{file_path}}:{{line}}`
   - Suggested fix: [concrete change]

### 💭 Enhancements 🟢
Nice-to-have improvements:

1. **Enhancement idea**
   - Why: [how it improves visual quality]
   - Example: [similar pattern in reference component]

### 📊 Comparison with Reference

**Compared with:** [Hero / ProductCard / StorytellingSection / Industry site]

**Key patterns to adopt:**
- Pattern 1: [what they do, how to apply]
- Pattern 2: [what they do, how to apply]

**Why it works better:**
- Reasoning based on visual analysis

### 🎯 Score

**Overall Design Quality:** X/10

**Breakdown:**
- Spacing & Layout: X/10
- Typography & Hierarchy: X/10
- Color & Contrast: X/10
- Component Quality: X/10
- Responsive Behavior: X/10
- Aesthetic/Polish: X/10

### 📋 Next Steps

Priority order for fixes:
1. [Most critical fix]
2. [Important fix]
3. [Enhancement]

Recommended commands:
- `/design-optimize` if needs iterative polish
- `/design-consistency-fix` if standards violations
- `/accessibility-audit` if accessibility concerns

## Checklist

- [ ] Dev server running
- [ ] Desktop screenshot captured
- [ ] Mobile screenshot captured
- [ ] Visual analysis completed (spacing, typography, colors, components)
- [ ] Compared with reference component
- [ ] Code locations identified for all issues
- [ ] Concrete Tailwind class changes suggested
- [ ] Responsive behavior evaluated
- [ ] Score assigned with reasoning
- [ ] Next steps clear and actionable

## Example Session

```
You: /design-review About page

Cursor:
📸 Capturing with Playwright...
✅ Desktop (1440px): /about captured
✅ Mobile (375px): /about captured

🔍 Analyzing with Claude Vision...

📸 VISUAL ANALYSIS

Desktop (1440px):
- Overall: Feels cramped, hierarchy unclear
- Hero section: Padding too tight
- Content: Good max-width, but gaps inconsistent

Mobile (375px):
- Layout: Adapts okay
- Text: Some headings too large for mobile
- Spacing: Top/bottom padding needs increase

✅ VISUAL STRENGTHS:
- Color usage is appropriate (navy + accent)
- Images scale well
- Container width correct

❌ CRITICAL ISSUES:

1. Hero section padding too tight
   - Visual: Feels cramped compared to homepage hero
   - File: src/app/about/page.tsx:15
   - Current: py-12
   - Suggested: py-16 sm:py-20 lg:py-24
   - Why: Homepage hero uses py-24, this pattern creates premium feel

2. Inconsistent gaps between content sections
   - Visual: Some sections 24px apart, others 48px
   - File: src/app/about/page.tsx
   - Current: gap-6 in some, gap-12 in others
   - Suggested: gap-12 consistently (48px)
   - Why: StorytellingSection uses consistent gap-12

💭 ENHANCEMENTS:

1. Add more breathing room around CTA button
   - Current feels tight against surrounding content
   - Suggest: mt-8 → mt-12

📊 COMPARISON:
Compared with: Homepage Hero + StorytellingSection

Patterns to adopt:
- Hero spacing: py-24 creates luxury feel
- Section gaps: gap-12 consistently
- Content wrapper: similar structure works well

🎯 SCORE: 6/10

Breakdown:
- Spacing: 4/10 (too tight)
- Typography: 7/10 (good hierarchy)
- Colors: 8/10 (correct usage)
- Components: 7/10 (mostly good)
- Responsive: 7/10 (works but tight on mobile)
- Aesthetic: 6/10 (functional but not premium feel)

📋 NEXT STEPS:
1. Apply spacing fixes (priority: hero padding, consistent gaps)
2. Test on mobile after changes
3. Consider /design-optimize for final polish
```


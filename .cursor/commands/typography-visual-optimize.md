# Typography Visual Optimization

> **Purpose:** Analyser faktiske tekststørrelser på siden via Playwright og optimer baseret på visuel analyse og design principper.

## Objective

1. **Analyser faktiske font sizes** - Ekstraher computed styles for alle tekst elementer
2. **Identificer problemer** - For små, for store, inkonsistent hierarki
3. **Foreslå optimeringer** - Baseret på faktisk visuel analyse
4. **Implementer optimeringer** - Opdater tokens og komponenter

## Analysis Method

### Step 1: Extract Typography Data
```javascript
// Run in browser via Playwright
const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, button, li');

const typographyData = [];
elements.forEach(el => {
  const computed = window.getComputedStyle(el);
  const fontSize = parseFloat(computed.fontSize);
  const fontWeight = computed.fontWeight;
  const lineHeight = computed.lineHeight;
  const letterSpacing = computed.letterSpacing;
  const text = el.textContent?.trim().substring(0, 50) || '';
  const tag = el.tagName.toLowerCase();
  
  if (text && fontSize && computed.display !== 'none') {
    typographyData.push({
      tag,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing,
      text
    });
  }
});

// Group by fontSize
const grouped = {};
typographyData.forEach(item => {
  const key = `${item.fontSize}px`;
  if (!grouped[key]) {
    grouped[key] = { fontSize: item.fontSize, count: 0, tags: new Set(), examples: [] };
  }
  grouped[key].count++;
  grouped[key].tags.add(item.tag);
  if (grouped[key].examples.length < 3) {
    grouped[key].examples.push({ tag: item.tag, text: item.text });
  }
});

return JSON.stringify(Object.values(grouped).sort((a, b) => b.fontSize - a.fontSize), null, 2);
```

### Step 2: Analyze Findings
- **For mange unikke størrelser?** (typisk max 8-12)
- **For små tekststørrelser?** (< 14px er svært at læse)
- **For store tekststørrelser?** (> 60px kan være for meget)
- **Inkonsistent hierarki?** (H1, H2, H3 skal være klart differentieret)
- **Progression problemer?** (inkonsistent ratio mellem niveauer)

### Step 3: Propose Optimizations
Baseret på:
- **WCAG guidelines** - Minimum 16px for body text
- **Modular scale** - Konsistent 1.2-1.5x ratio
- **Visual hierarchy** - Klar forskel mellem niveauer (minimum 20%)
- **Readability** - Optimal line length, line height

### Step 4: Implement Optimizations
1. Opdater Tailwind config tokens
2. Opdater komponenter
3. Test visuelt

## Design Principles Applied

1. **Readability First** - Minimum 16px for body text
2. **Clear Hierarchy** - Minimum 20% forskel mellem niveauer
3. **Consistent Scale** - 1.2-1.5x ratio mellem niveauer
4. **Visual Balance** - Tekst skal være læsbar og æstetisk

## Output Format

### Typography Analysis Report
```markdown
## Actual Font Sizes Found

- 44px: H1 (Hero) - 1 instance
- 36px: H2 (Section) - 3 instances
- 30px: H3 (Product) - 2 instances
- 24px: H3 (Card) - 3 instances
- 17px: Body large - 5 instances
- 16px: Body - 20 instances
- 14px: Small text - 10 instances
- 12px: Tiny text - 5 instances
- 11px: Badge - 2 instances

## Issues Identified

1. **Too many sizes:** 9 unikke størrelser
2. **Small text:** 12px og 11px er for små
3. **Inconsistent progression:** H2 (36px) og H3 (30px) er for tæt (kun 20% forskel)

## Optimizations Proposed

1. **Consolidate H2 and H3:** Brug større forskel (36px → 28px → 20px)
2. **Increase small text:** 12px → 14px minimum
3. **Standardize progression:** Brug 1.2x ratio
```

## Implementation

### Command Usage
```
/typography-visual-optimize @beauty-shop-storefront http://localhost:8000/dk
```

### What It Does
1. Navigerer til URL
2. Ekstraherer computed font sizes for alle tekst elementer
3. Analyserer hierarki, progression, og problemer
4. Foreslår optimeringer baseret på design principper
5. Implementerer optimeringer i Tailwind config og komponenter

### Output Files
- `.design/typography-visual-analysis.md` - Detaljeret analyse
- `.design/typography-optimizations.md` - Foreslåede optimeringer
- `.design/typography-implementation.md` - Implementerings plan

## Success Criteria

✅ **Readable** - Minimum 16px for body text
✅ **Clear hierarchy** - Minimum 20% forskel mellem niveauer
✅ **Consistent scale** - 1.2-1.5x ratio
✅ **Optimized** - Færre unikke størrelser, bedre progression
✅ **Visually tested** - Alle ændringer verificeret visuelt


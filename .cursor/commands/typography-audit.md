# Typography Audit & Optimization

> **Purpose:** Analyser og optimer typography hierarki for at sikre konsistent, forudsigelig og brugervenlig tekststørrelse scale baseret på design principper.

## Objective

1. **Analyser nuværende typography tokens** - Identificer alle font sizes i Tailwind config
2. **Identificer redundanser** - Find unødvendige variationer og overlap
3. **Evaluer hierarki** - Tjek om heading niveauer er klart differentieret
4. **Foreslå optimeret scale** - Baseret på design principper (typisk 1.2-1.5x ratio)
5. **Identificer problemer** - For mange størrelser, inkonsistent progression, etc.
6. **Foreslå løsninger** - Konsolider og simplificer hvor muligt

## Design Principper for Typography

### 1. Modulær Scale (Modular Scale)
- **Anbefalet ratio:** 1.2-1.5x mellem niveauer
- **Eksempel:** 16px → 20px → 24px → 30px → 36px → 44px → 52px
- **Benefit:** Naturlig progression, let at huske

### 2. Klar Hierarki
- **Max 5-6 heading niveauer** (H1-H6, men typisk kun H1-H3 i praksis)
- **Klar forskel mellem niveauer** (minimum 20% forskel)
- **Konsistent brug** - Samme størrelse for samme hierarki niveau

### 3. Responsive Scaling
- **Konsistent progression** - Samme ratio på alle breakpoints
- **Max 2-3 breakpoints** - Mobile, tablet, desktop
- **Forudsigelig** - Samme pattern for alle headings

### 4. Simplicitet
- **Færre størrelser = bedre** - Typisk 8-12 unikke størrelser totalt
- **Genbrug hvor muligt** - Samme størrelse for lignende elementer
- **Dokumenteret** - Klar reference for hvornår hver størrelse bruges

## Analysis Steps

### Step 1: Extract Current Tokens
```bash
# Find alle fontSize tokens i tailwind.config.js
grep -A 50 "fontSize:" tailwind.config.js
```

### Step 2: Map Usage
```bash
# Find hvor hver token bruges
grep -r "text-hero\|text-section\|text-cta\|text-card-title\|text-product-title\|text-price" src/
```

### Step 3: Identify Issues
- **For mange unikke størrelser?** (typisk max 8-12)
- **Overlap mellem tokens?** (f.eks. hero-tablet og product-title-tablet samme størrelse)
- **Inkonsistent progression?** (f.eks. +4px, +6px, +8px - ikke konsistent ratio)
- **Unødvendige variationer?** (f.eks. card-title og product-title kunne være samme)

### Step 4: Propose Optimized Scale

**Eksempel optimeret scale:**
```
Mobile → Tablet → Desktop

H1 (Hero):     30px → 36px → 44px  (1.2x ratio)
H2 (Section):  36px → 44px → 52px  (1.2x ratio)
H2 (CTA):      36px → 44px → 52px  (samme som section?)
H3 (Cards):    24px → 28px → 32px  (1.2x ratio)
Price:         28px → 32px → 36px  (kan være H3 størrelse?)
Body:          16px → 17px → 18px  (minimal scaling)
Body Large:    17px → 18px → 19px
Button:        15px → 15px → 15px  (ingen scaling)
Badge:         11px → 11px → 11px  (ingen scaling)
```

### Step 5: Consolidation Opportunities

**Spørgsmål at stille:**
1. **Er H2 (Section) og H2 (CTA) forskellige nok?** - Hvis ikke, konsolider
2. **Er card-title og product-title forskellige nok?** - Hvis ikke, konsolider
3. **Er price og product-title forskellige nok?** - Hvis ikke, konsolider
4. **Kan vi reducere antal breakpoints?** - F.eks. kun mobile + desktop?

## Output Format

### 1. Current State Analysis
```markdown
## Current Typography Tokens

**Total unique sizes:** X
**Breakpoints:** Mobile, Tablet, Desktop

### Headings
- H1 (Hero): 30px / 34px / 40px
- H2 (Section): 36px / 48px / 56px
- H2 (CTA): 36px / 44px / 52px
- H3 (Card): 24px / 26px
- H3 (Product): 30px / 34px
- Price: 30px / 34px

### Issues Identified
1. **Redundancy:** H2 (CTA) og H2 (Section) er tæt på hinanden
2. **Inconsistent ratio:** H1 progression er +4px, +6px (ikke konsistent)
3. **Too many sizes:** 15+ unikke størrelser
```

### 2. Optimized Proposal
```markdown
## Proposed Optimized Scale

**Total unique sizes:** X (reduceret fra Y)
**Consistent ratio:** 1.2x

### Headings
- H1 (Hero): 30px → 36px → 44px
- H2 (All): 36px → 44px → 52px (konsolideret)
- H3 (All): 24px → 28px → 32px (konsolideret)
- Price: 28px → 32px → 36px (samme som H3)

### Benefits
- Reduceret fra 15 til 8 unikke størrelser
- Konsistent 1.2x ratio
- Klar hierarki
```

### 3. Migration Plan
```markdown
## Migration Steps

1. **Konsolider H2 tokens** - Merge section og cta
2. **Konsolider H3 tokens** - Merge card-title og product-title
3. **Standardiser progression** - Brug 1.2x ratio
4. **Opdater komponenter** - Brug nye tokens
5. **Test visuelt** - Verificer hierarki ser godt ud
```

## Implementation

### Command Usage
```
/typography-audit @beauty-shop-storefront
```

### What It Does
1. Læser `tailwind.config.js` og ekstraherer alle fontSize tokens
2. Mapper hvor hver token bruges i komponenter
3. Analyserer hierarki, progression, og redundanser
4. Foreslår optimeret scale baseret på design principper
5. Opretter migration plan

### Output Files
- `.design/typography-audit-report.md` - Detaljeret analyse
- `.design/typography-optimized-proposal.md` - Foreslået optimering
- `.design/typography-migration-plan.md` - Step-by-step migration

## Design Principles Applied

1. **Modular Scale** - Konsistent ratio mellem niveauer
2. **Simplicity** - Færre størrelser = bedre
3. **Consistency** - Samme størrelse for samme hierarki niveau
4. **Clarity** - Klar forskel mellem niveauer
5. **Maintainability** - Let at forstå og vedligeholde

## Success Criteria

✅ **Max 8-12 unikke størrelser** (inkl. alle breakpoints)
✅ **Konsistent ratio** (1.2-1.5x mellem niveauer)
✅ **Klar hierarki** (minimum 20% forskel mellem niveauer)
✅ **Konsolideret** (ingen unødvendige variationer)
✅ **Dokumenteret** (klar reference i design-standards.md)


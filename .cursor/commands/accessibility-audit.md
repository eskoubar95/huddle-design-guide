# Accessibility Audit

Perform a comprehensive accessibility audit to ensure WCAG 2.1 AA compliance.

## Objective
Review code/feature for accessibility issues and provide actionable recommendations for WCAG compliance.

## Context
- Follow `.cursor/rules/00-foundations.mdc` accessibility minimums
- Beauty Shop targets Danish market - consider local accessibility requirements
- E-commerce checkout flows have specific accessibility needs

## Audit Scope

Define what to audit:
- [ ] Specific feature/component: `{{feature_name}}`
- [ ] Page/route: `{{page_route}}`
- [ ] Entire application

## WCAG 2.1 Level AA Checklist

### 1. Perceivable

#### 1.1 Text Alternatives
- [ ] **Images**: All images have meaningful alt text
- [ ] **Decorative Images**: Decorative images have empty alt (`alt=""`)
- [ ] **Icons**: Icon buttons have accessible labels
- [ ] **Product Images**: Product images describe the product
- [ ] **Logo**: Company logo has appropriate alt text

#### 1.2 Time-based Media
- [ ] **Videos**: Have captions/transcripts if present
- [ ] **Audio**: Has text alternative if present

#### 1.3 Adaptable
- [ ] **Semantic HTML**: Proper use of HTML5 elements
  - Headers: `<h1>`, `<h2>`, etc. in logical order
  - Lists: `<ul>`, `<ol>`, `<li>` for lists
  - Buttons: `<button>` not `<div>` for actions
  - Links: `<a>` for navigation
  - Forms: `<form>`, `<label>`, `<input>` properly associated

- [ ] **Heading Hierarchy**: Logical heading structure (no skipping levels)
- [ ] **Landmarks**: ARIA landmarks or HTML5 semantic elements
  - `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`
  - Or ARIA: `role="banner"`, `role="navigation"`, etc.

- [ ] **Reading Order**: Content order makes sense when linearized
- [ ] **Form Labels**: All form inputs have associated labels

#### 1.4 Distinguishable
- [ ] **Color Contrast**: WCAG AA ratios met
  - Normal text: 4.5:1
  - Large text (18pt+): 3:1
  - UI components: 3:1

- [ ] **Color Not Only Cue**: Information not conveyed by color alone
- [ ] **Resize Text**: Text can be resized 200% without loss of function
- [ ] **Text Spacing**: Content reflows properly with increased spacing
- [ ] **Images of Text**: Avoid images of text (use real text)

### 2. Operable

#### 2.1 Keyboard Accessible
- [ ] **Keyboard Navigation**: All functionality available via keyboard
- [ ] **No Keyboard Trap**: Focus can move away from all elements
- [ ] **Logical Tab Order**: Tab order follows visual order
- [ ] **Skip Links**: Skip to main content link present

**Test**: Navigate entire flow with keyboard only (Tab, Shift+Tab, Enter, Space, Arrow keys)

#### 2.2 Enough Time
- [ ] **No Time Limits**: Or user can extend/disable them
- [ ] **Auto-updates**: Can be paused/stopped (carousels, notifications)

#### 2.3 Seizures
- [ ] **No Flashing**: Nothing flashes more than 3 times per second

#### 2.4 Navigable
- [ ] **Page Titles**: Descriptive, unique page titles
- [ ] **Focus Visible**: Clear focus indicators on all interactive elements
- [ ] **Link Purpose**: Link text describes destination
- [ ] **Multiple Navigation**: More than one way to find pages (menu, search, sitemap)
- [ ] **Headings**: Descriptive section headings

### 3. Understandable

#### 3.1 Readable
- [ ] **Language**: Page language declared (`<html lang="da">`)
- [ ] **Language Changes**: Language changes marked up

#### 3.2 Predictable
- [ ] **On Focus**: No context changes on focus alone
- [ ] **On Input**: No automatic context changes on input
- [ ] **Consistent Navigation**: Navigation consistent across pages
- [ ] **Consistent Identification**: Components function the same across site

#### 3.3 Input Assistance
- [ ] **Error Identification**: Errors clearly identified in text
- [ ] **Labels/Instructions**: Form inputs have clear labels and instructions
- [ ] **Error Suggestions**: Suggestions provided for input errors
- [ ] **Error Prevention**: Confirmations for legal/financial transactions
- [ ] **Field Validation**: Real-time validation with clear feedback

### 4. Robust

#### 4.1 Compatible
- [ ] **Valid HTML**: HTML validates (no major errors)
- [ ] **Name, Role, Value**: All UI components have proper ARIA
- [ ] **Status Messages**: Use ARIA live regions for dynamic updates

## E-commerce Specific Checks

### Product Pages
- [ ] Product images have descriptive alt text
- [ ] Price announced correctly by screen readers
- [ ] "Add to Cart" button clearly labeled
- [ ] Product variants (size, color) keyboard accessible
- [ ] Quantity selector keyboard accessible

### Shopping Cart
- [ ] Cart items announced to screen reader
- [ ] Remove item button clearly labeled
- [ ] Quantity update accessible
- [ ] Empty cart state announced
- [ ] Cart total announced correctly

### Checkout Flow
- [ ] Multi-step process clearly indicated
- [ ] Current step announced
- [ ] Form validation accessible
- [ ] Payment method selection keyboard accessible
- [ ] Order summary announced
- [ ] Confirmation clearly communicated

### Search & Filters
- [ ] Search form accessible
- [ ] Results count announced
- [ ] Filters keyboard accessible
- [ ] Applied filters announced
- [ ] Clear filters button accessible

## Testing Tools

### Automated Testing
Run these tools and review results:

```bash
# Install tools
npm install -D @axe-core/react eslint-plugin-jsx-a11y

# Run accessibility tests
npm run test -- --accessibility
```

**Browser Extensions:**
- axe DevTools
- WAVE
- Lighthouse (Accessibility audit)

### Manual Testing

#### Keyboard Testing
1. Tab through entire page
2. Verify focus visible at all times
3. Test all interactive elements
4. Check modal/dialog keyboard traps
5. Verify dropdown/menu navigation

#### Screen Reader Testing
**MacOS VoiceOver:**
```
Cmd + F5 to toggle VoiceOver
VO = Control + Option
Navigate: VO + Arrow keys
Interact: VO + Space
```

**Test Scenarios:**
1. Navigate through page structure (headings, landmarks)
2. Fill out forms
3. Complete checkout process
4. Interact with dynamic content (modals, notifications)

#### Color Contrast
Use browser DevTools or online tools:
- WebAIM Contrast Checker
- Colour Contrast Analyser

### Mobile Accessibility
- [ ] Zoom up to 200% without horizontal scrolling
- [ ] Touch targets min 44x44 CSS pixels
- [ ] Content reflows properly
- [ ] No viewport locked zoom

## Common Issues & Fixes

### Issue: Missing Alt Text
```tsx
// ❌ Bad
<img src="/product.jpg" />

// ✅ Good
<img src="/product.jpg" alt="Starter Kit med 3 hudplejeprodukter" />
```

### Issue: Poor Color Contrast
```tsx
// ❌ Bad (light gray on white)
<p className="text-gray-300">Price: 899 DKK</p>

// ✅ Good (darker text)
<p className="text-gray-900">Price: 899 DKK</p>
```

### Issue: Div Button
```tsx
// ❌ Bad
<div onClick={handleClick}>Add to Cart</div>

// ✅ Good
<button onClick={handleClick}>Add to Cart</button>
```

### Issue: Missing Label
```tsx
// ❌ Bad
<input type="email" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" placeholder="din@email.dk" />
```

### Issue: No Focus Indicator
```css
/* ❌ Bad */
button:focus {
  outline: none;
}

/* ✅ Good */
button:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}
```

### Issue: Dynamic Content Updates
```tsx
// ❌ Bad - no announcement
<div>{cartItemCount} items</div>

// ✅ Good - screen reader announced
<div role="status" aria-live="polite" aria-atomic="true">
  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} i kurv
</div>
```

## Output Format

### Accessibility Report

#### Critical Issues 🔴
Must be fixed immediately (blocking WCAG compliance):
1. Issue description
   - Location: file:line
   - Fix: code example

#### Important Issues 🟡
Should be fixed soon:
1. Issue description
   - Fix suggestion

#### Enhancements 🟢
Nice to have improvements:
1. Enhancement description

#### Compliant Items ✅
What is working well:
- Good practice examples

## Checklist
- [ ] All interactive elements keyboard accessible
- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA
- [ ] Form inputs have labels
- [ ] Error messages accessible
- [ ] Dynamic content announced
- [ ] Tested with keyboard only
- [ ] Tested with screen reader (if possible)
- [ ] Mobile accessibility verified


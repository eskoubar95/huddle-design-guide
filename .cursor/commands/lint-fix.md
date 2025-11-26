# Lint Fix

Automatically analyze and fix linting issues in the current code.

## Objective
Fix code style, formatting, and linting errors to maintain consistent code quality across Beauty Shop codebase.

## Context
- Follow `.cursor/rules/00-foundations.mdc` code style principles
- Beauty Shop uses ESLint + Prettier + TypeScript
- Consistent code style improves readability and reduces errors

## Linting Tools

The Project uses:
- **ESLint:** Code quality and best practices
- **Prettier:** Code formatting
- **TypeScript:** Type checking
- **Next.js ESLint:** Next.js specific rules

## Quick Fix

```bash
# Fix all auto-fixable issues
npm run lint:fix

# Fix specific file
npx eslint --fix path/to/file.ts

# Format with Prettier
npm run format

# Type check
npm run type-check
```

## Linting Categories

### 1. ESLint Errors 🔴

**Must be fixed:**
- Unused variables
- Missing dependencies in useEffect
- Accessibility violations
- Security issues
- React Hooks rules violations

**Common Fixes:**
```typescript
// ❌ Error: 'React' is defined but never used
import React from 'react'

// ✅ Fixed: Remove unused import
import { useState } from 'react'

// ❌ Error: Missing dependency in useEffect
useEffect(() => {
  fetchData(userId)
}, [])

// ✅ Fixed: Add dependency
useEffect(() => {
  fetchData(userId)
}, [userId])

// ❌ Error: Unused variable
const unusedVar = 'value'

// ✅ Fixed: Remove or use it
// (removed)
```

### 2. ESLint Warnings 🟡

**Should be fixed:**
- Console.log statements
- TODO comments without issues
- Deprecated API usage
- Non-standard patterns

**Fixes:**
```typescript
// ❌ Warning: Unexpected console.log
console.log('Debug info:', data)

// ✅ Fixed: Remove or use proper logging
import { logger } from '@/lib/utils/logger'
logger.debug('Debug info:', data)

// ❌ Warning: TODO comment
// TODO: Implement this

// ✅ Fixed: Link to issue or implement
// TODO: Implement pagination (BS-123)
```

### 3. Prettier Formatting

**Auto-fixes:**
- Indentation (2 spaces)
- Line length (80 chars)
- Semicolons
- Quotes (single vs double)
- Trailing commas

```typescript
// ❌ Before Prettier
function test(a,b,c) {
return {foo:a,bar:b,baz:c}}

// ✅ After Prettier
function test(a, b, c) {
  return {
    foo: a,
    bar: b,
    baz: c,
  }
}
```

### 4. TypeScript Errors

**Type issues:**
```typescript
// ❌ Error: Type 'string' is not assignable to type 'number'
const price: number = '899'

// ✅ Fixed: Correct type
const price: number = 899

// ❌ Error: Property 'id' does not exist on type '{}'
const product = {}
console.log(product.id)

// ✅ Fixed: Proper typing
interface Product {
  id: string
  name: string
}
const product: Product = { id: '1', name: 'Kit' }
console.log(product.id)

// ❌ Error: 'any' type is not allowed
function process(data: any) {}

// ✅ Fixed: Proper type or unknown
function process(data: unknown) {}
```

### 5. React/Next.js Specific

**Next.js rules:**
```typescript
// ❌ Error: Do not use <img>. Use Image from next/image instead
<img src="/product.jpg" alt="Product" />

// ✅ Fixed: Use Next.js Image
import Image from 'next/image'
<Image src="/product.jpg" alt="Product" width={800} height={600} />

// ❌ Error: Do not use <a> for routing. Use Link from next/link instead
<a href="/products">Products</a>

// ✅ Fixed: Use Next.js Link
import Link from 'next/link'
<Link href="/products">Products</Link>

// ❌ Error: Do not use target="_blank" without rel="noopener noreferrer"
<a href="https://external.com" target="_blank">Link</a>

// ✅ Fixed: Add rel attribute
<a href="https://external.com" target="_blank" rel="noopener noreferrer">Link</a>
```

## ESLint Configuration

Beauty Shop's ESLint config includes:

```json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "react-hooks/exhaustive-deps": "warn",
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

## Prettier Configuration

```json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 80,
  "arrowParens": "avoid"
}
```

## Auto-fix Workflow

### 1. Check Current Issues
```bash
# See all issues
npm run lint

# Count issues
npm run lint -- --format=compact | wc -l
```

### 2. Auto-fix What's Possible
```bash
# Fix all auto-fixable
npm run lint:fix

# Format all files
npm run format
```

### 3. Manual Fixes
Review remaining issues and fix manually:
- Complex type errors
- Logic errors
- Accessibility issues
- Security vulnerabilities

### 4. Verify Fixes
```bash
# Re-run linter
npm run lint

# Type check
npm run type-check

# Should see no errors
```

## Pre-commit Hooks

Beauty Shop uses Husky + lint-staged to auto-fix on commit:

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

**This means:**
- Auto-fixes run on `git commit`
- Only staged files are checked
- Commit fails if unfixable errors

## Common Lint Errors & Solutions

### Error: React Hook useEffect has missing dependencies

**Problem:**
```typescript
useEffect(() => {
  fetchProducts(categoryId)
}, [])
```

**Solution:**
```typescript
// Option 1: Add dependency
useEffect(() => {
  fetchProducts(categoryId)
}, [categoryId])

// Option 2: If intentional, use comment
useEffect(() => {
  // Only fetch once on mount
  fetchProducts(categoryId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

### Error: 'X' is assigned a value but never used

**Problem:**
```typescript
const unusedVariable = getValue()
return <div>Content</div>
```

**Solution:**
```typescript
// Remove it or use underscore prefix if intentionally unused
const _unusedVariable = getValue() // signals intent
```

### Error: Unsafe assignment of an 'any' value

**Problem:**
```typescript
const data: any = fetchData()
const name = data.name // Unsafe
```

**Solution:**
```typescript
interface Data {
  name: string
}
const data = fetchData() as Data
const name = data.name // Type-safe
```

### Error: Missing accessibility props

**Problem:**
```tsx
<button onClick={handleClick}>
  <img src="/icon.svg" />
</button>
```

**Solution:**
```tsx
<button onClick={handleClick} aria-label="Add to cart">
  <img src="/icon.svg" alt="" role="presentation" />
</button>
```

## IDE Integration

### VS Code

**Install extensions:**
- ESLint (`dbaeumer.vscode-eslint`)
- Prettier (`esbenp.prettier-vscode`)

**Settings:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

**Benefits:**
- Auto-fix on save
- Inline error display
- Quick fixes with CMD+.

## Ignore Patterns

Some files should not be linted:

```
# .eslintignore
node_modules/
.next/
out/
build/
dist/
coverage/
*.config.js
```

## Output Format

### Before Fixing
```
❌ Lint errors found (15 errors, 8 warnings)

Errors:
- lib/services/orders.ts:42:7 - @typescript-eslint/no-explicit-any
- components/ProductCard.tsx:18:5 - react-hooks/exhaustive-deps
- lib/utils/format.ts:12:7 - @typescript-eslint/no-unused-vars
... (12 more)

Warnings:
- app/checkout/page.tsx:56:3 - no-console
- lib/api/products.ts:89:10 - prefer-const
... (6 more)
```

### After Fixing
```
✅ All lint issues fixed!

Auto-fixed (20 issues):
- Removed unused imports (8)
- Added missing dependencies (5)
- Fixed formatting (4)
- Removed console.logs (3)

Manual fixes needed (3):
- Type error in orders.ts:42 (complex type)
- Accessibility issue in Checkout.tsx:56
- Missing error handling in api/products.ts:89

Next steps:
1. Fix remaining 3 issues manually
2. Run npm run lint to verify
3. Commit changes
```

## Checklist
- [ ] Run `npm run lint`
- [ ] Run `npm run lint:fix` for auto-fixes
- [ ] Run `npm run format` for Prettier
- [ ] Run `npm run type-check` for TypeScript
- [ ] Fix remaining manual issues
- [ ] Verify with `npm run lint` (0 errors)
- [ ] Pre-commit hooks configured
- [ ] IDE auto-fix on save enabled


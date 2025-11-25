# Beauty Shop – Cursor Commands

Reusable AI prompts for Beauty Shop development workflows. Type `/` in Cursor AI chat to access any command.

**Total:** 42 commands (19 original + 17 new + 5 design + 1 feature)

## 🆕 NEW: Plan-Based Development Workflow

For large features (>400 LOC), see **[PLAN-BASED-WORKFLOW.md](./PLAN-BASED-WORKFLOW.md)** for the complete guide to:
- 14 new commands inspired by HumanLayer
- Phase-based implementation with checkpoints
- Full Linear + GitHub MCP integration
- Structured planning → research → implementation → PR workflow

**Quick start:** `/fetch-linear-ticket` → `/create-implementation-plan` → `/execute-plan-phase`

---

## 📋 Quick Reference

### Development & Features
- `/setup-nextjs-feature` - Scaffold Next.js 15 feature (App Router, React 19)
- `/api-resource` - Design/implement versioned API resource
- `/rhf-zod-form` - React Hook Form + Zod validation with server actions
- `/postgres-migration-rls` - Database migration + RLS policies
- `/feature-flags` - Setup/gate feature with LaunchDarkly
- `/sentry-instrumentation` - Add Sentry monitoring (errors, breadcrumbs)
- `/feature-adapt-inspiration` - 🆕 Reverse engineer external feature & create blueprint (Playwright)

### Testing & Quality
- `/write-unit-tests` - Generate comprehensive unit tests
- `/run-all-tests-and-fix` - Run test suite, identify failures, fix issues
- `/lint-fix` - Auto-fix linting and formatting issues
- `/code-review` - Comprehensive PR review checklist
- `/accessibility-audit` - WCAG 2.1 AA compliance check
- `/security-audit` - Security vulnerability scan

### Design & Visual Quality (🆕 Playwright MCP)
- `/design-audit` - Extract design system via AI visual analysis (Playwright screenshots)
- `/design-consistency-fix` - Fix design inconsistencies with visual verification
- `/design-review` - Review component/page with Playwright + AI visual analysis
- `/design-optimize` - Iterative visual optimization with screenshot feedback loop
- `/design-adapt-inspiration` - Extract patterns from inspiration site & adapt to your component

### Debugging & Optimization
- `/debug-issue` - Systematic debugging workflow
- `/optimize-performance` - Analyze and improve performance
- `/refactor-code` - Improve code quality while preserving functionality

### Documentation & Collaboration
- `/add-documentation` - Generate/update comprehensive documentation
- `/generate-commit-message` - Create Conventional Commit message
- `/generate-pr-description` - Generate PR description from changes
- `/resume-task` - Resume work on task across chat sessions
- `/onboard-new-developer` - Complete onboarding checklist

---

## 🎯 Commands by Category

### 🏗️ Development & Features

#### `/setup-nextjs-feature`
Scaffold production-grade Next.js 15 feature with React 19.

**When to use:**
- Starting new feature or page
- Need complete setup with routes, components, services
- Want best practices built-in

**Delivers:**
- UI route and components
- Server actions with business logic
- Domain types (DTOs, schemas)
- API integration
- Feature flag guard
- Sentry instrumentation
- Tests (unit, integration, render)

**Example:**
```
/setup-nextjs-feature

Feature: Product listing
Route: /products
Model: Product with variants, pricing, inventory
Flag: product-catalog-v2
```

---

#### `/api-resource`
Design and implement versioned API resource.

**When to use:**
- Creating new API endpoint
- Need RESTful resource structure
- Want consistent error handling

**Delivers:**
- Versioned routes (`/api/v1/resource`)
- DTOs and validation schemas
- Consistent error responses
- Pagination (cursor-based)
- Authorization checks
- Tests

**Example:**
```
/api-resource

Resource: Orders
Operations: list, get, create, update
Entities: Order, OrderItem, Customer
```

---

#### `/rhf-zod-form`
Create form with React Hook Form + Zod validation and server actions.

**When to use:**
- Building any form (checkout, contact, settings)
- Need validation with type safety
- Want server-side processing

**Delivers:**
- Zod validation schema
- RHF form component
- Server action for submission
- Error handling (field-level + summary)
- Loading states
- Tests

**Example:**
```
/rhf-zod-form

Form: Checkout
Fields: email, firstName, lastName, address, postalCode, city
Submit: Create order, process payment
```

---

#### `/postgres-migration-rls`
Create PostgreSQL migration with Row Level Security policies.

**When to use:**
- Database schema changes
- Need Supabase RLS policies
- Want secure data access

**Delivers:**
- Up/down migrations
- RLS policies for auth
- Indexes for performance
- Migration tests

**Example:**
```
/postgres-migration-rls

Table: orders
Columns: id, user_id, total, status, created_at
RLS: Users can only access their own orders
```

---

#### `/feature-flags`
Setup feature behind LaunchDarkly flag.

**When to use:**
- Gradual feature rollout
- A/B testing
- Kill switch for risky features

**Delivers:**
- Flag utility wrapper
- Guarded code paths with safe defaults
- Analytics breadcrumb
- Documentation (purpose, rollout plan)
- Tests (flag on/off behavior)

**Example:**
```
/feature-flags

Flag: checkout.subscription.enabled
Rollout: 10% of users, then scale to 100%
Fallback: Regular one-time purchase
```

---

#### `/sentry-instrumentation`
Add Sentry error tracking and performance monitoring.

**When to use:**
- New feature needs monitoring
- Want error context for debugging
- Performance tracking needed

**Delivers:**
- Sentry initialization
- Error capture with context (no PII)
- Breadcrumbs for user actions
- Performance spans
- Test verification

**Example:**
```
/sentry-instrumentation

Feature: Checkout flow
Track: Page views, button clicks, API calls, errors
Context: Order ID, payment status (no card details)
```

---

#### `/feature-adapt-inspiration`
Reverse engineer external feature and create concrete implementation blueprint.

**When to use:**
- Found great feature in external system (Shopify, SaaS admin, workflow tool)
- Want to adapt it to Beauty Shop (Medusa/Strapi/Storefront)
- Need structured specification without manual documentation
- Want to skip tedious "describe every field/button/flow" work

**Uses:**
- **Playwright MCP** to explore and screenshot external system
- **AI analysis** to reverse engineer data models, flows, business logic
- Maps to Beauty Shop architecture (Medusa backend, Strapi plugin, or Next.js)
- Generates complete Feature Blueprint ready for implementation

**Delivers:**
- Pattern extraction (entities, fields, relationships, flows)
- Complete Feature Blueprint markdown:
  - Problem & value proposition
  - Domain model + data model
  - User flows (step-by-step with edge cases)
  - UX specifications (lists, forms, detail views)
  - Business logic & rules
  - Implementation guide for target system
  - Risks, open questions, acceptance criteria
- Screenshots reference (7-10 views)
- Next steps (research → plan → Linear issue)

**Example:**
```
/feature-adapt-inspiration

URL: https://shopify.com/admin/purchase-orders
Feature: Purchase Order System
Why: Great flow for managing inventory purchases
Target: medusa-backend
Flows: Create PO, Approve, Receive stock

Playwright: Screenshots 7 views (list, detail, forms, flows)
AI Analysis: Extracts:
- Entities: PurchaseOrder, PurchaseOrderLine, Supplier
- Status flow: draft → submitted → approved → received
- 15 fields with types and validations
- 3 core user flows with edge cases

Blueprint Generated:
- 600+ line structured specification
- Ready for /research-feature-patterns
- Then /create-implementation-plan
- Then /create-linear-issue

Estimate: 6-9 days implementation
```

---

### ✅ Testing & Quality

#### `/write-unit-tests`
Generate comprehensive unit tests for code.

**When to use:**
- New feature needs test coverage
- Refactoring existing code
- Want to prevent regressions

**Test types:**
- **Components:** Render, interactions, accessibility
- **Services:** Happy path, error handling, edge cases
- **Server Actions:** Validation, auth, transactions

**Example:**
```
/write-unit-tests

Target: lib/services/orders/create-order.ts
Scenarios:
- Valid order creation
- Invalid payment method
- Out of stock items
- Authorization failure
```

---

#### `/run-all-tests-and-fix`
Execute test suite, triage failures, and fix issues.

**When to use:**
- Before merging PR
- After refactoring
- CI/CD failed

**Process:**
1. Run full test suite
2. Categorize failures (assertion, runtime, timeout, mock)
3. Prioritize (critical → important → low)
4. Fix issues systematically
5. Verify all tests pass

**Example:**
```
/run-all-tests-and-fix

After refactoring price calculation logic, 5 tests failed.
Identify issues and fix while maintaining test quality.
```

---

#### `/lint-fix`
Auto-fix linting, formatting, and code style issues.

**When to use:**
- Before committing code
- After bulk code changes
- Fixing code style violations

**Fixes:**
- ESLint errors/warnings
- Prettier formatting
- TypeScript type issues
- Next.js specific rules
- Unused imports
- Console.log statements

**Example:**
```
/lint-fix

Fix all auto-fixable issues in current file or entire codebase.
```

---

#### `/code-review`
Comprehensive PR review against Beauty Shop standards.

**When to use:**
- Reviewing teammate's PR
- Self-review before requesting review
- Want structured feedback

**Reviews:**
- Code quality (SRP, naming, file size)
- Frontend (Next.js, React, performance)
- Security (no secrets, input validation, no PII)
- Accessibility (WCAG AA compliance)
- Testing (coverage, quality)
- Documentation

**Example:**
```
/code-review

PR: feature/BS-152-product-catalog
Review against all rules in .cursor/rules/
Check security, performance, accessibility, tests.
```

---

#### `/accessibility-audit`
WCAG 2.1 Level AA compliance audit.

**When to use:**
- New UI feature
- Before production release
- Accessibility bug reported

**Checks:**
- Keyboard navigation
- Screen reader compatibility
- Color contrast (4.5:1 for text)
- Alt text on images
- Form labels
- Focus indicators
- Semantic HTML

**Example:**
```
/accessibility-audit

Feature: Checkout flow
Ensure keyboard-only navigation, screen reader announcements,
and proper ARIA labels throughout 3-step checkout.
```

---

#### `/security-audit`
Security vulnerability scan for e-commerce platform.

**When to use:**
- Payment/auth features
- Before production deployment
- Security bug reported

**Scans for:**
- Hardcoded secrets
- SQL injection risks
- XSS vulnerabilities
- CSRF protection
- No PII in logs
- Payment security (PCI DSS)
- GDPR compliance

**Example:**
```
/security-audit

Feature: Payment processing with Stripe
Check: No card storage, webhook verification, amount validation,
no sensitive data in logs/errors.
```

---

### 🎨 Design & Visual Quality (Playwright MCP)

#### `/design-audit`
Extract design system from existing codebase through visual analysis.

**When to use:**
- Starting UI standardization
- Need to document current design patterns
- Want to create `.design-standards.md`
- Identifying inconsistencies across components

**Uses:**
- **Playwright MCP** to capture screenshots of all components
- **AI visual analysis** to analyze spacing, colors, typography, shadows
- Code correlation to match visual patterns to Tailwind classes

**Delivers:**
- Screenshot archive (desktop + mobile)
- `.design-standards.md` documenting:
  - Color palette (extracted from renders)
  - Spacing scale (8px base)
  - Typography hierarchy
  - Shadow tokens
  - Border radius patterns
- Inconsistencies report (hardcoded values, off-scale spacing, etc.)

**Example:**
```
/design-audit

Analyzes homepage components with Playwright:
- Screenshots Hero, ProductCard, StepCard, etc.
- Extracts colors, spacing, typography from visual renders
- Documents patterns in .design-standards.md
- Lists inconsistencies (hardcoded #08152D, px-10, custom shadows)
```

---

#### `/design-consistency-fix`
Fix design inconsistencies with before/after visual verification.

**When to use:**
- After running `/design-audit`
- Need to standardize hardcoded values
- Want to replace custom shadows/colors with theme tokens
- Fix off-scale spacing

**Uses:**
- **Playwright MCP** to capture before/after screenshots
- **AI visual analysis** to verify no visual regressions
- Iterative: Apply fixes → Screenshot → Compare → Adjust

**Delivers:**
- Updated `tailwind.config.js` with new tokens
- Components updated (hardcoded → theme tokens)
- Visual comparison report (before/after screenshots)
- Confirmation of no visual regressions

**Example:**
```
/design-consistency-fix

Based on design-audit findings:
1. Screenshots baseline (before changes)
2. Updates tailwind.config.js (adds color/shadow tokens)
3. Replaces bg-[#08152D] → bg-primary-darker
4. Replaces shadow-[0_28px...] → shadow-hero
5. Screenshots after changes
6. Compares visually (no regressions)
```

---

#### `/design-review`
Review component/page against design standards using visual analysis.

**When to use:**
- New component/page built
- Polishing existing UI
- Want objective design feedback
- Ensuring consistency with brand

**Uses:**
- **Playwright MCP** to screenshot component (desktop + mobile)
- **AI visual analysis** to analyze spacing, typography, colors, balance
- Comparison with reference components (Hero, ProductCard)
- Optional: Compare with industry inspiration (Linear, Aesop, Glossier)

**Delivers:**
- Visual analysis report (what looks good, what's off)
- Critical issues with file:line + concrete fixes
- Score (X/10) with breakdown
- Comparison with reference components
- Next steps (priority order for fixes)

**Example:**
```
/design-review About page

Playwright screenshots About page (desktop + mobile)
AI visual analysis:
- ❌ Hero padding too tight (py-12 → py-24)
- ❌ Inconsistent gaps (gap-6 and gap-12 mixed)
- ✅ Color usage correct
- 💭 Add more breathing room around CTA
Score: 6/10
Suggests: Apply spacing fixes, then run /design-optimize
```

---

#### `/design-optimize`
Iterative visual optimization with Playwright feedback loop.

**When to use:**
- Component "feels off" but unclear why
- Want to achieve "premium" aesthetic
- Need iterative polish with visual feedback
- Goal: Reach 9/10 design quality

**Uses:**
- **Playwright MCP** for iterative screenshots
- **AI visual analysis** to analyze each iteration
- Multiple cycles: Adjust → Screenshot → Compare → Refine
- Optional: Analyze inspiration sites for patterns

**Delivers:**
- Screenshot progression (iteration-1, iteration-2, etc.)
- Optimization log (what changed, why, impact)
- Final code changes with reasoning
- Visual comparison (before vs. after)
- Score improvement (e.g., 5/10 → 9/10)

**Example:**
```
/design-optimize TestimonialSection - feels cramped

Iteration 1: Screenshots baseline
- Analysis: py-12 too tight, gap-4 too close
- Changes: py-12 → py-24, gap-4 → gap-12
- Score: 5/10 → 7/10

Iteration 2: Refine
- Analysis: Desktop gap could be larger
- Changes: gap-12 → gap-16 on lg
- Score: 7/10 → 9/10 ✅

Goal achieved! Feels spacious and premium.
```

---

#### `/design-adapt-inspiration`
Extract design patterns from inspiration site and adapt to your component.

**When to use:**
- Found design you like (Linear, Notion, Aesop, etc.)
- Want specific pattern (colors, spacing, card design)
- Need concrete implementation guidance
- Want multiple adaptation alternatives

**Uses:**
- **Playwright MCP** to screenshot inspiration site
- **AI visual analysis** to extract specific patterns
- Compares with your existing code
- Validates against Beauty Shop brand constraints
- Provides 3 options: Conservative, Bold, Full Reimagination

**Delivers:**
- Pattern extraction (colors, spacing, typography, shadows)
- 3 adaptation alternatives with trade-offs
- Concrete Tailwind class changes
- Brand constraint validation
- Implementation guidance

**Example:**
```
/design-adapt-inspiration

URL: https://linear.app
Pattern: Card design and spacing
Target: src/components/TestimonialCard.tsx
Goal: Make testimonials feel polished like Linear

Playwright: Screenshots Linear cards
AI Analysis: Extracts:
- Padding: 24px vs your 16px
- Border: 1px subtle vs your heavy shadow
- Gap: 12px consistent vs your 8px mixed

Options:
1. Conservative: p-4 → p-6, add border, shadow-sm
2. Bold: + subtle bg, refined hover states
3. Full: Restructure card component

Recommendation: Option 1 (80% improvement, low risk)
```

---

### 🐛 Debugging & Optimization

#### `/debug-issue`
Systematic debugging workflow for identifying root cause.

**When to use:**
- Bug reported by user or QA
- Tests failing unexpectedly
- Production error in Sentry

**Process:**
1. Gather information (error, environment, steps to reproduce)
2. Reproduce issue locally
3. Isolate problem (specific file/function)
4. Analyze root cause
5. Propose solution with code

**Example:**
```
/debug-issue

Issue: Checkout fails on mobile Safari
Error: "Payment validation failed"
Environment: iOS 16, Safari
User: Completed shipping step, failed at payment
```

---

#### `/optimize-performance`
Analyze and optimize for < 2 second page load time.

**When to use:**
- Lighthouse score < 90
- Core Web Vitals failing
- Page feels slow
- Before production launch

**Optimizes:**
- Bundle size (code splitting)
- Images (Next.js Image, WebP)
- React performance (memo, virtualization)
- API calls (batching, caching)
- Database queries (indexes, N+1)
- Core Web Vitals (LCP, FID, CLS)

**Example:**
```
/optimize-performance

Page: Product listing (/products)
Issue: LCP 3.2s (target < 2.5s)
Large image, heavy JavaScript bundle, slow API
```

---

#### `/refactor-code`
Improve code quality while preserving functionality.

**When to use:**
- File > 400 LOC
- Code duplication
- Complex functions (> 50 lines)
- Poor naming
- Tech debt

**Improves:**
- Single Responsibility Principle
- File size (< 500 LOC)
- Function complexity
- Type safety (no `any`)
- DRY (Don't Repeat Yourself)

**Example:**
```
/refactor-code

File: components/checkout/CheckoutForm.tsx (687 LOC)
Issues: Multiple responsibilities, nested conditionals, duplication
Extract: separate components, utility functions
```

---

### 📝 Documentation & Collaboration

#### `/add-documentation`
Generate comprehensive code documentation.

**When to use:**
- New feature/API
- Complex logic needs explanation
- Public API needs docs

**Creates:**
- README files
- JSDoc comments
- API documentation
- Architecture Decision Records (ADR)
- Environment variables docs

**Example:**
```
/add-documentation

Target: lib/services/pricing/calculate-discount.ts
Document: Function purpose, parameters, return type,
business rules for discount calculation, examples
```

---

#### `/generate-commit-message`
Create Conventional Commit message from staged changes.

**When to use:**
- Ready to commit
- Want structured commit message
- Following team conventions

**Format:**
```
<type>(<scope>): <short summary>

WHY:
- Reason for change

HOW:
- Key implementation details

NOTES:
- Breaking changes, risks, follow-ups

Refs: BS-<issue-id>
```

**Example:**
```
/generate-commit-message

Staged changes:
- Added product sorting
- Updated API endpoint
- Added tests

Generate commit message following Conventional Commits.
```

---

#### `/generate-pr-description`
Generate PR description from changes.

**When to use:**
- Opening new PR
- Want complete PR description
- Following team template

**Includes:**
- WHAT: Summary of changes
- WHY: Context and motivation
- HOW: Key implementation decisions
- TESTS: Testing performed
- SCREENSHOTS: UI changes (if applicable)
- ROLLBACK: How to revert if needed

**Example:**
```
/generate-pr-description

Changes:
- Implemented product filtering
- Added price range slider
- Updated API to support filters

Generate complete PR description.
```

---

#### `/resume-task`
Resume work on existing task by reconstructing progress from Linear, git, and plan files.

**When to use:**
- Chat context limit hit (80+ messages)
- Switching between implementation phases
- Picking up work after break
- Handing off task to another developer
- Debugging "what went wrong"

**Reconstructs:**
- Linear issue status + recent comments
- Implementation plan progress (plan vs. actual)
- Git history (commits, branches, changes)
- GitHub PR status
- Uncommitted changes
- Precise next steps

**Example:**
```
/resume-task CORE-4

Scenario: You're on message 80, agent suggests new chat
Action: Open new chat, run /resume-task CORE-4
Result: Complete context reconstruction with next steps
```

**Output:**
- Complete task status summary
- What's been done (commits, files, phases)
- What's outstanding (uncommitted work, PR status)
- Actionable next steps with commands to run
- Context for why resuming (chat limit, break, handoff)

**Best with:**
- Consistent chat naming (e.g., "CORE-4 - Implementation")
- Frequent commits (better progress tracking)
- Linear comments (breadcrumbs for resume)
- Implementation plans (plan vs. actual comparison)

---

#### `/onboard-new-developer`
Complete onboarding checklist for new team member.

**When to use:**
- New developer joins team
- Intern/contractor onboarding
- Want consistent onboarding experience

**Covers:**
- Access & accounts setup
- Local environment
- Codebase tour
- Coding standards
- Development workflow
- First tasks
- Resources & help

**Example:**
```
/onboard-new-developer

New developer: Sarah
Background: 3 years React, new to Next.js 15
Start date: Monday
Generate personalized onboarding checklist.
```

---

## 💡 Using Commands

### In Cursor AI Chat:
1. Type `/` to see all available commands
2. Select the command you need
3. Cursor will load the prompt template
4. Fill in placeholders (e.g., `{{feature_name}}`)
5. Let AI execute the command

### Command Placeholders:
Most commands use placeholders:
- `{{feature_name}}` - Name of feature
- `{{route}}` - URL route
- `{{scope}}` - Code scope/area
- `{{file}}` - File path
- `{{issue_id}}` - Linear issue ID (BS-XXX)

### Example Session:
```
You: /setup-nextjs-feature

Cursor AI: I'll help you scaffold a new Next.js feature.
          Please provide:
          - Feature name: ?
          - Route: ?
          - Model brief: ?

You: - Feature name: Product reviews
     - Route: /products/[id]/reviews
     - Model: Review with rating, comment, user

Cursor AI: [Generates complete feature with routes, components,
           services, types, tests...]
```

---

## 🎨 Command Principles

All commands follow Beauty Shop standards:

### Code Quality
- **SRP:** Single Responsibility Principle
- **Small files:** < 500 LOC
- **Small functions:** < 50 lines
- **Type safety:** Explicit TypeScript types
- **No PII:** Never log personal data

### Testing
- **AAA pattern:** Arrange, Act, Assert
- **Coverage:** 80%+ for critical paths
- **Behavior testing:** Test what, not how
- **No snapshots:** Test specific behaviors

### Security
- **No secrets:** Environment variables only
- **Input validation:** All user inputs
- **No PII in logs:** Sanitize all logging
- **Authorization:** Check permissions server-side

### Beauty Shop Specific
- **Prices in minor units:** Store in øre (DKK * 100)
- **Danish locale:** UI strings in Danish
- **MedusaJS integration:** Type-safe API calls
- **GDPR compliance:** EU data residency

---

## 📚 Related Documentation

### Project Docs (`.project/`)
- `01-Project_Brief.md` - Vision and goals
- `02-Product_Requirements_Document.md` - Full requirements
- `03-Tech_Stack.md` - Technology decisions
- `04-Database_Schema.md` - Database structure
- `05-API_Design.md` - API conventions
- `06-Backend_Guide.md` - Backend development
- `07-Frontend_Guide.md` - Frontend development

### Coding Rules (`.cursor/rules/`)
- `00-foundations.mdc` - Core principles
- `10-nextjs_frontend.mdc` - Next.js standards
- `12-forms_actions_validation.mdc` - Form handling
- `21-api_design.mdc` - API design
- `22-security_secrets.mdc` - Security practices
- `24-observability_sentry.mdc` - Monitoring
- `25-feature_flags.mdc` - Feature flags
- `30-database_postgres.mdc` - Database guidelines
- `31-ci_cd_pipeline.mdc` - CI/CD workflow

---

## 🆕 Adding Custom Commands

Want to add your own command?

1. Create new `.md` file in `.cursor/commands/`
2. Use descriptive kebab-case name (e.g., `my-custom-command.md`)
3. Follow this template:

```markdown
# Command Title

Brief description of what this command does.

## Objective
Clear goal statement.

## Context
- Project-specific context
- Related rules/docs
- When to use this command

## Inputs
- {{placeholder1}}: Description
- {{placeholder2}}: Description

## Deliverables
1. Item 1
2. Item 2
3. Item 3

## Example
```
Example usage
```

## Checklist
- [ ] Item 1
- [ ] Item 2
```

4. Commit and push - command will be available immediately!

---

## ✨ Tips & Best Practices

### Command Selection
- **Start specific:** Use feature-specific commands first
- **Then general:** Use general commands (debug, refactor) for refinement
- **Combine:** Use multiple commands in sequence

### Prompt Engineering
- **Be specific:** Provide detailed context in placeholders
- **Reference docs:** Link to relevant `.project/` or `.cursor/rules/` docs
- **Examples:** Give examples of desired output

### Quality Control
- **Review output:** Always review AI-generated code
- **Run tests:** `npm run test` after using commands
- **Type check:** `npm run type-check` catches issues
- **Lint:** `npm run lint:fix` for style

### Workflow
```bash
# Typical development flow
1. /setup-nextjs-feature    # Create feature
2. /write-unit-tests         # Add tests
3. /lint-fix                 # Clean up code
4. /code-review              # Self-review
5. /generate-commit-message  # Commit
6. /generate-pr-description  # Open PR
```

---

## 🤝 Contributing

Found a bug in a command? Want to improve one?

1. Open issue in Linear (label: `cursor-commands`)
2. Make changes in `.cursor/commands/`
3. Test the command
4. Open PR with:
   - What changed
   - Why the change improves the command
   - Example usage

---

**Questions?** Ask in #dev-tooling Slack channel or tag @nicklas in Linear.

**Last updated:** October 2025  
**Maintainer:** Nicklas Eskou

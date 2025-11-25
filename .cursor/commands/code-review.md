# Code Review

Comprehensive code review checklist for Beauty Shop pull requests.

## Objective
Perform a thorough review of code changes ensuring quality, security, performance, and adherence to Beauty Shop standards.

## Context
- Follow all rules in `.cursor/rules/`
- Review against project standards in `.project/` documentation
- Ensure changes align with PRD requirements

## Review Checklist

### 1. Code Quality & Foundations
Reference: `.cursor/rules/00-foundations.mdc`

- [ ] **Single Responsibility**: Each file/component has one clear purpose
- [ ] **File Size**: Files < 500 LOC (refactor if approaching ~400 LOC)
- [ ] **Naming**: Intention-revealing names (avoid `data`, `info`, `helper`, `temp`)
- [ ] **Small Functions**: Functions focused and readable with early returns
- [ ] **No Dead Code**: Remove commented code, unused imports, TODOs without issues

**Naming Conventions:**
- [ ] Files/folders: kebab-case (`product-card.tsx`)
- [ ] Components: PascalCase (`<ProductCard />`)
- [ ] Functions/variables: camelCase (`calculateTotal`)
- [ ] Hooks: `useXxx` pattern
- [ ] Test files: same name + `.test.ts(x)`

### 2. Frontend (Next.js 15)
Reference: `.cursor/rules/10-nextjs_frontend.mdc`

- [ ] **App Router**: Uses Next.js 15 App Router conventions
- [ ] **Server/Client Components**: Proper use of `'use client'` directive
- [ ] **React 19**: Leverages React 19 features appropriately
- [ ] **Performance**: Lazy loading, dynamic imports where appropriate
- [ ] **SEO**: Proper metadata, Open Graph tags for e-commerce pages

**Component Quality:**
- [ ] Props properly typed with TypeScript
- [ ] No prop drilling (use composition or context)
- [ ] Error boundaries for error handling
- [ ] Loading states for async operations
- [ ] Accessible markup (semantic HTML, ARIA labels)

### 3. Forms & Validation
Reference: `.cursor/rules/12-forms_actions_validation.mdc`

- [ ] **Zod Schemas**: All forms have validation schemas
- [ ] **React Hook Form**: Proper form setup with error handling
- [ ] **Server Actions**: Form submissions use server actions
- [ ] **Error Messages**: Clear, user-friendly validation errors
- [ ] **Pending States**: Loading indicators during submission
- [ ] **Success Feedback**: Confirmation messages on success

### 4. API Design
Reference: `.cursor/rules/21-api_design.mdc`

- [ ] **Versioning**: API routes include version (`/api/v1/...`)
- [ ] **Resource Modeling**: RESTful resource structure
- [ ] **Error Responses**: Consistent error format `{ code, message, details }`
- [ ] **Pagination**: Cursor-based pagination for list endpoints
- [ ] **Status Codes**: Appropriate HTTP status codes
- [ ] **Input Validation**: All inputs validated before processing

**MedusaJS Integration:**
- [ ] Proper use of MedusaJS client SDK
- [ ] Type-safe API calls
- [ ] Error handling for API failures
- [ ] Cart/order/product operations correct

### 5. Security & Privacy
Reference: `.cursor/rules/22-security_secrets.mdc`

- [ ] **No Secrets**: No hardcoded API keys, passwords, or tokens
- [ ] **Input Validation**: All user inputs validated and sanitized
- [ ] **SQL Injection**: Parameterized queries only
- [ ] **XSS Prevention**: Proper output escaping
- [ ] **CSRF Protection**: CSRF tokens on mutations
- [ ] **Authentication**: Proper auth checks (Clerk integration)
- [ ] **Authorization**: User permissions verified
- [ ] **No PII in Logs**: No sensitive data in logs or errors

**GDPR Compliance:**
- [ ] User data handling compliant
- [ ] No unnecessary data collection
- [ ] Proper data retention policies

### 6. Observability (Sentry)
Reference: `.cursor/rules/24-observability_sentry.mdc`

- [ ] **Error Capture**: Exceptions properly captured
- [ ] **Breadcrumbs**: Key user actions tracked
- [ ] **No PII**: No personal data in Sentry events
- [ ] **Context**: Useful error context without sensitive data
- [ ] **Sampling**: Reasonable trace sampling rates

### 7. Feature Flags
Reference: `.cursor/rules/25-feature_flags.mdc`

- [ ] **Naming**: Proper flag naming convention
- [ ] **Default Behavior**: Safe default when flag is off
- [ ] **Kill Switch**: Can disable feature instantly
- [ ] **Documentation**: Flag purpose and rollout plan documented

### 8. Database (PostgreSQL)
Reference: `.cursor/rules/30-database_postgres.mdc`

- [ ] **Migrations**: Proper up/down migrations
- [ ] **RLS Policies**: Row Level Security policies for Supabase
- [ ] **Indexes**: Appropriate indexes for queries
- [ ] **Constraints**: Foreign keys, unique constraints correct
- [ ] **No N+1 Queries**: Efficient query patterns

### 9. Testing
Reference: `.cursor/rules/00-foundations.mdc`

- [ ] **Test Coverage**: Critical paths have tests
- [ ] **Test Quality**: AAA pattern, intention-revealing names
- [ ] **No Snapshots**: Avoid large snapshots
- [ ] **Mocking**: External dependencies properly mocked
- [ ] **Tests Pass**: All tests pass locally

**Test Types:**
- [ ] Unit tests for services/functions
- [ ] Integration tests for server actions
- [ ] Component render tests
- [ ] Accessibility tests for UI components

### 10. Performance

- [ ] **Bundle Size**: No unnecessary dependencies
- [ ] **Images**: Optimized and properly sized
- [ ] **Lazy Loading**: Heavy components lazy-loaded
- [ ] **No Unnecessary Re-renders**: React optimization where needed
- [ ] **API Calls**: Minimized and batched where possible

### 11. Accessibility

- [ ] **Semantic HTML**: Proper HTML5 elements
- [ ] **ARIA Labels**: Accessible names for interactive elements
- [ ] **Keyboard Navigation**: All interactive elements keyboard accessible
- [ ] **Focus Management**: Visible focus states
- [ ] **Alt Text**: Images have meaningful alt text
- [ ] **Color Contrast**: WCAG AA compliance

### 12. E-commerce Specific

**Product Management:**
- [ ] Product data properly structured
- [ ] Variants handled correctly
- [ ] Inventory tracking accurate

**Cart & Checkout:**
- [ ] Cart state persisted correctly
- [ ] Pricing calculations accurate (DKK minor units - øre)
- [ ] Stripe payment integration secure
- [ ] Order confirmation emails sent

**Localization:**
- [ ] Danish locale for currency/dates
- [ ] UI strings in Danish
- [ ] Proper DKK formatting (minor units in logic, display at UI layer)

### 13. Documentation

- [ ] **Code Comments**: Why, not what (for non-obvious decisions)
- [ ] **README Updates**: If public API changed
- [ ] **ADR**: Architecture Decision Record for significant changes
- [ ] **API Docs**: API endpoints documented if changed

### 14. Git & PR Quality

- [ ] **Commit Messages**: Conventional Commits format
- [ ] **PR Size**: < 400 LOC or < 20 files
- [ ] **PR Description**: Complete (WHAT/WHY/HOW/TESTS)
- [ ] **No Merge Conflicts**: Branch up to date with main
- [ ] **Branch Name**: Follows convention `type/BS-XXX-description`

## Review Process

### 1. High-Level Review
- Read PR description
- Understand the problem being solved
- Check if approach makes sense
- Identify potential issues or concerns

### 2. Detailed Review
- Go through each file systematically
- Check against checklist items above
- Leave inline comments for specific issues
- Note patterns (good or bad)

### 3. Testing
- Pull branch locally if needed
- Run tests: `npm run test`
- Test manually if UI changes
- Check for edge cases

### 4. Provide Feedback

**For Issues:**
Use clear, actionable feedback:
```
❌ Issue: Hardcoded API key on line 42
💡 Suggestion: Move to environment variable and use process.env.API_KEY
```

**For Suggestions:**
```
💭 Consider: Could we extract this into a reusable hook?
```

**For Praise:**
```
✅ Nice: Clear error handling with user-friendly messages
```

### 5. Request Changes or Approve

**Request Changes if:**
- Security issues present
- Breaking changes without migration plan
- Tests missing for critical paths
- Does not follow project standards

**Approve if:**
- All critical items addressed
- Minor suggestions can be addressed in follow-up
- Tests pass and coverage adequate
- Follows project standards

## Output Format

Provide structured review:

### Summary
Brief overview of changes and overall assessment.

### Critical Issues 🔴
Must be fixed before merge:
- Issue 1
- Issue 2

### Suggestions 💭
Nice to have improvements:
- Suggestion 1
- Suggestion 2

### Positive Feedback ✅
What was done well:
- Good practice 1
- Good practice 2

### Testing Notes
- Manual testing results
- Test coverage assessment

### Recommendation
- ✅ Approve
- ⚠️ Approve with minor changes
- 🔴 Request changes


# Debug Issue

Systematic debugging workflow for identifying and resolving issues in Beauty Shop codebase.

## Objective
Identify the root cause of an issue and provide actionable solutions with minimal debugging overhead.

## Context
- Follow `.cursor/rules/24-observability_sentry.mdc` for error tracking
- Use structured logging to trace execution flow
- Check Sentry for error patterns and breadcrumbs

## Issue Information

**Describe the issue:**
- What is the expected behavior?
- What is the actual behavior?
- When did this start happening?
- Can you reproduce it consistently?

**Environment:**
- Where does it occur? (Local dev, staging, production)
- Browser/device (if frontend issue)
- User segment (if applicable)

## Debugging Workflow

### 1. Gather Information
- [ ] Review error message and stack trace
- [ ] Check Sentry for related errors and breadcrumbs
- [ ] Review recent code changes (git log)
- [ ] Check for related GitHub issues or PRs
- [ ] Verify environment variables and configuration

### 2. Reproduce the Issue
- [ ] Create minimal reproduction steps
- [ ] Try to reproduce locally
- [ ] Document exact steps to reproduce
- [ ] Check if issue occurs in different environments

### 3. Isolate the Problem
- [ ] Narrow down to specific file/function
- [ ] Add temporary logging/breakpoints
- [ ] Check input data and state
- [ ] Verify external dependencies (API, database)
- [ ] Review recent changes to affected code

### 4. Analyze Root Cause
- [ ] Review relevant code logic
- [ ] Check for edge cases
- [ ] Verify data types and validation
- [ ] Check for race conditions or timing issues
- [ ] Review error handling

### 5. Propose Solution
- [ ] Suggest fix with code example
- [ ] Consider side effects and edge cases
- [ ] Verify fix doesn't break existing functionality
- [ ] Add/update tests to prevent regression

## Common Issue Types

### Frontend Issues
**UI/Component Issues:**
- Check component props and state
- Verify conditional rendering logic
- Review CSS/styling conflicts
- Check browser console for errors

**State Management:**
- Review Zustand store state
- Check for race conditions in async updates
- Verify state initialization

**API Integration:**
- Check network tab for API calls
- Verify request/response format
- Check error handling for API failures

### Backend Issues
**MedusaJS/API Issues:**
- Review API endpoint logs
- Check database queries (use query logging)
- Verify authentication/authorization
- Check for database connection issues

**Server Actions:**
- Verify input validation
- Check error handling
- Review transaction logic
- Check for missing await statements

**Database Issues:**
- Review PostgreSQL logs
- Check for constraint violations
- Verify RLS policies (Supabase)
- Check for connection pool exhaustion

### E-commerce Specific
**Cart Issues:**
- Verify product variants and inventory
- Check cart state persistence
- Review pricing calculations

**Checkout Issues:**
- Review Stripe webhook logs
- Check payment intent status
- Verify order creation flow

**Product Management:**
- Check MedusaJS admin API
- Verify product/variant relationships
- Review inventory tracking

## Debugging Tools

### Logging
```typescript
// Structured logging example
console.log('[DEBUG] Function:', functionName, {
  input: sanitizedInput,
  state: currentState,
  timestamp: new Date().toISOString()
})
```

### Sentry Breadcrumbs
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.addBreadcrumb({
  category: 'checkout',
  message: 'Payment initiated',
  level: 'info',
  data: {
    orderId: order.id,
    amount: order.total
  }
})
```

### React DevTools
- Inspect component props and state
- Check component hierarchy
- Profile render performance

### Network Debugging
- Use browser Network tab
- Check request/response headers
- Verify payload format
- Check for CORS issues

## Output Format

Provide a structured report:

### Problem Summary
Brief description of the issue and its impact.

### Root Cause
Explanation of what is causing the issue.

### Affected Code
Reference to specific files and line numbers.

### Proposed Solution
```typescript
// Code example showing the fix
```

### Testing Steps
How to verify the fix works.

### Prevention
Suggestions to prevent similar issues (tests, validation, etc.).

## Checklist
- [ ] Issue reproduced consistently
- [ ] Root cause identified
- [ ] Solution proposed with code example
- [ ] Tests added/updated to prevent regression
- [ ] No PII in logs or error messages
- [ ] Sentry instrumentation added if needed


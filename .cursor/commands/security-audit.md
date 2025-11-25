# Security Audit

Comprehensive security audit for Beauty Shop code changes.

## Objective
Identify security vulnerabilities and ensure code follows security best practices for e-commerce platform handling payments and customer data.

## Context
- Follow `.cursor/rules/22-security_secrets.mdc`
- Beauty Shop handles sensitive data: customer PII, payment info, orders
- GDPR compliance required for Danish/Nordic market
- PCI DSS compliance required for payment handling

## Audit Scope

What to audit:
- [ ] Feature/component: `{{feature_name}}`
- [ ] API endpoints: `{{endpoints}}`
- [ ] Database changes: `{{tables}}`
- [ ] Authentication/authorization changes

## Security Checklist

### 1. Secrets & Credentials
Reference: `.cursor/rules/22-security_secrets.mdc`

- [ ] **No Hardcoded Secrets**: No API keys, passwords, tokens in code
- [ ] **Environment Variables**: All secrets use `process.env.`
- [ ] **No Secrets in Logs**: No sensitive data logged
- [ ] **No Secrets in Errors**: No secrets exposed in error messages
- [ ] **Git History**: No secrets in git history
- [ ] **Frontend Secrets**: No secrets exposed to client-side code

**Check:**
```bash
# Search for potential secrets
grep -r "api_key" --exclude-dir=node_modules
grep -r "password" --exclude-dir=node_modules
grep -r "secret" --exclude-dir=node_modules
```

### 2. Authentication & Authorization
**Clerk Integration:**
- [ ] **Auth Required**: Protected routes require authentication
- [ ] **Session Validation**: Server-side session validation
- [ ] **Token Verification**: JWT tokens verified server-side
- [ ] **Role Checks**: User roles/permissions verified
- [ ] **Admin Routes**: Admin routes properly protected

**Authorization:**
- [ ] **Resource Ownership**: Users can only access their own data
- [ ] **API Authorization**: API endpoints check permissions
- [ ] **Server Actions**: Actions verify user permissions
- [ ] **No Client-side Only Auth**: Auth checks on server, not just client

### 3. Input Validation
Reference: `.cursor/rules/12-forms_actions_validation.mdc`

- [ ] **All Inputs Validated**: Every user input validated
- [ ] **Zod Schemas**: Validation schemas for all forms/APIs
- [ ] **Type Safety**: TypeScript types enforced
- [ ] **Whitelist Approach**: Accept only known-good input
- [ ] **Length Limits**: String length limits enforced
- [ ] **Format Validation**: Email, phone, postal code formats validated

**Never Trust:**
- Query parameters
- Request body
- Headers
- Cookies
- File uploads

### 4. SQL Injection Prevention

- [ ] **Parameterized Queries**: All queries use parameters
- [ ] **ORM Usage**: Use Supabase client or MedusaJS ORM
- [ ] **No String Concatenation**: Never concatenate SQL strings
- [ ] **Input Sanitization**: User input sanitized

**Example:**
```typescript
// ❌ Bad - SQL injection risk
const query = `SELECT * FROM products WHERE id = '${userId}'`

// ✅ Good - parameterized query
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('id', userId)
```

### 5. XSS (Cross-Site Scripting) Prevention

- [ ] **Output Escaping**: All user content escaped/sanitized
- [ ] **React Auto-escaping**: Using React's JSX (auto-escapes)
- [ ] **Avoid dangerouslySetInnerHTML**: Only use when absolutely necessary with sanitization
- [ ] **Content Security Policy**: CSP headers configured
- [ ] **User-generated Content**: Product descriptions, reviews sanitized

**Sanitization:**
```typescript
import DOMPurify from 'isomorphic-dompurify'

// Sanitize user HTML
const clean = DOMPurify.sanitize(dirtyHTML)
```

### 6. CSRF (Cross-Site Request Forgery) Protection

- [ ] **CSRF Tokens**: State-changing operations have CSRF protection
- [ ] **SameSite Cookies**: Cookies use SameSite attribute
- [ ] **Verify Origin**: Check Origin/Referer headers
- [ ] **Server Actions**: Next.js server actions have built-in CSRF protection

### 7. Data Privacy & GDPR
Reference: `.cursor/rules/22-security_secrets.mdc`

- [ ] **No PII in Logs**: Never log personal data
- [ ] **No PII in Sentry**: Error tracking doesn't include PII
- [ ] **Data Minimization**: Only collect necessary data
- [ ] **Encryption at Rest**: Sensitive data encrypted in database
- [ ] **Encryption in Transit**: HTTPS everywhere
- [ ] **Right to Deletion**: User data can be deleted
- [ ] **Data Retention**: Old data properly deleted

**PII Examples:**
- Names, emails, phone numbers
- Addresses, postal codes
- Payment details
- Order history
- IP addresses

**Safe Logging:**
```typescript
// ❌ Bad
console.log('User:', user.email, user.address)

// ✅ Good
console.log('User action', { userId: user.id, action: 'checkout' })
```

### 8. Payment Security (Stripe)
**PCI DSS Compliance:**
- [ ] **No Card Storage**: Never store card numbers
- [ ] **Stripe.js**: Use Stripe.js for card handling
- [ ] **Server-side Only**: Stripe secret key only on server
- [ ] **Webhook Verification**: Verify Stripe webhook signatures
- [ ] **Amount Validation**: Verify payment amounts server-side
- [ ] **Idempotency**: Use idempotency keys for payment operations

```typescript
// ✅ Verify webhook signature
const signature = request.headers.get('stripe-signature')
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
)
```

### 9. API Security

- [ ] **Rate Limiting**: API endpoints rate-limited
- [ ] **Input Validation**: All inputs validated
- [ ] **Error Messages**: Don't leak sensitive info in errors
- [ ] **CORS**: Proper CORS configuration
- [ ] **API Versioning**: Versioned endpoints (`/api/v1/`)
- [ ] **Authentication**: API requires authentication
- [ ] **HTTPS Only**: No HTTP endpoints

**Error Handling:**
```typescript
// ❌ Bad - leaks info
catch (error) {
  return { error: error.message } // May contain sensitive paths
}

// ✅ Good - safe error
catch (error) {
  console.error('Order creation failed', { orderId })
  return { error: 'Unable to create order. Please try again.' }
}
```

### 10. Database Security (Supabase)
Reference: `.cursor/rules/30-database_postgres.mdc`

- [ ] **Row Level Security (RLS)**: RLS policies on all tables
- [ ] **Least Privilege**: Service role only where necessary
- [ ] **User Context**: RLS uses authenticated user
- [ ] **No Direct Queries**: Use Supabase client, not raw SQL
- [ ] **Connection Security**: Encrypted connections only

**RLS Policy Example:**
```sql
-- Users can only read their own orders
CREATE POLICY "Users can view own orders"
ON orders FOR SELECT
USING (auth.uid() = user_id);
```

### 11. File Upload Security

- [ ] **File Type Validation**: Whitelist allowed file types
- [ ] **File Size Limits**: Maximum file size enforced
- [ ] **Virus Scanning**: Files scanned for malware
- [ ] **Separate Storage**: Files stored separate from code
- [ ] **Signed URLs**: Use signed URLs for file access
- [ ] **No Executable Files**: Block .exe, .sh, .bat, etc.

### 12. Session Security

- [ ] **Secure Cookies**: HttpOnly, Secure, SameSite flags
- [ ] **Session Expiry**: Sessions expire after timeout
- [ ] **Session Fixation**: Generate new session on login
- [ ] **Logout Properly**: Sessions invalidated on logout

### 13. Third-Party Dependencies

- [ ] **Up-to-date**: Dependencies updated regularly
- [ ] **No Known Vulnerabilities**: Run `npm audit`
- [ ] **Minimal Dependencies**: Only necessary packages
- [ ] **Trusted Sources**: Use well-maintained packages
- [ ] **Lock File**: package-lock.json committed

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### 14. Error Handling

- [ ] **Generic Errors**: User-facing errors are generic
- [ ] **Detailed Logging**: Detailed errors logged server-side
- [ ] **No Stack Traces**: No stack traces exposed to users
- [ ] **Graceful Degradation**: Errors handled gracefully

### 15. E-commerce Specific

**Order Security:**
- [ ] **Price Validation**: Prices validated server-side
- [ ] **Inventory Checks**: Stock verified before order creation
- [ ] **Order Tampering**: Order details not modifiable by user
- [ ] **Idempotency**: Duplicate orders prevented

**Cart Security:**
- [ ] **Server-side Pricing**: Prices come from server, not client
- [ ] **Quantity Limits**: Max quantity enforced
- [ ] **Cart Hijacking**: Cart tied to authenticated session

**Admin Access:**
- [ ] **Admin Routes**: Properly protected
- [ ] **Admin API**: Separate from customer API
- [ ] **Audit Logging**: Admin actions logged

## Testing

### Automated Security Testing

```bash
# NPM audit
npm audit

# TypeScript strict checks
npm run type-check

# ESLint security rules
npm run lint
```

### Manual Testing

#### Authentication Testing:
1. Try accessing protected routes without auth
2. Try accessing other users' data
3. Test session expiry
4. Test logout functionality

#### Input Validation:
1. Test with special characters: `<script>`, `' OR '1'='1`
2. Test with very long inputs
3. Test with unexpected data types
4. Test file upload with malicious files

#### API Testing:
1. Test without authentication
2. Test with invalid tokens
3. Test rate limiting
4. Test CORS with different origins

## Common Vulnerabilities & Fixes

### Vulnerability: Exposed API Key
```typescript
// ❌ Bad
const STRIPE_KEY = 'sk_live_...'

// ✅ Good
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
```

### Vulnerability: SQL Injection
```typescript
// ❌ Bad
const query = `SELECT * FROM users WHERE email = '${email}'`

// ✅ Good
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', email)
```

### Vulnerability: XSS
```tsx
// ❌ Bad
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Good
<div>{userContent}</div> // React auto-escapes
```

### Vulnerability: Missing Authorization
```typescript
// ❌ Bad
export async function deleteOrder(orderId: string) {
  return await db.orders.delete(orderId)
}

// ✅ Good
export async function deleteOrder(orderId: string, userId: string) {
  // Verify ownership
  const order = await db.orders.findUnique({ where: { id: orderId } })
  if (order.userId !== userId) {
    throw new Error('Unauthorized')
  }
  return await db.orders.delete(orderId)
}
```

## Output Format

### Security Audit Report

#### Critical Vulnerabilities 🔴
Must be fixed immediately:
1. Vulnerability description
   - Risk: High/Medium/Low
   - Location: file:line
   - Fix: code example

#### Security Issues 🟡
Should be addressed:
1. Issue description
   - Fix suggestion

#### Best Practice Improvements 🟢
Recommendations:
1. Improvement description

#### Secure Code ✅
What's done well:
- Good security practice examples

## Checklist
- [ ] No secrets in code
- [ ] All inputs validated
- [ ] Authentication/authorization checks present
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection where needed
- [ ] No PII in logs
- [ ] Payment handling secure (PCI compliant)
- [ ] RLS policies on database tables
- [ ] Dependencies up-to-date (npm audit clean)
- [ ] Error messages don't leak sensitive info


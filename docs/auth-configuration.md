# Authentication Configuration & Session Policy

## Overview

Huddle uses Clerk for authentication with JWT tokens. This document outlines the authentication configuration, session policies, and token handling.

## Clerk Configuration

### Environment Variables

Required environment variables:
- `CLERK_SECRET_KEY`: Server-side secret key for token verification
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Client-side publishable key (public)

### Session Configuration

**Current Settings** (verify in Clerk Dashboard):
- Session Lifetime: Default (typically 7 days)
- Rolling Sessions: Enabled (session extends on activity)
- Refresh Token: Automatic via Clerk SDK

### Token Handling

1. **Client-side** (`apps/web/lib/api/client.ts`):
   - Uses `getToken({ skipCache: true })` to ensure fresh tokens
   - Automatically redirects to `/auth` on 401 errors
   - Implements periodic token check (every 5 minutes)

2. **Server-side** (`apps/web/lib/auth.ts`):
   - Verifies JWT tokens using `@clerk/backend`
   - Returns structured 401 errors with `WWW-Authenticate` header
   - Logs auth events (no PII) for debugging

3. **Edge Functions** (`supabase/functions/**`):
   - Validates tokens using `verifyClerkToken` helper
   - Returns 401 with proper error messages
   - Never logs full tokens (only presence checks)

## Session Refresh Strategy

### Automatic Refresh
- Clerk SDK handles token refresh automatically
- Tokens are refreshed before expiration
- Client-side monitoring checks token validity every 5 minutes

### Manual Refresh
- `getToken({ skipCache: true })` forces fresh token fetch
- Used in critical paths (API requests, ProtectedRoute checks)

## Security Best Practices

### ✅ Implemented
- No tokens logged in console/logs
- Structured error responses with `WWW-Authenticate` header
- Automatic redirect to `/auth` on token expiration
- Rate limiting on API routes
- Token validation in all protected routes

### ⚠️ To Review
- Session lifetime settings in Clerk Dashboard
- Refresh token rotation policy
- Token storage (Clerk handles this automatically)

## Testing

Run authentication flow tests:
```bash
tsx scripts/test-auth-flow.ts
```

Tests verify:
- Unauthenticated access redirects
- Invalid tokens return 401
- Expired tokens are handled
- Optional auth routes work correctly

## Troubleshooting

### Token Expired Errors
1. Check Clerk Dashboard for session settings
2. Verify `CLERK_SECRET_KEY` is set correctly
3. Check browser console for auth errors
4. Review server logs (no PII) for auth failures

### Redirect Loops
1. Ensure `/auth` route is not protected
2. Check middleware route matcher
3. Verify `redirect_url` parameter handling

## Future Improvements

- [ ] Implement token refresh retry logic
- [ ] Add session timeout warnings (5 min before expiry)
- [ ] Consider implementing refresh token rotation
- [ ] Add E2E tests for auth flow


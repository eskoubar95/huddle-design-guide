# Authentication Testing

## Test Script

The `test-auth-flow.ts` script validates authentication behavior:

```bash
tsx scripts/test-auth-flow.ts
```

## What It Tests

1. **Unauthenticated Access**: Protected routes redirect to `/auth`
2. **Missing Token**: API routes return 401 with `WWW-Authenticate` header
3. **Invalid Token**: Malformed tokens return 401
4. **Expired Token**: Expired tokens return 401
5. **Optional Auth**: Routes with optional auth work without token

## Environment Setup

Set `NEXT_PUBLIC_APP_URL` if testing against non-localhost:
```bash
export NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Manual Testing Checklist

### Token Expiration
1. Sign in to the app
2. Wait for token to expire (or manually expire in Clerk Dashboard)
3. Try to access protected route
4. Verify redirect to `/auth` with toast notification

### Invalid Token
1. Open browser DevTools
2. Intercept API request
3. Replace token with invalid value
4. Verify 401 response with proper error message

### Session Refresh
1. Sign in to the app
2. Monitor network tab
3. Verify token refresh happens automatically
4. Check `AuthSessionMonitor` logs (every 5 minutes)

## Expected Behavior

- ✅ All protected routes require authentication
- ✅ 401 errors include `WWW-Authenticate` header
- ✅ Expired tokens trigger automatic redirect
- ✅ Toast notification shown before redirect
- ✅ No tokens logged in console/logs


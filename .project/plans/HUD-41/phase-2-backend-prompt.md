# Phase 2: Backend Validation Service + Middleware - Implementation Instructions

## Context
You are the **backend agent** implementing Phase 2 of HUD-41 (User Profile Validation & Verification).

**Phase 1 (Database) is COMPLETE:**
- `profiles` table has: first_name, last_name, phone, stripe_identity_verification_status, stripe_identity_verification_id, is_profile_complete (computed)
- `shipping_addresses` table exists with RLS enabled
- `identity_verification_review_requests` table exists
- All marketplace user_id columns are TEXT (Clerk-compatible)
- TypeScript types regenerated in `apps/web/lib/supabase/types.ts`

**Supabase Project ID:** `trbyclravrmmhxplocsr`

## Your Tasks

### Task 2.1: Create ProfileValidationService
**File:** `apps/web/lib/services/profile-validation-service.ts` (NEW)

**Requirements:**
- Export class `ProfileValidationService`
- Use service role Supabase client (bypass RLS) - pattern: `createServiceClient()` from `@/lib/supabase/server`
- Implement these methods:

```typescript
async getProfileCompleteness(userId: string): Promise<{
  isProfileComplete: boolean;
  hasDefaultShippingAddress: boolean;
  missingFields: string[];
}>

async getSellerEligibility(userId: string): Promise<{
  isProfileComplete: boolean;
  hasDefaultShippingAddress: boolean;
  isIdentityVerified: boolean;
  missingFields: string[];
  reason?: 'profile_incomplete' | 'missing_default_address' | 'identity_required' | 'identity_rejected' | 'identity_pending';
}>

async getBuyerEligibility(userId: string): Promise<{
  isProfileComplete: boolean;
  hasDefaultShippingAddress: boolean;
  missingFields: string[];
  reason?: 'profile_incomplete' | 'missing_default_address';
}>
```

**Data sources:**
- Query `profiles` table: check first_name, last_name, phone (use is_profile_complete if helpful)
- Query `shipping_addresses` table: check if user has a row with `is_default = true`
- For seller: check `stripe_identity_verification_status = 'verified'`

**Missing fields logic:**
- If first_name is null/empty → add "first_name" to missingFields
- If last_name is null/empty → add "last_name" to missingFields
- If phone is null/empty → add "phone" to missingFields
- If no default shipping address → add "default_shipping_address" to missingFields
- For seller only: if identity not verified → add "identity_verification" to missingFields

**Status mapping for sellers:**
- `stripe_identity_verification_status = 'verified'` → isIdentityVerified = true
- `= 'pending'` → reason = 'identity_pending'
- `= 'rejected'` → reason = 'identity_rejected'
- `= null` or other → reason = 'identity_required'

**Pattern to follow:**
- See `apps/web/lib/services/profile-service.ts` for service class structure
- Use `ApiError` from `@/lib/api/errors` for error handling
- Use Supabase types from `@/lib/supabase/types`

### Task 2.2: Create Profile Validation Middleware
**File:** `apps/web/lib/middleware/profile-validation.ts` (NEW)

**Requirements:**
- Export two middleware functions that call `requireAuth` and then validate profile

```typescript
export async function requireBuyerProfile(req: Request): Promise<AuthResult>
export async function requireSellerVerification(req: Request): Promise<AuthResult>
```

**Logic for requireBuyerProfile:**
1. Call `requireAuth(req)` to get `{ userId, profileId }`
2. Use `ProfileValidationService` to check buyer eligibility
3. If eligible → return `{ userId, profileId }`
4. If NOT eligible → throw `ApiError` with:
   - code: reason (e.g., 'profile_incomplete', 'missing_default_address')
   - message: user-friendly message (e.g., "Please complete your profile to continue")
   - statusCode: 403
   - details: `{ redirectUrl: '/profile/complete', missingFields, reason }`

**Logic for requireSellerVerification:**
- Same as buyer but also checks identity verification
- If identity is pending → throw with reason 'identity_pending', redirectUrl '/seller/verify-identity'
- If identity is rejected → throw with reason 'identity_rejected', redirectUrl '/seller/verify-identity'
- If identity missing → throw with reason 'identity_required', redirectUrl '/seller/verify-identity'

**Imports needed:**
- `requireAuth, AuthResult` from `@/lib/auth`
- `ApiError` from `@/lib/api/errors`
- `ProfileValidationService` from `@/lib/services/profile-validation-service`

**Pattern to follow:**
- See `requireAuth` in `apps/web/lib/auth.ts` for error handling pattern
- Use consistent error shape with `ApiError`

## Success Criteria
1. TypeScript compiles: `npm run typecheck` in apps/web passes
2. Linting passes: `npm run lint` in apps/web passes
3. Build succeeds: `npm run build` in apps/web passes
4. Services export correct types (no type errors in imports)

## Important Patterns from Codebase

**Service role client:**
```typescript
const { createServiceClient } = await import("@/lib/supabase/server");
const supabase = await createServiceClient();
```

**Error throwing:**
```typescript
throw new ApiError("FORBIDDEN", "User-friendly message", 403, {
  redirectUrl: "/profile/complete",
  missingFields: ["first_name", "phone"],
  reason: "profile_incomplete"
});
```

**Auth result type:**
```typescript
export interface AuthResult {
  userId: string;
  profileId: string;
}
```

## Output Requirements
When complete, log to `/Users/nicklaseskou/Documents/GitHub/huddle-design-guide/.project/plans/HUD-41/agent-logs/backend.log`:
- Timestamp
- Files created
- Any warnings or issues encountered
- Verification results (typecheck, lint, build)

## Notes
- Do NOT create API routes yet (that's Phase 3)
- Do NOT create frontend components (that's Phase 4)
- Focus ONLY on service layer + middleware
- Use existing patterns from profile-service.ts
- No need to write tests yet (Phase 7)

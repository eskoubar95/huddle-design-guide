# Email Verification Flow Implementation Plan

## Overview

Implementer email verification flow i sign up processen, så brugere kan indtaste verification code og gennemføre sign up. Dette er en kritisk blocker der forhindrer brugere i at oprette accounts korrekt.

**Hvorfor:** Nuværende sign up flow stopper efter at have sendt verification email, men der er ingen UI til at indtaste verification code. Brugeren bliver IKKE oprettet i Clerk før email er verificeret (korrekt Clerk adfærd), hvilket betyder at brugeren ikke vises i Clerk Dashboard.

**Mål:** Brugere kan gennemføre sign up flow, verificere email, og blive oprettet i Clerk Dashboard.

---

## Linear Issue

**Issue:** [HUD-19](https://linear.app/huddle-world/issue/HUD-19/bug-email-verification-flow-mangler-brugere-kan-ikke-gennemfore-sign)  
**Status:** Backlog  
**Priority:** Urgent (1)  
**Labels:** Frontend, Bug  
**Team:** Huddle World  
**Branch:** `nicklaseskou95/hud-19-bug-email-verification-flow-mangler-brugere-kan-ikke`  
**Created:** 2025-11-27  
**Updated:** 2025-11-27

---

## Current State Analysis

### Nuværende Tilstand:

**Auth Page (`apps/web/app/(auth)/auth/page.tsx`):**
- ✅ Sign up form eksisterer med username, email, password, confirmPassword
- ✅ `signUp.create()` kaldes korrekt
- ✅ `prepareEmailAddressVerification()` kaldes når `missing_requirements` status
- ❌ **Flow stopper efter at have sendt verification email** (linje 124-129)
- ❌ **Ingen UI til at indtaste verification code**
- ❌ **Ingen `attemptEmailAddressVerification()` implementation**

**Clerk Configuration:**
- ✅ Environment variabler sat korrekt (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`)
- ✅ ClerkProvider sat op i `apps/web/app/layout.tsx`
- ✅ Email verification er aktiveret i Clerk Dashboard
- ✅ SSO er aktiveret (Google, Facebook, Discord) - skal tænkes ind i flow

**UI Components:**
- ✅ `InputOTP` komponent eksisterer (`apps/web/components/ui/input-otp.tsx`)
- ✅ `Input`, `Label`, `Button` komponenter eksisterer
- ✅ Toast notifications (`sonner`) bruges til feedback

### Key Discoveries:

1. **Root Cause:** Flow stopper ved linje 129 i `auth/page.tsx` efter at have sendt verification email
2. **Clerk Behavior:** Brugeren bliver IKKE oprettet i Clerk før email er verificeret (korrekt adfærd)
3. **SSO Consideration:** SSO providers (Google, Facebook, Discord) bypasser email verification automatisk - kun email/password sign up kræver verification
4. **Verification Code:** Clerk sender 6-cifret verification code (standard)
5. **Existing Component:** `InputOTP` komponent kan bruges til verification code input

---

## Desired End State

### User Flow:

1. **Email/Password Sign Up:**
   - Bruger udfylder sign up form
   - System sender verification email
   - UI skifter til verification code input
   - Bruger indtaster 6-cifret code
   - System verificerer code via `attemptEmailAddressVerification()`
   - Ved succes: Sign up gennemføres, bruger oprettes i Clerk, redirect til dashboard
   - Ved fejl: Vis fejlbesked, tillad resend code

2. **SSO Sign Up (Google/Facebook/Discord):**
   - Bruger klikker på SSO provider button
   - OAuth flow gennemføres automatisk
   - Email verification sker automatisk (SSO providers er pre-verified)
   - Redirect til dashboard

### Verification Criteria:

- ✅ Email verification flow er implementeret med input til verification code
- ✅ State håndterer verification step korrekt
- ✅ `attemptEmailAddressVerification()` kaldes efter code input
- ✅ Efter succesfuld verification, gennemføres sign up og brugeren oprettes i Clerk
- ✅ Brugeren vises i Clerk Dashboard efter verification
- ✅ Error handling for invalid/expired codes
- ✅ Resend verification code funktionalitet
- ✅ SSO flow fungerer uafhængigt (ingen verification nødvendig)
- ✅ Auto-redirect til dashboard efter succesfuld verification (bedst mulig UX)
- ✅ 6-cifret verification code input (Clerk standard)

---

## What We're NOT Doing

- ❌ **Ikke implementere SSO buttons:** SSO er allerede konfigureret i Clerk Dashboard, men vi skal sikre at SSO flow ikke bliver påvirket af email verification changes
- ❌ **Ikke ændre Clerk configuration:** Email verification er allerede aktiveret i Clerk Dashboard
- ❌ **Ikke implementere onboarding flow:** Det kommer senere, men vi skal sikre redirect til dashboard er klar til onboarding integration
- ❌ **Ikke ændre login flow:** Kun sign up flow påvirkes
- ❌ **Ikke implementere password reset:** Det er out of scope for denne ticket
- ❌ **Ikke ændre backend auth logic:** Kun frontend auth page ændres

---

## Implementation Approach

**Strategi:** Implementer verification flow i samme komponent med state management. Brug eksisterende `InputOTP` komponent til code input. Håndter både email/password og SSO flows korrekt.

**Phase Sequence:**
1. **Phase 1:** State Management & Verification UI - Tilføj state og verification code input UI
2. **Phase 2:** Verification Logic - Implementer `attemptEmailAddressVerification()` og success handling
3. **Phase 3:** Resend & Error Handling - Tilføj resend funktionalitet og forbedret error handling
4. **Phase 4:** Testing & Verification - Test end-to-end flow og verificer Clerk Dashboard integration

---

## Phase 1: State Management & Verification UI

### Overview

Tilføj state management til at håndtere verification step og implementer verification code input UI. Skift UI fra sign up form til verification form når `missing_requirements` status opstår.

### Changes Required:

#### 1. Add Verification State

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj state variabler til at håndtere verification step

```typescript
// Eksisterende state (linje 34-39)
const [isLogin, setIsLogin] = useState(true);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [username, setUsername] = useState("");
const [isSubmitting, setIsSubmitting] = useState(false);

// Tilføj nye state variabler efter linje 39:
const [isVerifying, setIsVerifying] = useState(false);
const [verificationCode, setVerificationCode] = useState("");
const [isResending, setIsResending] = useState(false);
```

**Rationale:** State til at tracke verification step, code input, og resend status

#### 2. Update handleSignup to Set Verification State

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Opdater `handleSignup` funktion (linje 105-156) til at sætte verification state i stedet for at returnere

```typescript
// Eksisterende kode (linje 123-130):
if (result.status === 'missing_requirements') {
  await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
  toast.info("Please check your email for a verification code");
  // In a real app, you'd redirect to a verification page
  // For now, we'll just show a message
  return;  // ❌ Stopper her - brugeren er IKKE oprettet endnu!
}

// Erstat med:
if (result.status === 'missing_requirements') {
  await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
  setIsVerifying(true); // Skift til verification step
  toast.info("Please check your email for a verification code");
  return; // Stop sign up flow, vis verification UI
}
```

**Rationale:** Skift til verification step i stedet for at stoppe flowet

#### 3. Import InputOTP Components

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj import efter linje 10

```typescript
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
```

**Rationale:** Brug eksisterende InputOTP komponent til verification code input

#### 4. Add Verification Code Input UI

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj verification form UI efter sign up form (efter linje 292, før closing div)

```typescript
{/* Verification Code Input - vises når isVerifying er true */}
{isVerifying && !isLogin && (
  <div className="space-y-4">
    <div className="text-center">
      <h2 className="text-2xl font-semibold mb-2">Verify your email</h2>
      <p className="text-sm text-muted-foreground">
        We sent a verification code to <span className="font-medium">{email}</span>
      </p>
    </div>

    <form onSubmit={handleVerification} className="space-y-4">
      <div>
        <Label htmlFor="verification-code">Verification Code</Label>
        <div className="mt-2 flex justify-center">
          <InputOTP
            maxLength={6}
            value={verificationCode}
            onChange={(value) => setVerificationCode(value)}
            disabled={isSubmitting}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Enter the 6-digit code from your email
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting || verificationCode.length !== 6}>
        {isSubmitting ? "Verifying..." : "Verify Email"}
      </Button>

      <div className="text-center">
        <button
          type="button"
          onClick={handleResendCode}
          disabled={isResending}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isResending ? "Sending..." : "Resend code"}
        </button>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={() => {
            setIsVerifying(false);
            setVerificationCode("");
          }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Back to sign up
        </button>
      </div>
    </form>
  </div>
)}
```

**Rationale:** Verification UI med 6-cifret code input, resend funktionalitet, og back button

#### 5. Add Clerk CAPTCHA Element

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj Clerk CAPTCHA widget element i sign up form (før submit button)

```typescript
// Tilføj efter confirm password field, før submit button:
{/* Clerk CAPTCHA widget - required for bot protection */}
<div id="clerk-captcha" className="flex justify-center" />
```

**Rationale:** Clerk kræver `clerk-captcha` DOM element for Smart CAPTCHA. Uden dette element vises warning i console.

#### 6. Hide Sign Up Form When Verifying

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Opdater sign up form rendering (linje 231) til at skjule når verifying

```typescript
// Eksisterende (linje 231):
) : (
  <form onSubmit={handleSignup} className="space-y-4">

// Erstat med:
) : !isVerifying ? (
  <form onSubmit={handleSignup} className="space-y-4">
```

**Rationale:** Skjul sign up form når verification step er aktiv

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Sign up form vises korrekt
- [ ] Efter sign up submit, skifter UI til verification code input
- [ ] Verification code input viser 6 slots korrekt
- [ ] Code input accepterer kun tal (0-9)
- [ ] "Back to sign up" button skjuler verification UI og viser sign up form igen
- [ ] Email adresse vises korrekt i verification message

**Note:** Clerk CAPTCHA element (`<div id="clerk-captcha">`) er tilføjet i sign up form for at fjerne console warning. Dette sikrer korrekt bot protection integration.

**⚠️ PAUSE HERE** - Manual approval before Phase 2

---

## Phase 2: Verification Logic

### Overview

Implementer `attemptEmailAddressVerification()` flow og håndter succesfuld verification. Gennemfør sign up og redirect til dashboard.

### Changes Required:

#### 1. Implement handleVerification Function

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj ny funktion efter `handleSignup` (efter linje 156)

```typescript
const handleVerification = async (e: React.FormEvent) => {
  e.preventDefault();

  if (verificationCode.length !== 6) {
    toast.error("Please enter a valid 6-digit code");
    return;
  }

  try {
    setIsSubmitting(true);

    if (!signUp) {
      toast.error("Authentication service not available");
      return;
    }

    // Attempt email verification
    const result = await signUp.attemptEmailAddressVerification({
      code: verificationCode,
    });

    if (result.status === 'complete') {
      // Verification successful - complete sign up
      await setActiveSignUp({ session: result.createdSessionId });
      toast.success("Email verified! Account created successfully.");
      
      // Redirect to dashboard (onboarding flow kommer senere)
      const redirectUrl = searchParams.get("redirect_url") || "/";
      router.push(redirectUrl);
    } else {
      // Should not happen, but handle just in case
      toast.error("Verification incomplete. Please try again.");
    }
  } catch (error) {
    if (error instanceof Error) {
      // Handle specific Clerk errors
      if (error.message.includes("form_code_incorrect")) {
        toast.error("Invalid verification code. Please check and try again.");
        setVerificationCode(""); // Clear input
      } else if (error.message.includes("form_code_expired")) {
        toast.error("Verification code has expired. Please request a new one.");
        setVerificationCode(""); // Clear input
      } else {
        toast.error(error.message || "Verification failed. Please try again.");
      }
    } else {
      toast.error("An unexpected error occurred");
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

**Rationale:** Verificer code, gennemfør sign up ved succes, håndter fejl korrekt

#### 2. Implement handleResendCode Function

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj ny funktion efter `handleVerification`

```typescript
const handleResendCode = async () => {
  try {
    setIsResending(true);

    if (!signUp) {
      toast.error("Authentication service not available");
      return;
    }

    // Resend verification code
    await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
    toast.success("Verification code sent! Please check your email.");
    setVerificationCode(""); // Clear existing code
  } catch (error) {
    if (error instanceof Error) {
      toast.error(error.message || "Failed to resend code. Please try again.");
    } else {
      toast.error("An unexpected error occurred");
    }
  } finally {
    setIsResending(false);
  }
};
```

**Rationale:** Tillad bruger at anmode om ny verification code hvis den er udløbet eller mistet

#### 3. Reset Verification State on Form Switch

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Opdater login/signup toggle buttons (linje 170-189) til at reset verification state

```typescript
// Eksisterende (linje 170-171):
<button
  onClick={() => setIsLogin(true)}

// Erstat med:
<button
  onClick={() => {
    setIsLogin(true);
    setIsVerifying(false);
    setVerificationCode("");
  }}

// Og for sign up button (linje 180-181):
<button
  onClick={() => setIsLogin(false)}

// Erstat med:
<button
  onClick={() => {
    setIsLogin(false);
    setIsVerifying(false);
    setVerificationCode("");
  }}
```

**Rationale:** Reset verification state når bruger skifter mellem login og sign up

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Verification code kan indtastes korrekt
- [ ] Ved korrekt code: Sign up gennemføres, bruger oprettes i Clerk, redirect til dashboard
- [ ] Ved forkert code: Fejlbesked vises, code input clears
- [ ] Ved udløbet code: Fejlbesked vises, code input clears
- [ ] Resend code funktionalitet virker korrekt
- [ ] Efter succesfuld verification: Bruger vises i Clerk Dashboard
- [ ] Redirect til dashboard fungerer korrekt (klar til onboarding integration)

**⚠️ PAUSE HERE** - Manual approval before Phase 3

---

## Phase 3: Resend & Error Handling Polish

### Overview

Forbedre error handling, tilføj loading states, og sikre bedre UX med tydelige fejlbeskeder og feedback.

### Changes Required:

#### 1. Improve Error Messages

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Forbedre error handling i `handleVerification` med mere specifikke beskeder

```typescript
// Eksisterende error handling i handleVerification:
if (error.message.includes("form_code_incorrect")) {
  toast.error("Invalid verification code. Please check and try again.");
  setVerificationCode(""); // Clear input
} else if (error.message.includes("form_code_expired")) {
  toast.error("Verification code has expired. Please request a new one.");
  setVerificationCode(""); // Clear input
}

// Tilføj flere specifikke fejl:
else if (error.message.includes("form_code_invalid")) {
  toast.error("Invalid code format. Please enter a 6-digit code.");
  setVerificationCode("");
} else if (error.message.includes("rate_limit")) {
  toast.error("Too many attempts. Please wait a moment and try again.");
} else {
  toast.error("Verification failed. Please try again or request a new code.");
}
```

**Rationale:** Mere specifikke fejlbeskeder giver bedre UX

#### 2. Add Loading States to Resend Button

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Opdater resend button UI (i verification form) til at vise loading state

```typescript
// Eksisterende resend button:
<button
  type="button"
  onClick={handleResendCode}
  disabled={isResending}
  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
>
  {isResending ? "Sending..." : "Resend code"}
</button>

// Forbedret med loading indicator:
<button
  type="button"
  onClick={handleResendCode}
  disabled={isResending || isSubmitting}
  className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
>
  {isResending && (
    <div className="w-3 h-3 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
  )}
  {isResending ? "Sending..." : "Resend code"}
</button>
```

**Rationale:** Vis loading state og disable button under resend operation

#### 3. Add Rate Limiting Feedback

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj cooldown periode efter resend (optional, men god UX)

```typescript
// Tilføj state efter linje 39:
const [resendCooldown, setResendCooldown] = useState(0);

// Opdater handleResendCode:
const handleResendCode = async () => {
  if (resendCooldown > 0) {
    toast.info(`Please wait ${resendCooldown} seconds before requesting a new code.`);
    return;
  }

  try {
    setIsResending(true);
    // ... eksisterende resend logic ...
    
    // Set 60 second cooldown
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  } catch (error) {
    // ... eksisterende error handling ...
  } finally {
    setIsResending(false);
  }
};

// Opdater resend button UI:
{isResending ? "Sending..." : resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
```

**Rationale:** Forhindre spam af resend requests og giv klar feedback

#### 4. Add Accessibility Improvements

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj ARIA labels og keyboard navigation support

```typescript
// I verification form:
<InputOTP
  maxLength={6}
  value={verificationCode}
  onChange={(value) => setVerificationCode(value)}
  disabled={isSubmitting}
  aria-label="Email verification code"
>
  {/* ... */}
</InputOTP>

// Tilføj aria-describedby for screen readers:
<p 
  id="verification-code-description"
  className="text-xs text-muted-foreground text-center mt-2"
>
  Enter the 6-digit code from your email
</p>
```

**Rationale:** Bedre accessibility for screen readers og keyboard navigation

#### 5. Add Sentry Error Capture (Optional Enhancement)

**File:** `apps/web/app/(auth)/auth/page.tsx`  
**Changes:** Tilføj Sentry error capture for production monitoring (optional)

```typescript
// Tilføj import efter linje 10:
import * as Sentry from "@sentry/nextjs";

// I handleVerification catch block, efter error handling:
catch (error) {
  if (error instanceof Error) {
    // ... eksisterende error handling ...
    
    // Optional: Capture errors in Sentry for production monitoring
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        tags: {
          component: 'auth-verification',
          error_type: error.message.includes("form_code") ? 'verification_error' : 'unknown_error',
        },
        extra: {
          verification_step: 'email_verification',
          // Note: Do NOT log verification code or PII
        },
      });
    }
  }
  // ... rest of error handling ...
}
```

**Rationale:** Production error monitoring for verification failures. Helps identify issues in production.  
**Note:** This is optional - errors are already handled gracefully for users. Only add if Sentry is configured and you want production monitoring.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Alle error messages er tydelige og actionable
- [ ] Loading states vises korrekt under alle operations
- [ ] Resend cooldown fungerer korrekt (hvis implementeret)
- [ ] Keyboard navigation fungerer (Tab, Enter, Escape)
- [ ] Screen reader kan læse verification form korrekt
- [ ] Alle buttons har korrekt disabled states
- [ ] Browser refresh under verification håndteres korrekt (state resets, user can restart)

**⚠️ PAUSE HERE** - Manual approval before Phase 4

---

## Phase 4: Testing & Verification

### Overview

Test end-to-end flow, verificer Clerk Dashboard integration, og test edge cases. Sikre at SSO flow ikke er påvirket.

### Changes Required:

#### 1. Test Email/Password Sign Up Flow

**Manual Test Steps:**
1. Gå til `/auth` page
2. Klik på "Sign Up" tab
3. Udfyld sign up form (username, email, password, confirmPassword)
4. Submit form
5. Verificer: UI skifter til verification code input
6. Verificer: Email modtages med 6-cifret code
7. Indtast korrekt code
8. Verificer: Sign up gennemføres, redirect til dashboard
9. Verificer: Bruger vises i Clerk Dashboard

**Expected Results:**
- ✅ Alle steps gennemføres uden fejl
- ✅ Bruger oprettes i Clerk Dashboard
- ✅ Redirect til dashboard fungerer

#### 2. Test Error Cases

**Manual Test Steps:**
1. Test med forkert code → Fejlbesked vises
2. Test med udløbet code → Fejlbesked vises
3. Test resend code → Ny code sendes
4. Test med tom code → Submit disabled
5. Test med ugyldig code format → Fejlbesked vises

**Expected Results:**
- ✅ Alle error cases håndteres korrekt
- ✅ Fejlbeskeder er tydelige og actionable

#### 3. Test SSO Flow (Verificer Ingen Regression)

**Manual Test Steps:**
1. Gå til `/auth` page
2. Klik på SSO provider (Google/Facebook/Discord) - hvis buttons eksisterer
3. Gennemfør OAuth flow
4. Verificer: Email verification sker automatisk (SSO providers er pre-verified)
5. Verificer: Redirect til dashboard fungerer

**Expected Results:**
- ✅ SSO flow fungerer uafhængigt af email verification changes
- ✅ Ingen regression i SSO authentication

**Note:** Hvis SSO buttons ikke eksisterer endnu, dokumenter at SSO er konfigureret i Clerk Dashboard og vil fungere automatisk når buttons tilføjes.

#### 4. Test State Management

**Manual Test Steps:**
1. Start sign up flow
2. Skift til verification step
3. Klik "Back to sign up" → Verificer state resets
4. Skift mellem Login/Sign Up tabs → Verificer verification state resets
5. Test med browser refresh → Verificer state håndteres korrekt (state resets, user kan starte forfra)
6. Test med browser back button → Verificer navigation fungerer korrekt

**Expected Results:**
- ✅ State management fungerer korrekt
- ✅ Ingen state leaks eller bugs
- ✅ Browser refresh resets state (forventet adfærd - user kan starte sign up forfra)
- ✅ Browser navigation (back/forward) fungerer korrekt

#### 5. Verify Clerk Dashboard Integration

**Manual Test Steps:**
1. Opret ny bruger via sign up flow
2. Verificer email med code
3. Gå til Clerk Dashboard
4. Verificer: Bruger vises i Users list
5. Verificer: Email er verificeret (verified badge)
6. Verificer: Username er korrekt

**Expected Results:**
- ✅ Bruger oprettes korrekt i Clerk
- ✅ Email verification status er korrekt
- ✅ Alle bruger data er korrekt

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors i browser

#### Manual Verification:
- [ ] Email/password sign up flow fungerer end-to-end
- [ ] Verification code input fungerer korrekt
- [ ] Alle error cases håndteres korrekt
- [ ] Resend code funktionalitet virker
- [ ] SSO flow ikke påvirket (hvis SSO buttons eksisterer)
- [ ] State management fungerer korrekt
- [ ] Bruger oprettes i Clerk Dashboard efter verification
- [ ] Redirect til dashboard fungerer korrekt
- [ ] Accessibility verificeret (keyboard navigation, screen reader)
- [ ] Performance acceptable (ingen lag eller delay)

**⚠️ PAUSE HERE** - Final review before completion

---

## Testing Strategy

### Unit Tests (Future Enhancement)

**File:** `apps/web/app/(auth)/auth/page.test.tsx` (opret hvis nødvendigt)

**Test Cases:**
- `handleVerification` med korrekt code
- `handleVerification` med forkert code
- `handleVerification` med udløbet code
- `handleResendCode` funktionalitet
- State management (isVerifying, verificationCode)
- Error handling for alle edge cases

### Integration Tests (Future Enhancement)

**Test Cases:**
- End-to-end sign up flow med verification
- SSO flow (hvis SSO buttons implementeret)
- Redirect efter succesfuld verification
- Clerk Dashboard integration

### Manual Testing Checklist

- [ ] Email/password sign up → verification → success
- [ ] Forkert verification code → error message
- [ ] Udløbet verification code → error message
- [ ] Resend code → ny code sendes
- [ ] Back to sign up → state resets
- [ ] Login/Sign Up tab switch → state resets
- [ ] Clerk Dashboard → bruger oprettes korrekt
- [ ] Redirect til dashboard → fungerer korrekt
- [ ] Keyboard navigation → fungerer korrekt
- [ ] Screen reader → kan læse form korrekt

---

## References

- **Linear Issue:** [HUD-19](https://linear.app/huddle-world/issue/HUD-19/bug-email-verification-flow-mangler-brugere-kan-ikke-gennemfore-sign)
- **Research Document:** `.project/research/clerk-supabase-medusa-auth-research.md` (Phase 0 blocker)
- **Clerk Auth Rules:** `.cursor/rules/33-clerk_auth.mdc`
- **Current Auth Page:** `apps/web/app/(auth)/auth/page.tsx`
- **InputOTP Component:** `apps/web/components/ui/input-otp.tsx`
- **Clerk Next.js Docs:** [Email Verification](https://clerk.com/docs/authentication/email-verification)
- **Related Issues:**
  - lib/auth.ts bruger forkert Clerk API (efter denne fix)
  - Supabase migration har forkert foreign key reference (efter denne fix)
  - RLS policies virker ikke med Clerk (efter denne fix)
  - Ingen Medusa customer sync (efter denne fix)

---

## Notes

### SSO Considerations

- **SSO Providers:** Google, Facebook, Discord er aktiveret i Clerk Dashboard
- **SSO Flow:** SSO providers bypasser email verification automatisk (pre-verified)
- **Implementation:** Ingen ændringer nødvendige til SSO flow - det fungerer uafhængigt
- **Future:** Når SSO buttons implementeres, skal de ikke påvirkes af email verification changes

### Onboarding Flow Integration

- **Current:** Redirect til dashboard (`/`) efter succesfuld verification
- **Future:** Onboarding flow kommer senere - redirect til dashboard er klar til integration
- **Consideration:** Når onboarding flow implementeres, kan redirect ændres til `/onboarding` eller lignende

### Clerk Dashboard Verification

- **Important:** Verificer at bruger oprettes i Clerk Dashboard efter email verification
- **Test:** Opret test bruger og verificer i Clerk Dashboard efter verification
- **Expected:** Bruger skal vises med verified email badge

### Edge Cases & Browser Behavior

- **Browser Refresh:** Hvis bruger refresher siden under verification, resets state (forventet adfærd). Brugeren kan starte sign up flow forfra.
- **Browser Navigation:** Back/forward buttons fungerer korrekt - state håndteres af React component lifecycle.
- **Multiple Tabs:** Hver tab har sin egen state - ingen cross-tab interference.
- **Network Interruption:** Error handling håndterer network failures gracefully med retry muligheder (resend code).

---

## Estimated Complexity

**Size:** ~150-200 LOC  
**Time:** 1-2 timer  
**Risk Level:** Medium-High (Blocker for sign up flow)

**Breakdown:**
- Frontend UI: Medium (ny verification step component)
- State management: Medium (håndtere sign up flow states)
- Clerk integration: Low (API eksisterer, skal bruges korrekt)
- Error handling: Medium (invalid/expired codes)
- Testing: Medium (kritisk user flow)

---

## Next Steps After Completion

1. **Verify in Clerk Dashboard:** Opret test bruger og verificer i Clerk Dashboard
2. **Test SSO Flow:** Verificer at SSO ikke er påvirket (hvis SSO buttons eksisterer)
3. **Update Linear:** Mark ticket som "In Progress" → "Done"
4. **Document:** Opdater research document med "Fixed" status
5. **Next Ticket:** Gå videre til næste kritiske problem (lib/auth.ts, Supabase migration, etc.)

---

**Plan Created:** 2025-11-28  
**Last Updated:** 2025-11-28  
**Status:** ✅ Validated & Ready for Implementation

**Validation:** Plan validated on 2025-11-28. Score: 92/100. All critical issues resolved. See `.project/plans/HUD-19/validation-report.md` for details.


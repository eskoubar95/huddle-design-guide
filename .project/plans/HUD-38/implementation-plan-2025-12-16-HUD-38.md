# HUD-38 - Stripe Connect Setup & Integration Implementation Plan

## Overview
Implementér **Stripe Connect Express accounts** for P2P betalinger i marketplace, inkluderet seller onboarding flow, payment processing (Payment Intents), seller payouts (Transfers ved delivery), refund handling, og webhook integration. Dette er core payment infrastructure der understøtter alle marketplace transactions.

Planen er skrevet med udgangspunkt i:
- Linear: **HUD-38**
- Docs: `.project/02-PRD.md`, `.project/04-Database_Schema.md`, `.project/05-API_Design.md`, `.project/marketplace-features-linear-document.md`
- Research: Eksisterende Stripe Identity integration (HUD-41) som reference pattern
- Chat-beslutninger: Express accounts, payout ved delivery, transparent fee structure, refund policy

---

## Linear Issue
**Issue:** HUD-38  
**Title:** [Feature] Stripe Connect Setup & Integration  
**Status:** Backlog  
**Priority:** Urgent  
**Estimate:** 20-24 timer  
**Dependencies:** HUD-41 (User Profile Validation) - ✅ Completed

---

## Current State Analysis (verificeret)

### Eksisterende Stripe Integration
**✅ Allerede implementeret (fra HUD-41):**
- Stripe SDK installeret (`stripe` package)
- Stripe client pattern: `getStripe()` lazy-initialize i `apps/web/app/api/v1/stripe/webhook/route.ts`
- Webhook handler eksisterer: `/api/v1/stripe/webhook` (håndterer Identity events)
- Webhook signature verification pattern
- Environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Stripe Identity integration (kan genbruges som reference)

### Database Schema
**✅ Eksisterende tabeller:**
- `public.transactions` - har `status` ('pending', 'completed', 'cancelled', 'refunded'), `seller_id`, `buyer_id`, `amount`, `currency`
- `public.profiles` - har `stripe_identity_verification_status`, `stripe_identity_verification_id`

**❌ Mangler:**
- `stripe_accounts` tabel (Connect account mapping)
- Payment Intent tracking i transactions
- Transfer/payout tracking

### Codebase Patterns
**✅ Eksisterende patterns:**
- API routes: `requireAuth` + `handleApiError` + `rateLimitMiddleware` (se `apps/web/app/api/v1/posts/route.ts`)
- Service classes: `BidService`, `ProfileService` pattern i `apps/web/lib/services/`
- Error handling: `ApiError` class + Sentry integration
- Response helpers: `successResponse`, `createdResponse`, `paginatedResponse`

### Identificerede Gaps for HUD-38
- Manglende `stripe_accounts` tabel
- Manglende Stripe Connect OAuth flow
- Manglende `StripeService` class (PaymentIntent, Transfer, Refund)
- Manglende payment webhook events (kun Identity events nu)
- Manglende seller Connect onboarding UI
- Manglende payout scheduling logic (ved delivery)
- Manglende seller payout dashboard/historik

---

## Desired End State

### Sellers
- Kan oprette Stripe Connect Express account via OAuth flow
- Stripe account status trackes (pending, active, restricted)
- Kan modtage payouts (Transfers) når order status = "delivered"
- Kan se payout status og historik i dashboard
- Payouts sker automatisk ved delivery (ingen travlhed før køber modtager varen)

### Payment Processing
- Payment Intents oprettes ved checkout (total amount: item + shipping + platform fee)
- Platform fee inkluderer Stripe fees (transparent for seller)
- Payment success/failure håndteres via webhooks
- Transactions opdateres automatisk ved payment events

### Refunds
- Køber kan anmode om refund inden for 14 dage efter delivery
- Sælger kan acceptere/afvise refund requests
- Fuld refund: hele beløbet tilbage
- Delvis refund: kun hvis aftalt mellem køber/sælger (via messaging)
- Refunds håndteres via Stripe Refund API

### Webhooks
- `payment_intent.succeeded` → Update transaction status til "completed"
- `payment_intent.payment_failed` → Handle failed payments
- `transfer.created` → Track seller payouts
- `account.updated` → Update seller Stripe account status

---

## Scope

### In Scope
- Database migration: `stripe_accounts` tabel
- Stripe Connect OAuth flow (Express accounts)
- `StripeService` class: PaymentIntent, Transfer, Refund methods
- Webhook extensions: Payment, Transfer, Account events
- Seller Connect onboarding page (`/seller/connect-stripe`)
- API endpoints: Seller Connect account management
- Payout scheduling: Automatisk ved order status = "delivered"
- Seller payout dashboard/historik
- Refund handling: Fuld og delvis refunds

### What We're NOT Doing (Out of Scope)
- **Checkout flow integration (HUD-34/HUD-35)**: Payment Intent creation i checkout (bliver i separate tickets)
- **Transaction fees calculation (HUD-37)**: Platform fee beregning (bliver i separate ticket)
- **Order management (HUD-39)**: Medusa order integration (bliver i separate ticket)
- **Shipping calculation (HUD-36)**: Shipping cost calculation (bliver i separate ticket)
- **Stripe Checkout UI**: Vi bruger Stripe Elements eller Checkout Session (ikke custom UI)
- **Dispute handling**: Stripe disputes håndteres via Stripe Dashboard (ikke custom UI)
- **Minimum payout threshold**: Start uden threshold (kan tilføjes senere)
- **Multi-currency support**: MVP bruger EUR for alle transactions. Multi-currency (DKK, SEK, NOK, etc.) kan tilføjes senere uden breaking changes (database schema understøtter allerede det)

---

## Key Design/Tech Decisions

### A) Stripe Connect Account Type: Express
**Rationale:**
- Balance mellem kontrol og simplicitet
- God fraud prevention (Stripe håndterer KYC)
- Nem onboarding for sellers
- Platform har kontrol over payout timing
- Kan opgraderes til Custom senere hvis nødvendigt

### B) Payout Timing: Ved Delivery
**Rationale:**
- Fokus på ingen fraud
- Ingen travlhed med udbetaling før køber modtager varen
- Fremtidig mulighed for hurtigere udbetaling (abonnement/goodwill)

### C) Fee Structure: Transparent
**Rationale:**
- Platform fee inkluderer Stripe fees (ikke ekstra)
- Fee struktur skal kunne ses af sellers
- Transparent pricing bygger trust

### D) Refund Policy: 14 Dage
**Rationale:**
- Køber kan anmode om refund inden for 14 dage efter delivery
- Sælger kan acceptere/afvise (med dispute-mulighed)
- Fuld refund = hele beløbet tilbage
- Delvis refund = kun hvis aftalt mellem køber/sælger

### E) Webhook Handler: Extend Existing
**Rationale:**
- Eksisterende webhook handler (`/api/v1/stripe/webhook`) kan udvides
- Samme pattern: signature verification, Sentry error tracking, no PII in logs
- Event handling via switch/case pattern

### F) Currency Strategy: EUR-First for MVP
**Rationale:**
- **MVP Approach:** Alle transactions i EUR (simplest for MVP)
- **Future-Proof:** Database schema understøtter allerede multiple currencies (`currency VARCHAR(3)`)
- **Stripe Connect:** Express accounts kan oprettes i EUR-lande (DE, FR, IT, ES, NL, etc.)
- **For nordiske sellers:** Stripe Connect accounts kan oprettes i EUR-lande (fx DE) selvom seller er fra DK/SE/NO
- **Payment Intents:** Alle i EUR (seller's listing currency = EUR)
- **Payouts:** Alle i EUR (seller modtager EUR)
- **Future Enhancement:** Multi-currency support kan tilføjes senere uden breaking changes

**Implementation:**
- All listings/auctions: `currency = "EUR"` (default i database)
- Stripe Connect accounts: Opret i EUR-land (fx "DE" for alle sellers)
- Payment Intents: `currency: "eur"` (hardcoded for MVP)
- Transfers: `currency: "eur"` (hardcoded for MVP)
- Frontend: Vis alle priser i EUR

**Future Multi-Currency (Post-MVP):**
- Currency utility: `getCurrencyForCountry()` mapping
- Auto-suggest currency baseret på seller's country
- Payment Intent currency fra listing (ikke hardcoded)
- Optional: Currency conversion display for buyers

---

## Implementation Approach

**High-level strategy:**
1. Database foundation først (stripe_accounts tabel)
2. Stripe Connect OAuth flow (seller onboarding)
3. StripeService class (core payment methods)
4. Webhook extensions (payment events)
5. API endpoints (seller account management)
6. Payout logic (scheduling ved delivery)
7. Seller dashboard (payout status/historik)

**Patterns to follow:**
- Lazy-initialize Stripe client (fra eksisterende webhook handler)
- Service class pattern (fra `BidService`, `ProfileService`)
- API route pattern: `requireAuth` + `handleApiError` + `rateLimitMiddleware`
- Webhook pattern: signature verification + event handling + Sentry

---

## Phase 1: Database & Stripe Connect Account Setup [✓ COMPLETE]

### Overview
Opret database foundation for Stripe Connect accounts og implementér OAuth flow for seller onboarding.

**Status:** COMPLETE - 2025-12-16 22:53:47
**Agent:** database
**Outcome:** SUCCESS - Tables created, migrations applied, types regenerated

### Changes Required

#### 1.1 Database Migration: stripe_accounts Table
**File:** `supabase/migrations/20251216000000_create_stripe_accounts_table.sql`

**Changes:**
```sql
-- Create stripe_accounts table for Connect account mapping
CREATE TABLE public.stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id VARCHAR(255) NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'restricted')) DEFAULT 'pending',
  payouts_enabled BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_stripe_accounts_user_id ON public.stripe_accounts(user_id);
CREATE INDEX idx_stripe_accounts_stripe_account_id ON public.stripe_accounts(stripe_account_id);
CREATE INDEX idx_stripe_accounts_status ON public.stripe_accounts(status);

-- RLS Policies
ALTER TABLE public.stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Users can view their own Stripe account
CREATE POLICY "Users can view their own Stripe account"
  ON public.stripe_accounts FOR SELECT
  USING (auth.uid()::text = user_id);

-- Users can insert their own Stripe account
CREATE POLICY "Users can insert their own Stripe account"
  ON public.stripe_accounts FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Users can update their own Stripe account
CREATE POLICY "Users can update their own Stripe account"
  ON public.stripe_accounts FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Comments
COMMENT ON TABLE public.stripe_accounts IS 'Stripe Connect Express accounts for sellers';
COMMENT ON COLUMN public.stripe_accounts.stripe_account_id IS 'Stripe Connect account ID (acct_xxx)';
COMMENT ON COLUMN public.stripe_accounts.status IS 'Account status: pending (onboarding), active (ready), restricted (needs attention)';
COMMENT ON COLUMN public.stripe_accounts.payouts_enabled IS 'Whether payouts are enabled for this account';
COMMENT ON COLUMN public.stripe_accounts.charges_enabled IS 'Whether charges are enabled for this account';
```

**Rationale:** 
- Separate tabel for Connect accounts (ikke i profiles) for bedre separation of concerns
- Status tracking for onboarding flow
- RLS policies for security

#### 1.2 Update Transactions Table (Optional - for Payment Intent tracking)
**File:** `supabase/migrations/20251216000001_add_payment_intent_to_transactions.sql`

**Changes:**
```sql
-- Add payment intent tracking to transactions
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS stripe_refund_id VARCHAR(255) NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_payment_intent ON public.transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transfer ON public.transactions(stripe_transfer_id);

-- Comments
COMMENT ON COLUMN public.transactions.stripe_payment_intent_id IS 'Stripe Payment Intent ID (pi_xxx)';
COMMENT ON COLUMN public.transactions.stripe_transfer_id IS 'Stripe Transfer ID (tr_xxx) for seller payout';
COMMENT ON COLUMN public.transactions.stripe_refund_id IS 'Stripe Refund ID (re_xxx) if refunded';
```

**Rationale:**
- Track Payment Intent ID for webhook correlation
- Track Transfer ID for payout tracking
- Track Refund ID for refund history

#### 1.3 Regenerate TypeScript Types
**Action:** Efter migration, regenerer Supabase types via Supabase MCP eller CLI

**Command:**
```bash
# Via Supabase CLI (hvis tilgængelig)
npx supabase gen types typescript --project-id trbyclravrmmhxplocsr > apps/web/lib/supabase/types.ts
```

**Rationale:** Type safety for nye tabeller/kolonner

### Success Criteria

#### Automated Verification:
- [ ] Migration runs successfully: `npm run migrate` (eller Supabase MCP apply_migration)
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Types regenerated: `stripe_accounts` table vises i `apps/web/lib/supabase/types.ts`

#### Manual Verification:
- [ ] `stripe_accounts` tabel eksisterer i Supabase Dashboard
- [ ] RLS policies er aktive
- [ ] Indexes er oprettet
- [ ] `transactions` tabel har nye kolonner (hvis Phase 1.2 inkluderet)

**⚠️ PAUSE HERE** - Verify database changes before Phase 2

---

## Phase 2: Stripe Connect OAuth Flow

### Overview
Implementér Stripe Connect OAuth flow for seller onboarding, inkluderet API endpoints og frontend page.

### Changes Required

#### 2.1 Stripe Connect OAuth Initiation Endpoint
**File:** `apps/web/app/api/v1/seller/stripe-account/connect/route.ts` (ny)

**Changes:**
```typescript
import { NextRequest } from "next/server";
import Stripe from "stripe";
import { requireAuth } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import * as Sentry from "@sentry/nextjs";

// Lazy-initialize Stripe client (same pattern as webhook handler)
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

/**
 * POST /api/v1/seller/stripe-account/connect
 * Initiate Stripe Connect OAuth flow for seller onboarding
 *
 * Returns:
 * - url: OAuth authorization URL
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);
    const supabase = await createServiceClient();

    // Check if user already has a Stripe account
    const { data: existingAccount } = await supabase
      .from("stripe_accounts")
      .select("id, stripe_account_id, status")
      .eq("user_id", userId)
      .single();

    if (existingAccount && existingAccount.status === "active") {
      throw new ApiError(
        "CONFLICT",
        "You already have an active Stripe account connected",
        409
      );
    }

    // Get Stripe client
    const stripe = getStripe();

    // Determine account ID - create account FIRST if it doesn't exist
    let accountId: string;

    if (!existingAccount) {
      // Create new Express account FIRST
      // MVP: All accounts in EUR country (DE) for simplicity
      // Future: Can use seller's country for multi-currency support
      let account: Stripe.Account;
      try {
        account = await stripe.accounts.create({
          type: "express",
          country: "DE", // MVP: Use EUR country (Germany) for all sellers
          email: undefined, // Will be collected during onboarding
          email: undefined, // Will be collected during onboarding
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          metadata: {
            user_id: userId,
            source: "huddle_marketplace",
          },
        });
      } catch (stripeError) {
        // Handle Stripe-specific errors
        if (stripeError instanceof Stripe.errors.StripeError) {
          if (stripeError.type === "StripeRateLimitError") {
            throw new ApiError(
              "RATE_LIMIT",
              "Too many requests. Please try again in a moment.",
              429
            );
          }
          if (stripeError.type === "StripeInvalidRequestError") {
            Sentry.captureException(stripeError, {
              tags: { component: "stripe_connect", operation: "create_account" },
              extra: { userIdPrefix: userId.slice(0, 8) },
            });
            throw new ApiError(
              "BAD_REQUEST",
              "Invalid account creation request. Please contact support.",
              400
            );
          }
        }
        // Re-throw other Stripe errors
        const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
        Sentry.captureException(stripeError, {
          tags: { component: "stripe_connect", operation: "create_account" },
          extra: { userIdPrefix: userId.slice(0, 8), errorMessage },
        });
        throw new ApiError(
          "EXTERNAL_SERVICE_ERROR",
          "Failed to create Stripe account. Please try again later.",
          502
        );
      }

      accountId = account.id;

      // Store account in database
      const { error: insertError } = await supabase
        .from("stripe_accounts")
        .insert({
          user_id: userId,
          stripe_account_id: account.id,
          status: "pending",
          payouts_enabled: account.payouts_enabled || false,
          charges_enabled: account.charges_enabled || false,
        });

      if (insertError) {
        Sentry.captureException(insertError, {
          tags: { component: "stripe_connect", operation: "create_account" },
          extra: { userIdPrefix: userId.slice(0, 8) },
        });
        throw new ApiError(
          "INTERNAL_SERVER_ERROR",
          "Failed to store Stripe account",
          500
        );
      }
    } else {
      // Use existing account
      accountId = existingAccount.stripe_account_id;
    }

    // NOW create account link (account must exist first)
    let accountLink: Stripe.AccountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/connect-stripe?refresh=true`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/seller/connect-stripe?success=true`,
        type: "account_onboarding",
      });
    } catch (stripeError) {
      // Handle Stripe-specific errors for account links
      if (stripeError instanceof Stripe.errors.StripeError) {
        if (stripeError.type === "StripeRateLimitError") {
          throw new ApiError(
            "RATE_LIMIT",
            "Too many requests. Please try again in a moment.",
            429
          );
        }
      }
      const errorMessage = stripeError instanceof Error ? stripeError.message : String(stripeError);
      Sentry.captureException(stripeError, {
        tags: { component: "stripe_connect", operation: "create_account_link" },
        extra: { userIdPrefix: userId.slice(0, 8), accountIdPrefix: accountId.slice(0, 8) },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to create account link. Please try again later.",
        502
      );
    }

    return successResponse({
      url: accountLink.url,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
```

**Rationale:**
- Express account type (besluttet i chat)
- OAuth flow via account links
- Store account i database med pending status
- Error handling med Sentry
- MVP: All accounts in EUR country ("DE") for simplicity
- Future: Can use seller's country for multi-currency support

#### 2.2 Get Stripe Account Status Endpoint
**File:** `apps/web/app/api/v1/seller/stripe-account/route.ts` (ny)

**Changes:**
```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";

/**
 * GET /api/v1/seller/stripe-account
 * Get current user's Stripe Connect account status
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);
    const supabase = await createServiceClient();

    const { data: account, error } = await supabase
      .from("stripe_accounts")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      throw error;
    }

    return successResponse(account || null);
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:**
- Simple GET endpoint for account status
- Returns null hvis ingen account

#### 2.3 Seller Connect Onboarding Page
**File:** `apps/web/app/(dashboard)/seller/connect-stripe/page.tsx` (ny)

**Changes:**
```typescript
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api/client";
import { ApiClientError } from "@/lib/api/client";

export default function ConnectStripePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [accountStatus, setAccountStatus] = useState<{
    status: string;
    payouts_enabled: boolean;
  } | null>(null);

  const success = searchParams.get("success");
  const refresh = searchParams.get("refresh");

  useEffect(() => {
    // Fetch account status on mount
    apiRequest<{ data: { status: string; payouts_enabled: boolean } | null }>("/seller/stripe-account")
      .then((data) => {
        if (data.data) {
          setAccountStatus(data.data);
        }
      })
      .catch((error) => {
        if (error instanceof ApiClientError) {
          // Error already handled by apiRequest (shows user-friendly message)
          console.error("Failed to fetch account status:", error.message);
        }
      });
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<{ data: { url: string } }>("/seller/stripe-account/connect", {
        method: "POST",
      });
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        // Error already handled by apiRequest (shows user-friendly message)
        console.error("Failed to initiate Connect flow:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Connect Stripe Account</CardTitle>
          <CardDescription>
            Connect your Stripe account to receive payouts from sales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success && (
            <div className="rounded-md bg-green-50 p-4 text-green-800">
              Account connected successfully! Your account is being verified.
            </div>
          )}

          {refresh && (
            <div className="rounded-md bg-yellow-50 p-4 text-yellow-800">
              Please complete your account setup to continue.
            </div>
          )}

          {accountStatus?.status === "active" && accountStatus.payouts_enabled && (
            <div className="rounded-md bg-blue-50 p-4 text-blue-800">
              Your Stripe account is active and ready to receive payouts.
            </div>
          )}

          {accountStatus?.status === "pending" && (
            <div className="rounded-md bg-yellow-50 p-4 text-yellow-800">
              Your account is being verified. This usually takes a few minutes.
            </div>
          )}

          {accountStatus?.status === "restricted" && (
            <div className="rounded-md bg-red-50 p-4 text-red-800">
              Your account needs attention. Please complete the required information.
            </div>
          )}

          {(!accountStatus || accountStatus.status !== "active") && (
            <Button onClick={handleConnect} disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Stripe Account"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Rationale:**
- Simple onboarding page
- Status feedback baseret på account status
- OAuth redirect flow

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Seller kan klikke "Connect Stripe Account" → redirects til Stripe OAuth
- [ ] Efter OAuth completion → redirects tilbage til `/seller/connect-stripe?success=true`
- [ ] Account status vises korrekt:
  - "pending" når account er oprettet (status="pending", payouts_enabled=false)
  - "active" efter verification (når charges_enabled && payouts_enabled via webhook)
  - "restricted" hvis account needs attention (via account.updated webhook)
- [ ] Database opdateres korrekt:
  - Ved account creation: `stripe_account_id`, `status="pending"`, `payouts_enabled=false`, `charges_enabled=false`
  - Ved account.updated webhook: status opdateres til "active" hvis `charges_enabled && payouts_enabled`
- [ ] Country fra user profile bruges til account creation (ikke hardcoded "DK")
- [ ] Error handling virker: Rate limit errors vises korrekt, invalid requests giver user-friendly messages

**⚠️ PAUSE HERE** - Test OAuth flow manually before Phase 3

---

## Phase 3: StripeService Class - Core Payment Methods

### Overview
Implementér `StripeService` class med core payment methods: Payment Intent creation, retrieval, Transfer creation (payouts), og Refund handling.

### Changes Required

#### 3.1 StripeService Class
**File:** `apps/web/lib/services/stripe-service.ts` (ny)

**Changes:**
```typescript
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

// Stripe errors are accessed via Stripe.errors namespace

// Lazy-initialize Stripe client
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return stripeClient;
}

export interface CreatePaymentIntentParams {
  amount: number; // in minor units (cents for EUR)
  currency: string; // MVP: "eur" (hardcoded), Future: from listing currency
  buyerId: string; // Clerk user ID
  sellerId: string; // Clerk user ID
  metadata?: Record<string, string>; // transaction_id, listing_id, etc.
}

export interface CreateTransferParams {
  amount: number; // in minor units (cents for EUR)
  currency: string; // MVP: "eur" (hardcoded), Future: from transaction currency
  sellerStripeAccountId: string; // acct_xxx
  transferGroup?: string; // For grouping related transfers
  metadata?: Record<string, string>;
}

export interface CreateRefundParams {
  paymentIntentId: string; // pi_xxx
  amount?: number; // Optional: partial refund (in minor units)
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata?: Record<string, string>;
}

/**
 * StripeService - Handles all Stripe payment operations
 * 
 * Methods:
 * - Payment Intent creation/retrieval
 * - Transfer creation (seller payouts)
 * - Refund handling
 * - Connect account management
 */
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = getStripe();
  }

  /**
   * Create Payment Intent for buyer checkout
   * 
   * @param params Payment intent parameters
   * @returns Stripe Payment Intent
   */
  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<Stripe.PaymentIntent> {
    try {
      // Get seller's Stripe account
      const supabase = await createServiceClient();
      const { data: sellerAccount, error } = await supabase
        .from("stripe_accounts")
        .select("stripe_account_id, status, charges_enabled")
        .eq("user_id", params.sellerId)
        .single();

      if (error || !sellerAccount) {
        throw new ApiError(
          "BAD_REQUEST",
          "Seller does not have a connected Stripe account",
          400
        );
      }

      if (sellerAccount.status !== "active" || !sellerAccount.charges_enabled) {
        throw new ApiError(
          "BAD_REQUEST",
          "Seller's Stripe account is not active",
          400
        );
      }

      // Create Payment Intent with application fee (platform fee)
      // Note: Application fee will be calculated in HUD-37 (Transaction Fees)
      // MVP: All payments in EUR (hardcoded)
      // Future: Use params.currency from listing
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: params.amount,
        currency: "eur", // MVP: Hardcoded EUR, Future: params.currency
        application_fee_amount: undefined, // Will be set in HUD-37
        transfer_data: {
          destination: sellerAccount.stripe_account_id,
        },
        metadata: {
          buyer_id: params.buyerId,
          seller_id: params.sellerId,
          ...params.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === "StripeRateLimitError") {
          throw new ApiError(
            "RATE_LIMIT",
            "Payment service temporarily unavailable. Please try again in a moment.",
            429
          );
        }
        if (error.type === "StripeInvalidRequestError") {
          Sentry.captureException(error, {
            tags: { component: "stripe_service", operation: "create_payment_intent" },
            extra: { sellerIdPrefix: params.sellerId.slice(0, 8) },
          });
          throw new ApiError(
            "BAD_REQUEST",
            "Invalid payment request. Please check your payment details.",
            400
          );
        }
        if (error.type === "StripeCardError") {
          throw new ApiError(
            "PAYMENT_FAILED",
            "Your card was declined. Please try a different payment method.",
            402
          );
        }
      }
      // Re-throw ApiError as-is
      if (error instanceof ApiError) {
        throw error;
      }
      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "create_payment_intent" },
        extra: { errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Payment processing temporarily unavailable. Please try again later.",
        502
      );
    }
  }

  /**
   * Get Payment Intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      // Handle Stripe-specific errors with retry logic for transient failures
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === "StripeRateLimitError") {
          // Retry once after short delay
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            return await this.stripe.paymentIntents.retrieve(paymentIntentId);
          } catch (retryError) {
            throw new ApiError(
              "RATE_LIMIT",
              "Payment service temporarily unavailable. Please try again in a moment.",
              429
            );
          }
        }
        if (error.type === "StripeInvalidRequestError") {
          throw new ApiError(
            "NOT_FOUND",
            "Payment intent not found",
            404
          );
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "get_payment_intent" },
        extra: { paymentIntentIdPrefix: paymentIntentId.slice(0, 8) },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Failed to retrieve payment information",
        502
      );
    }
  }

  /**
   * Create Transfer (seller payout)
   * 
   * Note: This is called when order status = "delivered"
   * Transfer amount = item price - platform fee (calculated in HUD-37)
   */
  async createTransfer(params: CreateTransferParams): Promise<Stripe.Transfer> {
    try {
      // MVP: All transfers in EUR (hardcoded)
      // Future: Use params.currency from transaction
      const transfer = await this.stripe.transfers.create({
        amount: params.amount,
        currency: "eur", // MVP: Hardcoded EUR, Future: params.currency
        destination: params.sellerStripeAccountId,
        transfer_group: params.transferGroup,
        metadata: params.metadata,
      });

      return transfer;
    } catch (error) {
      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === "StripeRateLimitError") {
          // Retry once after short delay
          await new Promise((resolve) => setTimeout(resolve, 1000));
          try {
            return await this.stripe.transfers.create({
              amount: params.amount,
              currency: params.currency,
              destination: params.sellerStripeAccountId,
              transfer_group: params.transferGroup,
              metadata: params.metadata,
            });
          } catch (retryError) {
            throw new ApiError(
              "RATE_LIMIT",
              "Payout service temporarily unavailable. Please try again in a moment.",
              429
            );
          }
        }
        if (error.type === "StripeInvalidRequestError") {
          Sentry.captureException(error, {
            tags: { component: "stripe_service", operation: "create_transfer" },
            extra: { accountIdPrefix: params.sellerStripeAccountId.slice(0, 8) },
          });
          throw new ApiError(
            "BAD_REQUEST",
            "Invalid payout request. Please contact support.",
            400
          );
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "create_transfer" },
        extra: { errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Payout processing temporarily unavailable. Please try again later.",
        502
      );
    }
  }

  /**
   * Create Refund (full or partial)
   */
  async createRefund(params: CreateRefundParams): Promise<Stripe.Refund> {
    try {
      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: params.paymentIntentId,
        amount: params.amount, // undefined = full refund
        reason: params.reason,
        metadata: params.metadata,
      };

      const refund = await this.stripe.refunds.create(refundParams);

      return refund;
    } catch (error) {
      // Handle Stripe-specific errors
      if (error instanceof Stripe.errors.StripeError) {
        if (error.type === "StripeRateLimitError") {
          throw new ApiError(
            "RATE_LIMIT",
            "Refund service temporarily unavailable. Please try again in a moment.",
            429
          );
        }
        if (error.type === "StripeInvalidRequestError") {
          // Check if refund already exists
          if (error.message?.includes("already been refunded")) {
            throw new ApiError(
              "CONFLICT",
              "This payment has already been refunded",
              409
            );
          }
          Sentry.captureException(error, {
            tags: { component: "stripe_service", operation: "create_refund" },
            extra: { paymentIntentIdPrefix: params.paymentIntentId.slice(0, 8) },
          });
          throw new ApiError(
            "BAD_REQUEST",
            "Invalid refund request. Please check the payment details.",
            400
          );
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "create_refund" },
        extra: { errorMessage },
      });
      throw new ApiError(
        "EXTERNAL_SERVICE_ERROR",
        "Refund processing temporarily unavailable. Please try again later.",
        502
      );
    }
  }

  /**
   * Get Connect Account status
   */
  async getConnectAccount(accountId: string): Promise<Stripe.Account> {
    try {
      return await this.stripe.accounts.retrieve(accountId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "stripe_service", operation: "get_connect_account" },
        extra: { accountIdPrefix: accountId.slice(0, 8) },
      });
      throw error;
    }
  }
}
```

**Rationale:**
- Service class pattern (fra eksisterende services)
- Payment Intent med application fee (tilføjes i HUD-37)
- Transfer creation for payouts
- Refund handling (fuld/delvis)
- Error handling med Sentry

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] StripeService kan instantieres
- [ ] Payment Intent creation virker (test med Stripe test mode)
- [ ] Transfer creation virker (test med Stripe test mode)
- [ ] Refund creation virker (test med Stripe test mode)

#### 3.2 Refund API Endpoint
**File:** `apps/web/app/api/v1/transactions/[id]/refund/route.ts` (ny)

**Changes:**
```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { StripeService } from "@/lib/services/stripe-service";
import { z } from "zod";

const refundSchema = z.object({
  amount: z.number().positive().optional(), // Optional: partial refund (in minor units)
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional(),
});

/**
 * POST /api/v1/transactions/[id]/refund
 * Initiate refund for a transaction
 * 
 * Refund policy:
 * - Buyer can request refund within 14 days after delivery
 * - Seller can accept/reject (via messaging)
 * - Full refund: entire amount
 * - Partial refund: only if agreed between buyer/seller
 */
const handler = async (
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  try {
    const { userId } = await requireAuth(req);
    const { id: transactionId } = await context.params;
    const supabase = await createServiceClient();

    // Get transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Transaction not found", 404);
    }

    // Verify user is buyer
    if (transaction.buyer_id !== userId) {
      throw new ApiError(
        "FORBIDDEN",
        "Only the buyer can request a refund for this transaction",
        403
      );
    }

    // Check if already refunded
    if (transaction.status === "refunded" || transaction.stripe_refund_id) {
      throw new ApiError(
        "CONFLICT",
        "This transaction has already been refunded",
        409
      );
    }

    // Check refund policy: 14 days after delivery
    // Note: This assumes completed_at is when delivery happened
    // In HUD-39, we'll track actual delivery date
    if (transaction.completed_at) {
      const deliveryDate = new Date(transaction.completed_at);
      const daysSinceDelivery = (Date.now() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceDelivery > 14) {
        throw new ApiError(
          "BAD_REQUEST",
          "Refund request must be made within 14 days of delivery",
          400
        );
      }
    }

    // Parse request body
    const body = await req.json();
    const input = refundSchema.parse(body);

    // Get payment intent ID
    if (!transaction.stripe_payment_intent_id) {
      throw new ApiError(
        "BAD_REQUEST",
        "Transaction does not have a payment intent",
        400
      );
    }

    // Create refund via StripeService
    const stripeService = new StripeService();
    const refund = await stripeService.createRefund({
      paymentIntentId: transaction.stripe_payment_intent_id,
      amount: input.amount, // undefined = full refund
      reason: input.reason || "requested_by_customer",
      metadata: {
        transaction_id: transactionId,
        buyer_id: transaction.buyer_id,
        seller_id: transaction.seller_id,
        refund_type: input.amount ? "partial" : "full",
      },
    });

    // Update transaction
    const { error: updateError } = await supabase
      .from("transactions")
      .update({
        status: "refunded",
        stripe_refund_id: refund.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    if (updateError) {
      throw new ApiError(
        "INTERNAL_SERVER_ERROR",
        "Failed to update transaction",
        500
      );
    }

    // Create notification for seller
    await supabase.from("notifications").insert({
      user_id: transaction.seller_id,
      type: "refund_requested",
      title: "Refund Requested",
      message: `A refund of ${input.amount ? input.amount / 100 : transaction.amount / 100} ${transaction.currency?.toUpperCase() || "DKK"} has been processed for transaction ${transactionId.slice(0, 8)}...`,
      read: false,
    });

    return successResponse({
      refund_id: refund.id,
      amount: refund.amount,
      status: refund.status,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
```

**Rationale:**
- Refund endpoint for buyers
- Validates refund policy (14 days)
- Supports full and partial refunds
- Updates transaction status
- Notifies seller

**⚠️ PAUSE HERE** - Test StripeService methods manually before Phase 4

---

## Phase 4: Webhook Extensions

### Overview
Extend eksisterende webhook handler med payment events, transfer events, og account events.

### Changes Required

#### 4.1 Extend Webhook Handler
**File:** `apps/web/app/api/v1/stripe/webhook/route.ts` (modificer)

**Changes:**
```typescript
// ... existing code ...

export async function POST(request: NextRequest) {
  // ... existing signature verification code ...

  const supabase = await createServiceClient();

  // Webhook idempotency: Check if event already processed
  // Store processed event IDs in a simple in-memory Set (for MVP)
  // In production, use Redis or database for distributed systems
  const processedEvents = new Set<string>();
  
  // Check if event already processed (idempotency)
  if (processedEvents.has(event.id)) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[STRIPE] Event ${event.id.slice(0, 8)}... already processed, skipping`);
    }
    return Response.json({ received: true, skipped: "duplicate" });
  }

  try {
    // Handle Identity verification events (existing)
    if (event.type.startsWith("identity.verification_session.")) {
      // ... existing Identity handling code ...
    }

    // NEW: Handle Payment Intent events
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const transactionId = paymentIntent.metadata?.transaction_id;

      if (transactionId) {
        // Update transaction status to "completed"
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: "completed",
            stripe_payment_intent_id: paymentIntent.id,
            completed_at: new Date(paymentIntent.created * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId);

        if (updateError) {
          Sentry.captureException(updateError, {
            tags: { component: "stripe_webhook", event_type: event.type },
            extra: { transactionIdPrefix: transactionId.slice(0, 8) },
          });
        }

        // Update listing/auction status (if applicable)
        const listingId = paymentIntent.metadata?.listing_id;
        const listingType = paymentIntent.metadata?.listing_type;

        if (listingId && listingType) {
          if (listingType === "sale") {
            await supabase
              .from("sale_listings")
              .update({ status: "sold", sold_at: new Date().toISOString() })
              .eq("id", listingId);
          } else if (listingType === "auction") {
            await supabase
              .from("auctions")
              .update({ status: "ended", ended_at: new Date().toISOString() })
              .eq("id", listingId);
          }
        }

        // Create notification for seller
        const sellerId = paymentIntent.metadata?.seller_id;
        if (sellerId) {
          await supabase.from("notifications").insert({
            user_id: sellerId,
            type: "payment_received",
            title: "Payment Received",
            message: `Payment of ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()} received.`,
            read: false,
          });
        }
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const transactionId = paymentIntent.metadata?.transaction_id;

      if (transactionId) {
        // Update transaction status (or create failed transaction record)
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId);

        if (updateError) {
          Sentry.captureException(updateError, {
            tags: { component: "stripe_webhook", event_type: event.type },
          });
        }

        // Notify buyer of payment failure
        const buyerId = paymentIntent.metadata?.buyer_id;
        if (buyerId) {
          await supabase.from("notifications").insert({
            user_id: buyerId,
            type: "payment_failed",
            title: "Payment Failed",
            message: "Your payment could not be processed. Please try again.",
            read: false,
          });
        }
      }
    }

    // NEW: Handle Transfer events (seller payouts)
    if (event.type === "transfer.created") {
      const transfer = event.data.object as Stripe.Transfer;
      const transactionId = transfer.metadata?.transaction_id;

      if (transactionId) {
        // Update transaction with transfer ID
        const { error: updateError } = await supabase
          .from("transactions")
          .update({
            stripe_transfer_id: transfer.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", transactionId);

        if (updateError) {
          Sentry.captureException(updateError, {
            tags: { component: "stripe_webhook", event_type: event.type },
          });
        }

        // Notify seller of payout
        const sellerId = transfer.metadata?.seller_id;
        if (sellerId) {
          await supabase.from("notifications").insert({
            user_id: sellerId,
            type: "payout_sent",
            title: "Payout Sent",
            message: `Payout of ${transfer.amount / 100} ${transfer.currency.toUpperCase()} has been sent to your account.`,
            read: false,
          });
        }
      }
    }

    // NEW: Handle Account events (Connect account status updates)
    if (event.type === "account.updated") {
      const account = event.data.object as Stripe.Account;
      const userId = account.metadata?.user_id;

      if (userId) {
        // Determine status
        let status = "pending";
        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          status = "active";
        } else if (account.requirements?.currently_due?.length > 0) {
          status = "restricted";
        }

        // Update stripe_accounts table
        const { error: updateError } = await supabase
          .from("stripe_accounts")
          .update({
            status,
            payouts_enabled: account.payouts_enabled || false,
            charges_enabled: account.charges_enabled || false,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", account.id);

        if (updateError) {
          Sentry.captureException(updateError, {
            tags: { component: "stripe_webhook", event_type: event.type },
            extra: { accountIdPrefix: account.id.slice(0, 8) },
          });
        }

        // Notify user of status change
        if (status === "active") {
          await supabase.from("notifications").insert({
            user_id: userId,
            type: "stripe_account_activated",
            title: "Stripe Account Activated",
            message: "Your Stripe account is now active and ready to receive payouts.",
            read: false,
          });
        }
      }
    }

    // Mark event as processed (idempotency)
    processedEvents.add(event.id);
    // Note: In production, store in Redis/database with TTL (e.g., 24 hours)

    return Response.json({ received: true });
  } catch (error) {
    // ... existing error handling ...
  }
}
```

**Rationale:**
- Extend existing webhook handler (ikke ny fil)
- Payment Intent events → update transactions
- Transfer events → track payouts
- Account events → update account status
- Notification creation for user feedback
- Webhook idempotency: Events tracked to prevent duplicate processing (in-memory Set for MVP, Redis/database for production)

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Webhook handler kan modtage payment_intent.succeeded events
- [ ] Webhook handler kan modtage payment_intent.payment_failed events
- [ ] Webhook handler kan modtage transfer.created events
- [ ] Webhook handler kan modtage account.updated events
- [ ] Transactions opdateres korrekt ved events
- [ ] Notifications oprettes ved events

**⚠️ PAUSE HERE** - Test webhook events with Stripe CLI before Phase 5

---

## Phase 5: Payout Scheduling & Seller Dashboard

### Overview
Implementér payout scheduling logic (ved delivery) og seller payout dashboard/historik.

### Changes Required

#### 5.1 Payout Scheduling Service
**File:** `apps/web/lib/services/payout-service.ts` (ny)

**Changes:**
```typescript
import { createServiceClient } from "@/lib/supabase/server";
import { StripeService } from "./stripe-service";
import { ApiError } from "@/lib/api/errors";
import * as Sentry from "@sentry/nextjs";

/**
 * PayoutService - Handles seller payout scheduling
 * 
 * Payouts are triggered when order status = "delivered"
 * Payout amount = item price - platform fee (calculated in HUD-37)
 */
export class PayoutService {
  private stripeService: StripeService;

  constructor() {
    this.stripeService = new StripeService();
  }

  /**
   * Schedule payout for seller when order is delivered
   * 
   * @param transactionId Transaction ID
   * @param orderStatus Order status (must be "delivered")
   */
  async schedulePayout(transactionId: string, orderStatus: string): Promise<void> {
    if (orderStatus !== "delivered") {
      throw new ApiError(
        "BAD_REQUEST",
        "Payout can only be scheduled when order status is 'delivered'",
        400
      );
    }

    const supabase = await createServiceClient();

    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("id", transactionId)
      .single();

    if (txError || !transaction) {
      throw new ApiError("NOT_FOUND", "Transaction not found", 404);
    }

    // Check if payout already exists
    if (transaction.stripe_transfer_id) {
      throw new ApiError(
        "CONFLICT",
        "Payout already processed for this transaction",
        409
      );
    }

    // Get seller's Stripe account
    const { data: sellerAccount, error: accountError } = await supabase
      .from("stripe_accounts")
      .select("stripe_account_id, status, payouts_enabled")
      .eq("user_id", transaction.seller_id)
      .single();

    if (accountError || !sellerAccount) {
      throw new ApiError(
        "BAD_REQUEST",
        "Seller does not have a connected Stripe account",
        400
      );
    }

    if (sellerAccount.status !== "active" || !sellerAccount.payouts_enabled) {
      throw new ApiError(
        "BAD_REQUEST",
        "Seller's Stripe account is not active or payouts not enabled",
        400
      );
    }

    // Calculate payout amount (item price - platform fee)
    // TODO: Platform fee calculation will be in HUD-37
    // For now, use full amount (fee calculation will be added later)
    const payoutAmount = transaction.amount; // in minor units

    try {
      // Create transfer (payout)
      // MVP: All payouts in EUR (hardcoded)
      // Future: Use transaction.currency
      const transfer = await this.stripeService.createTransfer({
        amount: payoutAmount,
        currency: "eur", // MVP: Hardcoded EUR, Future: transaction.currency || "eur"
        sellerStripeAccountId: sellerAccount.stripe_account_id,
        transferGroup: `txn_${transactionId}`,
        metadata: {
          transaction_id: transactionId,
          seller_id: transaction.seller_id,
          buyer_id: transaction.buyer_id,
        },
      });

      // Update transaction with transfer ID
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          stripe_transfer_id: transfer.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      if (updateError) {
        Sentry.captureException(updateError, {
          tags: { component: "payout_service", operation: "update_transaction" },
        });
        throw updateError;
      }

      // Notification will be created by webhook handler (transfer.created event)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Sentry.captureException(error, {
        tags: { component: "payout_service", operation: "schedule_payout" },
        extra: { transactionIdPrefix: transactionId.slice(0, 8) },
      });
      throw error;
    }
  }
}
```

**Rationale:**
- Payout scheduling ved delivery (besluttet i chat)
- Transfer creation via StripeService
- Error handling og validation

**⚠️ IMPORTANT: Payout Trigger Mechanism**
- `PayoutService.schedulePayout()` skal kaldes fra:
  - **Order management system (HUD-39)**: Når order status ændres til "delivered" via Medusa order update
  - **Webhook handler (Phase 4)**: Hvis order status opdateres via webhook fra shipping provider
  - **Cron job (future)**: Alternativt kan en cron job tjekke for delivered orders og trigger payouts
- For nu (HUD-38): Metoden er klar, men integration med order system sker i HUD-39
- **Integration point:** HUD-39 skal kalde `PayoutService.schedulePayout(transactionId, "delivered")` når order status = "delivered"

#### 5.2 Seller Payout Dashboard API
**File:** `apps/web/app/api/v1/seller/payouts/route.ts` (ny)

**Changes:**
```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { createServiceClient } from "@/lib/supabase/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";

/**
 * GET /api/v1/seller/payouts
 * Get seller payout history
 */
const handler = async (req: NextRequest) => {
  try {
    const { userId } = await requireAuth(req);
    const supabase = await createServiceClient();

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const cursor = searchParams.get("cursor") || undefined;

    // Get transactions where user is seller and has transfer_id (payout completed)
    let query = supabase
      .from("transactions")
      .select("*")
      .eq("seller_id", userId)
      .not("stripe_transfer_id", "is", null)
      .order("completed_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("completed_at", cursor);
    }

    const { data: transactions, error } = await query;

    if (error) {
      throw error;
    }

    return successResponse({
      payouts: transactions || [],
      nextCursor: transactions && transactions.length === limit
        ? transactions[transactions.length - 1].completed_at
        : null,
    });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
```

**Rationale:**
- Payout historik for seller
- Cursor-based pagination
- Filter på transactions med transfer_id

#### 5.3 Seller Payout Dashboard Page
**File:** `apps/web/app/(dashboard)/seller/payouts/page.tsx` (ny)

**Changes:**
```typescript
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface Payout {
  id: string;
  amount: number;
  currency: string;
  completed_at: string;
  stripe_transfer_id: string;
}

export default function SellerPayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/seller/payouts")
      .then((res) => res.json())
      .then((data) => {
        if (data.data?.payouts) {
          setPayouts(data.data.payouts);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  return (
    <div className="container max-w-4xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>View your payout history and status</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : payouts.length === 0 ? (
            <p className="text-muted-foreground">No payouts yet.</p>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between border-b pb-4"
                >
                  <div>
                    <p className="font-medium">
                      {formatCurrency(payout.amount, payout.currency)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payout.completed_at).toLocaleDateString("da-DK")}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Transfer ID: {payout.stripe_transfer_id.slice(0, 12)}...
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Rationale:**
- Simple payout historik UI
- Viser amount, date, transfer ID

### Success Criteria

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] PayoutService kan schedule payout ved delivery
- [ ] Payout API returnerer payout historik
- [ ] Seller payout dashboard viser payouts korrekt
- [ ] Payouts oprettes korrekt i Stripe (test mode)

**⚠️ PAUSE HERE** - Test payout flow manually before Phase 6

---

## Phase 6: Testing & Verification

### Overview
Comprehensive testing af alle Stripe Connect features, inkluderet unit tests, integration tests, og manual verification.

### Changes Required

#### 6.1 Unit Tests for StripeService
**File:** `apps/web/lib/services/__tests__/stripe-service.test.ts` (ny)

**Changes:**
```typescript
import { StripeService } from "../stripe-service";
import Stripe from "stripe";

// Mock Stripe client
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    accounts: {
      retrieve: jest.fn(),
    },
  }));
});

describe("StripeService", () => {
  let stripeService: StripeService;

  beforeEach(() => {
    stripeService = new StripeService();
  });

  describe("createPaymentIntent", () => {
    it("should create payment intent with correct parameters", async () => {
      // Test implementation
    });

    it("should throw error if seller account not found", async () => {
      // Test implementation
    });
  });

  // More tests...
});
```

**Rationale:**
- Unit tests for core methods
- Mock Stripe client for testing

#### 6.2 Integration Tests
**File:** `apps/web/app/api/v1/seller/stripe-account/__tests__/route.test.ts` (ny)

**Changes:**
- Integration tests for Connect OAuth flow
- Test webhook event handling
- Test payout scheduling

### Success Criteria

#### Automated Verification:
- [ ] All unit tests pass: `npm run test`
- [ ] Integration tests pass
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] Complete OAuth flow works end-to-end
- [ ] Payment Intent creation works in test mode
- [ ] Webhook events are received and processed correctly
- [ ] Payout scheduling works when order status = "delivered"
- [ ] Refund handling works (full and partial)
- [ ] Seller dashboard shows correct payout history
- [ ] All error cases handled gracefully

**✅ COMPLETE** - All phases implemented and verified

---

## Testing Strategy

### Unit Tests
- StripeService methods (mocked Stripe client)
- PayoutService logic
- Error handling scenarios

### Integration Tests
- Connect OAuth flow
- Webhook event processing
- Payout scheduling

### Manual Testing
- Complete seller onboarding flow
- Payment processing in Stripe test mode
- Webhook testing with Stripe CLI
- Payout flow verification
- Refund flow verification

### Test Data
- Use Stripe test mode for all testing
- Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)
- Test Connect accounts in test mode

---

## Environment Variables Required

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Connect (optional - for custom branding)
STRIPE_CONNECT_CLIENT_ID=ca_...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## References

- Linear: HUD-38
- Related files:
  - `apps/web/app/api/v1/stripe/webhook/route.ts` - Existing webhook handler
  - `apps/web/app/api/v1/profile/identity/start/route.ts` - Stripe Identity reference
  - `apps/web/lib/services/bid-service.ts` - Service class pattern
  - `.project/marketplace-features-linear-document.md` - Project context
- Stripe Docs:
  - [Stripe Connect Express](https://stripe.com/docs/connect/express-accounts)
  - [Payment Intents](https://stripe.com/docs/payments/payment-intents)
  - [Transfers](https://stripe.com/docs/connect/charges-transfers)
  - [Refunds](https://stripe.com/docs/refunds)

---

## Notes

- **Application Fee**: Platform fee calculation will be implemented in HUD-37. For now, Payment Intents are created without application fee.
- **Payout Timing**: Payouts are scheduled when order status = "delivered" (not "shipped"). This ensures buyer has received the item before seller gets paid.
- **Refund Policy**: 14-day refund window. Buyers can request refunds, sellers can accept/reject. Full and partial refunds supported.
- **Minimum Payout Threshold**: Not implemented in MVP. Can be added later if needed.
- **Error Handling**: All Stripe errors are logged to Sentry with context (no PII). User-friendly error messages returned to frontend. Stripe-specific error types handled (rate limits, invalid requests, card errors) with appropriate HTTP status codes.
- **Webhook Idempotency**: Events are tracked to prevent duplicate processing. In MVP, uses in-memory Set. For production, should use Redis or database with TTL.
- **Retry Logic**: Transient Stripe API failures (rate limits) are retried once with short delay for `getPaymentIntent` and `createTransfer` methods.
- **Currency Strategy (MVP)**: All transactions in EUR for simplicity:
  - All listings/auctions: `currency = "EUR"` (default in database)
  - Stripe Connect accounts: Created in EUR country ("DE" - Germany) for all sellers
  - Payment Intents: `currency: "eur"` (hardcoded)
  - Transfers (payouts): `currency: "eur"` (hardcoded)
  - **Future Enhancement**: Multi-currency support can be added later (database schema already supports it)
- **Payout Trigger**: PayoutService.schedulePayout() is ready but must be called from order management system (HUD-39) when order status = "delivered".

---

**Last Updated:** 2025-12-16  
**Status:** Ready for Implementation


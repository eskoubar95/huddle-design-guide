# Fase 4: Backend API Routes - Implementation Plan

## Overview

Opret Next.js API routes i `apps/web/app/api/v1/` som backend for frontend. Dette inkluderer:
- 20+ API endpoints for jerseys, listings, auctions, bids, posts, profiles og auth
- Clerk authentication integration (HUD-11)
- Konsistent error handling, validation og response formatting
- Cursor-based pagination
- Rate limiting
- Frontend migration fra direkte Supabase calls til API endpoints

## Linear Issues
**HUD-12:** Fase 4: Opret backend API routes  
**HUD-11:** Fase 3.5: Migrer Auth Context til Next.js pattern (Clerk integration)

## Current State Analysis

### What Exists:
- ✅ Supabase client/server setup i `apps/web/lib/supabase/`
- ✅ Database schema i `public` schema (jerseys, listings, auctions, bids, posts, profiles, etc.)
- ✅ TanStack Query provider setup
- ✅ Frontend komponenter der bruger direkte Supabase client calls

### What's Missing:
- ❌ Ingen API routes i `apps/web/app/api/`
- ❌ Ingen auth helper (`requireAuth`) for Clerk
- ❌ Ingen services/repositories struktur
- ❌ Ingen validation schemas (Zod)
- ❌ Ingen error handling utilities
- ❌ Ingen rate limiting
- ❌ Clerk integration (kun Supabase Auth eksisterer)
- ❌ Profile sync mellem Clerk og Supabase

### Key Discoveries:
- Frontend bruger direkte Supabase client calls (fx `apps/web/app/(dashboard)/marketplace/page.tsx:130`)
- AuthContext bruger Supabase Auth (`apps/web/contexts/AuthContext.tsx`)
- Ingen Clerk packages installeret endnu
- Database schema har `profiles` tabel med 1-1 mapping til `auth.users.id`
- Cursor-based pagination er dokumenteret i API design guide

## Desired End State

### API Structure:
```
apps/web/app/api/v1/
├── jerseys/
│   ├── route.ts              # GET, POST
│   └── [id]/
│       └── route.ts          # GET, PATCH, DELETE
├── listings/
│   ├── route.ts              # GET, POST
│   └── [id]/
│       └── route.ts          # GET, PATCH, DELETE
├── auctions/
│   ├── route.ts              # GET, POST
│   └── [id]/
│       └── route.ts          # GET
├── bids/
│   └── route.ts              # POST
├── posts/
│   ├── route.ts              # GET, POST
│   └── [id]/
│       └── route.ts          # GET
├── profiles/
│   └── [id]/
│       └── route.ts          # GET, PATCH
└── auth/
    └── route.ts              # POST (signup/signin/signout)
```

### Verification Criteria:
- ✅ Alle 20+ endpoints implementeret og funktionelle
- ✅ Clerk authentication virker i frontend og API
- ✅ Profile sync mellem Clerk og Supabase fungerer
- ✅ Error handling er konsistent på tværs af alle endpoints
- ✅ Request validation med Zod fungerer
- ✅ Cursor-based pagination implementeret
- ✅ Rate limiting aktivt
- ✅ Frontend bruger API endpoints i stedet for direkte Supabase
- ✅ Alle tests passerer

## What We're NOT Doing

- ❌ MedusaJS integration (sker i senere fase)
- ❌ WebSocket/real-time features (bruger Supabase realtime hvis nødvendigt)
- ❌ File upload endpoints (bruger Supabase Storage direkte)
- ❌ Admin endpoints (skal implementeres senere)
- ❌ Search endpoints (skal implementeres senere)
- ❌ Notifications endpoints (skal implementeres senere)
- ❌ Messaging endpoints (skal implementeres senere)

## Implementation Approach

**Strategy:** Bottom-up approach - byg fundament først, derefter endpoints, til sidst frontend migration.

**Phases:**
1. Foundation (auth, errors, rate limiting)
2. Validation schemas
3. Repository layer
4. Service layer
5. API routes (resource-by-resource)
6. Frontend migration
7. Testing & polish

---

## Phase 1: Foundation - Auth, Errors & Rate Limiting

### Overview
Opret fundamentale utilities: Clerk auth helper, error handling, rate limiting middleware og response helpers.

### Changes Required:

#### 1. Install Clerk Packages
**File:** `apps/web/package.json`
**Changes:** Tilføj dependencies
```json
{
  "dependencies": {
    "@clerk/nextjs": "^5.x.x",
    "@clerk/backend": "^1.x.x",
    "@sentry/nextjs": "^8.x.x"
  },
  "scripts": {
    "typecheck": "tsc --noEmit"
  }
}
```
**Rationale:** Clerk packages for frontend og backend auth, Sentry for error tracking, typecheck script for validation

#### 2. Clerk Configuration
**File:** `apps/web/.env.local` (eksempel)
**Changes:** Tilføj Clerk environment variables
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Supabase (eksisterende)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...  # For server-side operations (API routes)
# Note: createClient() i lib/supabase/server.ts skal opdateres til at bruge service role key

# Sentry (optional, for production)
SENTRY_DSN=...
NEXT_PUBLIC_SENTRY_DSN=...
```
**Rationale:** Clerk konfiguration for Next.js, Supabase service role key for API routes, Sentry for error tracking

#### 3. Auth Helper
**File:** `apps/web/lib/auth.ts` (ny fil)
**Changes:** Opret `requireAuth()` helper
```typescript
import { clerkClient } from "@clerk/backend";
import { createClient } from "@/lib/supabase/server";
import { ApiError } from "@/lib/api/errors";

const clerk = clerkClient(process.env.CLERK_SECRET_KEY!);

export interface AuthResult {
  userId: string;
  profileId: string;
}

/**
 * Verificer Clerk JWT token og returner userId + profileId
 * Opretter automatisk profile hvis den ikke eksisterer
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  }

  const token = authHeader.replace("Bearer ", "");
  
  try {
    const session = await clerk.verifyToken(token);
    const userId = session.sub;

    // Sync profile i Supabase
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (!profile) {
      // Opret profile ved første API kald
      const { data: newProfile, error } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          username: session.username || `user_${userId.slice(0, 8)}`,
          avatar_url: session.imageUrl || null,
        })
        .select("id")
        .single();

      if (error) {
        throw new ApiError("INTERNAL_SERVER_ERROR", "Failed to create profile", 500);
      }

      return { userId, profileId: newProfile.id };
    }

    return { userId, profileId: profile.id };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("UNAUTHORIZED", "Invalid token", 401);
  }
}

/**
 * Optional auth - returner null hvis ikke autentificeret
 */
export async function optionalAuth(req: Request): Promise<AuthResult | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}
```
**Rationale:** Centraliseret auth verification med automatisk profile sync

#### 4. Error Handling Utilities
**File:** `apps/web/lib/api/errors.ts` (ny fil)
**Changes:** Opret error classes og helpers
```typescript
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export function handleApiError(error: unknown, req?: Request): Response {
  if (error instanceof ApiError) {
    return Response.json(error.toJSON(), { status: error.statusCode });
  }

  // Capture unexpected errors with Sentry (per 24-observability_sentry.mdc)
  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    // Server-side only, production only
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureException(error, {
        tags: { component: "api", type: "unexpected_error" },
        extra: { 
          endpoint: req?.url || "unknown",
          method: req?.method || "unknown"
        }, // No PII
      });
    }).catch(() => {
      // Sentry not available, log to console
      console.error("Unexpected API error:", error);
    });
  } else {
    console.error("Unexpected API error:", error);
  }

  return Response.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        details: null,
      },
    },
    { status: 500 }
  );
}
```
**Rationale:** Konsistent error formatting på tværs af alle endpoints

#### 5. Response Helpers
**File:** `apps/web/lib/api/responses.ts` (ny fil)
**Changes:** Opret response helper functions
```typescript
export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json(data, { status });
}

export function createdResponse<T>(data: T): Response {
  return Response.json(data, { status: 201 });
}

export function noContentResponse(): Response {
  return new Response(null, { status: 204 });
}

export function paginatedResponse<T>(
  items: T[],
  nextCursor: string | null
): Response {
  return Response.json({ items, nextCursor }, { status: 200 });
}
```
**Rationale:** Konsistent response formatting

#### 6. Rate Limiting Middleware
**File:** `apps/web/lib/api/rate-limit.ts` (ny fil)
**Changes:** Opret rate limiting middleware
```typescript
import { NextRequest, NextResponse } from "next/server";

// Simple in-memory rate limiter (kan opgraderes til Redis senere)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutter
const ANONYMOUS_LIMIT = 100;
const AUTHENTICATED_LIMIT = 300;

export async function getRateLimitKey(req: NextRequest): Promise<string> {
  // For authenticated users, use userId from token
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const { clerkClient } = await import("@clerk/backend");
      const clerk = clerkClient(process.env.CLERK_SECRET_KEY!);
      const token = authHeader.replace("Bearer ", "");
      const session = await clerk.verifyToken(token);
      return `auth:${session.sub}`;
    } catch {
      // Invalid token, fallback to IP
      return `anon:${req.ip || "unknown"}`;
    }
  }
  return `anon:${req.ip || "unknown"}`;
}

export async function checkRateLimit(req: NextRequest): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const key = await getRateLimitKey(req);
  const limit = req.headers.get("authorization") ? AUTHENTICATED_LIMIT : ANONYMOUS_LIMIT;
  const now = Date.now();

  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetAt) {
    // Reset window
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: limit - 1, resetAt: now + RATE_LIMIT_WINDOW };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: limit - record.count, resetAt: record.resetAt };
}

export function rateLimitMiddleware(
  handler: (req: NextRequest) => Promise<Response>
) {
  return async (req: NextRequest): Promise<Response> => {
    const { allowed, remaining, resetAt } = await checkRateLimit(req);

    if (!allowed) {
      return Response.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again later.",
            details: { resetAt },
          },
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "300",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": resetAt.toString(),
          },
        }
      );
    }

    const response = await handler(req);
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", resetAt.toString());
    return response;
  };
}
```
**Rationale:** Rate limiting for at beskytte API mod abuse

#### 7. Clerk Provider Setup (HUD-11)
**File:** `apps/web/app/layout.tsx`
**Changes:** Erstat AuthProvider med ClerkProvider
```typescript
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <QueryProvider>
            {children}
            <Toaster />
            <Sonner />
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
```
**Rationale:** Clerk integration i frontend (HUD-11)

#### 8. Clerk Middleware
**File:** `apps/web/middleware.ts` (ny fil)
**Changes:** Opret Next.js middleware for auth protection
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/wardrobe(.*)",
  "/marketplace(.*)",
  "/profile(.*)",
  "/settings(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|ico|png|svg|jpg|jpeg|gif|webp)).*)"],
};
```
**Rationale:** Protect routes med Clerk middleware

#### 9. Health Check Endpoint
**File:** `apps/web/app/api/v1/health/route.ts` (ny fil)
**Changes:** Opret health check endpoint for monitoring
```typescript
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    // Check database connection
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    return Response.json(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        database: error ? "unhealthy" : "healthy",
      },
      { status: error ? 503 : 200 }
    );
  } catch (error) {
    return Response.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "unhealthy",
      },
      { status: 503 }
    );
  }
}
```
**Rationale:** Health check endpoint for monitoring og uptime checks

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck` (eller `tsc --noEmit`)
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] ClerkProvider er integreret i layout
- [ ] Middleware beskytter protected routes
- [ ] `requireAuth()` helper kan verificere tokens
- [ ] Profile sync fungerer (opretter profile ved første API kald)
- [ ] Rate limiting middleware virker (test med authenticated og anonymous requests)
- [ ] Error responses har korrekt format
- [ ] Sentry captures unexpected errors (tjek Sentry dashboard)
- [ ] Health check endpoint `/api/v1/health` returnerer status

**⚠️ PAUSE HERE** - Manual approval before Phase 2

---

## Phase 2: Validation Schemas

### Overview
Opret Zod validation schemas for alle API resources i `apps/web/lib/validation/`.

### Changes Required:

#### 1. Jersey Schemas
**File:** `apps/web/lib/validation/jersey-schemas.ts` (ny fil)
**Changes:** Opret schemas for jersey operations
```typescript
import { z } from "zod";

export const jerseyCreateSchema = z.object({
  club: z.string().trim().min(1, "Club name is required").max(100),
  season: z.string().trim().min(1, "Season is required").max(20),
  jerseyType: z.enum(["Home", "Away", "Third", "Goalkeeper", "Special"]),
  playerName: z.string().trim().max(50).optional(),
  playerNumber: z.string().trim().max(3).optional(),
  badges: z.array(z.string()).max(10).optional(),
  conditionRating: z.number().int().min(1).max(10).optional(),
  notes: z.string().trim().max(1000).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  images: z.array(z.string().url()).min(1, "At least one image required").max(5),
});

export const jerseyUpdateSchema = jerseyCreateSchema.partial();

export type JerseyCreateInput = z.infer<typeof jerseyCreateSchema>;
export type JerseyUpdateInput = z.infer<typeof jerseyUpdateSchema>;
```
**Rationale:** Type-safe validation for jersey operations

#### 2. Listing Schemas
**File:** `apps/web/lib/validation/listing-schemas.ts` (ny fil)
**Changes:** Opret schemas for sale listings
```typescript
import { z } from "zod";

const shippingSchema = z.object({
  worldwide: z.boolean(),
  localOnly: z.boolean(),
  costBuyer: z.boolean(),
  costSeller: z.boolean(),
  freeInCountry: z.boolean(),
});

export const saleListingCreateSchema = z.object({
  jerseyId: z.string().uuid(),
  price: z.string().regex(/^\d+\.?\d{0,2}$/, "Invalid price format"),
  currency: z.enum(["EUR", "DKK", "USD", "GBP"]),
  negotiable: z.boolean().default(false),
  shipping: shippingSchema,
});

export const saleListingUpdateSchema = saleListingCreateSchema.partial();

export type SaleListingCreateInput = z.infer<typeof saleListingCreateSchema>;
export type SaleListingUpdateInput = z.infer<typeof saleListingUpdateSchema>;
```
**Rationale:** Validation for sale listing operations

#### 3. Auction Schemas
**File:** `apps/web/lib/validation/auction-schemas.ts` (ny fil)
**Changes:** Opret schemas for auctions og bids
```typescript
import { z } from "zod";

const shippingSchema = z.object({
  worldwide: z.boolean(),
  localOnly: z.boolean(),
  costBuyer: z.boolean(),
  costSeller: z.boolean(),
  freeInCountry: z.boolean(),
});

export const auctionCreateSchema = z.object({
  jerseyId: z.string().uuid(),
  startingBid: z.string().regex(/^\d+\.?\d{0,2}$/, "Invalid price format"),
  buyNowPrice: z.string().regex(/^\d+\.?\d{0,2}$/).optional(),
  currency: z.enum(["EUR", "DKK", "USD", "GBP"]),
  durationHours: z.enum(["24", "48", "72", "168"]).transform(Number),
  shipping: shippingSchema,
});

export const bidCreateSchema = z.object({
  auctionId: z.string().uuid(),
  amount: z.string().regex(/^\d+\.?\d{0,2}$/, "Invalid price format"),
});

export type AuctionCreateInput = z.infer<typeof auctionCreateSchema>;
export type BidCreateInput = z.infer<typeof bidCreateSchema>;
```
**Rationale:** Validation for auction operations

#### 4. Post Schemas
**File:** `apps/web/lib/validation/post-schemas.ts` (ny fil)
**Changes:** Opret schemas for posts
```typescript
import { z } from "zod";

export const postCreateSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(2000),
  jerseyId: z.string().uuid().optional(),
});

export type PostCreateInput = z.infer<typeof postCreateSchema>;
```
**Rationale:** Validation for post operations

#### 5. Profile Schemas
**File:** `apps/web/lib/validation/profile-schemas.ts` (ny fil)
**Changes:** Opret schemas for profile updates
```typescript
import { z } from "zod";

export const profileUpdateSchema = z.object({
  username: z.string().trim().min(1).max(50).optional(),
  bio: z.string().trim().max(500).optional(),
  country: z.string().length(2).optional(), // ISO country code
  avatarUrl: z.string().url().optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
```
**Rationale:** Validation for profile operations

#### 6. Query Parameter Schemas
**File:** `apps/web/lib/validation/query-schemas.ts` (ny fil)
**Changes:** Opret schemas for query parameters (pagination, filters)
```typescript
import { z } from "zod";

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

export const jerseyListQuerySchema = paginationSchema.extend({
  ownerId: z.string().uuid().optional(),
  visibility: z.enum(["public", "private", "all"]).optional(),
  club: z.string().optional(),
  season: z.string().optional(),
});

export const listingListQuerySchema = paginationSchema.extend({
  status: z.enum(["active", "sold", "cancelled"]).optional(),
  club: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  country: z.string().optional(),
  sort: z.enum(["createdAt_desc", "price_asc", "price_desc"]).optional(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type JerseyListQuery = z.infer<typeof jerseyListQuerySchema>;
export type ListingListQuery = z.infer<typeof listingListQuerySchema>;
```
**Rationale:** Type-safe query parameter validation

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Alle schemas kan parse valid input
- [ ] Alle schemas reject invalid input
- [ ] Type inference virker korrekt

**⚠️ PAUSE HERE** - Manual approval before Phase 3

---

## Phase 3: Repository Layer

### Overview
Opret repository layer for Supabase database access. Repositories håndterer kun data access, ingen business logic.

### Changes Required:

#### 0. Update Supabase Server Client (if needed)
**File:** `apps/web/lib/supabase/server.ts`
**Changes:** Opret eller opdater server client til at bruge service role key for API routes
```typescript
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Create Supabase client with service role key for server-side API operations
 * This bypasses RLS - we handle authorization in service layer
 */
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
```
**Note:** Hvis `server.ts` allerede bruger `createServerClient` fra `@supabase/ssr`, kan vi beholde det, men vi skal sikre at API routes får service role key. Alternativt kan vi oprette en separat `createServiceClient()` funktion.
**Rationale:** API routes skal bruge service role key for at bypass RLS (vi håndterer auth i service layer)

#### 1. Base Repository
**File:** `apps/web/lib/repositories/base-repository.ts` (ny fil)
**Changes:** Opret base repository med cursor pagination helper
```typescript
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

export interface PaginationParams {
  limit: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
}

export abstract class BaseRepository {
  protected async getSupabase() {
    // createClient() from server.ts uses service role key for server-side operations
    // This bypasses RLS which is correct for API routes (we handle auth in service layer)
    return await createClient();
  }

  protected encodeCursor(id: string, createdAt: string): string {
    return Buffer.from(`${id}:${createdAt}`).toString("base64");
  }

  protected decodeCursor(cursor: string): { id: string; createdAt: string } {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const [id, createdAt] = decoded.split(":");
    return { id, createdAt };
  }
}
```
**Rationale:** Base klasse med shared utilities

#### 2. Jersey Repository
**File:** `apps/web/lib/repositories/jersey-repository.ts` (ny fil)
**Changes:** Opret jersey repository
```typescript
import { BaseRepository, PaginationParams, PaginatedResult } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Jersey = Database["public"]["Tables"]["jerseys"]["Row"];
type JerseyInsert = Database["public"]["Tables"]["jerseys"]["Insert"];
type JerseyUpdate = Database["public"]["Tables"]["jerseys"]["Update"];

export class JerseyRepository extends BaseRepository {
  async findById(id: string): Promise<Jersey | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("jerseys")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw error;
    }

    return data;
  }

  async findMany(params: PaginationParams & { ownerId?: string; visibility?: string }): Promise<PaginatedResult<Jersey>> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from("jerseys")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params.limit + 1); // Fetch one extra to check if there's more

    if (params.ownerId) {
      query = query.eq("owner_id", params.ownerId);
    }

    if (params.visibility) {
      if (params.visibility !== "all") {
        query = query.eq("visibility", params.visibility);
      }
    }

    if (params.cursor) {
      const { id, createdAt } = this.decodeCursor(params.cursor);
      // Cursor pagination: created_at < cursor.createdAt OR (created_at = cursor.createdAt AND id < cursor.id)
      query = query
        .lt("created_at", createdAt)
        .or(`created_at.eq.${createdAt},id.lt.${id}`);
    }

    const { data, error } = await query;

    if (error) throw error;

    const items = data || [];
    const hasMore = items.length > params.limit;
    const result = hasMore ? items.slice(0, params.limit) : items;

    const nextCursor = hasMore && result.length > 0
      ? this.encodeCursor(result[result.length - 1].id, result[result.length - 1].created_at)
      : null;

    return { items: result, nextCursor };
  }

  async create(data: JerseyInsert): Promise<Jersey> {
    const supabase = await this.getSupabase();
    const { data: jersey, error } = await supabase
      .from("jerseys")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return jersey;
  }

  async update(id: string, data: JerseyUpdate): Promise<Jersey> {
    const supabase = await this.getSupabase();
    const { data: jersey, error } = await supabase
      .from("jerseys")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!jersey) throw new Error("Jersey not found");
    return jersey;
  }

  async delete(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from("jerseys")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
```
**Rationale:** Data access layer for jerseys med cursor pagination

#### 3. Listing Repository
**File:** `apps/web/lib/repositories/listing-repository.ts` (ny fil)
**Changes:** Opret sale listing repository
```typescript
import { BaseRepository, PaginationParams, PaginatedResult } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type SaleListing = Database["public"]["Tables"]["sale_listings"]["Row"];
type SaleListingInsert = Database["public"]["Tables"]["sale_listings"]["Insert"];
type SaleListingUpdate = Database["public"]["Tables"]["sale_listings"]["Update"];

export class ListingRepository extends BaseRepository {
  async findById(id: string): Promise<SaleListing | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("sale_listings")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async findMany(params: PaginationParams & { status?: string; sellerId?: string }): Promise<PaginatedResult<SaleListing>> {
    const supabase = await this.getSupabase();
    let query = supabase
      .from("sale_listings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(params.limit + 1);

    if (params.status) {
      query = query.eq("status", params.status);
    }

    if (params.sellerId) {
      query = query.eq("seller_id", params.sellerId);
    }

    if (params.cursor) {
      const { id, createdAt } = this.decodeCursor(params.cursor);
      query = query
        .lt("created_at", createdAt)
        .or(`created_at.eq.${createdAt},id.lt.${id}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const items = data || [];
    const hasMore = items.length > params.limit;
    const result = hasMore ? items.slice(0, params.limit) : items;

    const nextCursor = hasMore && result.length > 0
      ? this.encodeCursor(result[result.length - 1].id, result[result.length - 1].created_at)
      : null;

    return { items: result, nextCursor };
  }

  async create(data: SaleListingInsert): Promise<SaleListing> {
    const supabase = await this.getSupabase();
    const { data: listing, error } = await supabase
      .from("sale_listings")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return listing;
  }

  async update(id: string, data: SaleListingUpdate): Promise<SaleListing> {
    const supabase = await this.getSupabase();
    const { data: listing, error } = await supabase
      .from("sale_listings")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!listing) throw new Error("Listing not found");
    return listing;
  }

  async delete(id: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from("sale_listings")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
```
**Rationale:** Data access for sale listings med cursor pagination

#### 4. Auction Repository
**File:** `apps/web/lib/repositories/auction-repository.ts` (ny fil)
**Changes:** Opret auction repository (lignende pattern som listing repository)
**Rationale:** Data access for auctions

#### 5. Bid Repository
**File:** `apps/web/lib/repositories/bid-repository.ts` (ny fil)
**Changes:** Opret bid repository
```typescript
import { BaseRepository } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Bid = Database["public"]["Tables"]["bids"]["Row"];
type BidInsert = Database["public"]["Tables"]["bids"]["Insert"];

export class BidRepository extends BaseRepository {
  async findById(id: string): Promise<Bid | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async findByAuctionId(auctionId: string, limit: number = 20): Promise<Bid[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("bids")
      .select("*")
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  async create(data: BidInsert): Promise<Bid> {
    const supabase = await this.getSupabase();
    const { data: bid, error } = await supabase
      .from("bids")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return bid;
  }
}
```
**Rationale:** Data access for bids

#### 6. Post Repository
**File:** `apps/web/lib/repositories/post-repository.ts` (ny fil)
**Changes:** Opret post repository (lignende pattern som jersey repository med cursor pagination)
**Rationale:** Data access for posts

#### 7. Profile Repository
**File:** `apps/web/lib/repositories/profile-repository.ts` (ny fil)
**Changes:** Opret profile repository
```typescript
import { BaseRepository } from "./base-repository";
import type { Database } from "@/lib/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export class ProfileRepository extends BaseRepository {
  async findById(id: string): Promise<Profile | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async findByUsername(username: string): Promise<Profile | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async update(id: string, data: ProfileUpdate): Promise<Profile> {
    const supabase = await this.getSupabase();
    const { data: profile, error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!profile) throw new Error("Profile not found");
    return profile;
  }
}
```
**Rationale:** Data access for profiles

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Alle repositories kan CRUD operations
- [ ] Cursor pagination virker korrekt
- [ ] Error handling virker (not found, etc.)

**⚠️ PAUSE HERE** - Manual approval before Phase 4

---

## Phase 4: Service Layer

### Overview
Opret service layer med business logic. Services kalder repositories og håndterer validation, authorization checks, osv.

### Changes Required:

#### 1. Jersey Service
**File:** `apps/web/lib/services/jersey-service.ts` (ny fil)
**Changes:** Opret jersey service
```typescript
import { JerseyRepository } from "@/lib/repositories/jersey-repository";
import { jerseyCreateSchema, jerseyUpdateSchema } from "@/lib/validation/jersey-schemas";
import { ApiError } from "@/lib/api/errors";
import type { JerseyCreateInput, JerseyUpdateInput } from "@/lib/validation/jersey-schemas";

export class JerseyService {
  private repository = new JerseyRepository();

  async getJersey(id: string, userId?: string) {
    const jersey = await this.repository.findById(id);
    
    if (!jersey) {
      throw new ApiError("NOT_FOUND", "Jersey not found", 404);
    }

    // Check visibility
    if (jersey.visibility === "private" && jersey.owner_id !== userId) {
      throw new ApiError("FORBIDDEN", "You don't have access to this jersey", 403);
    }

    return jersey;
  }

  async listJerseys(params: { limit: number; cursor?: string; ownerId?: string; visibility?: string }, userId?: string) {
    // If requesting all visibility, must be owner
    if (params.visibility === "all" && params.ownerId !== userId) {
      throw new ApiError("FORBIDDEN", "Cannot view all jerseys for other users", 403);
    }

    return await this.repository.findMany(params);
  }

  async createJersey(input: JerseyCreateInput, userId: string) {
    const validated = jerseyCreateSchema.parse(input);
    
    return await this.repository.create({
      ...validated,
      owner_id: userId,
    });
  }

  async updateJersey(id: string, input: JerseyUpdateInput, userId: string) {
    const jersey = await this.repository.findById(id);
    
    if (!jersey) {
      throw new ApiError("NOT_FOUND", "Jersey not found", 404);
    }

    if (jersey.owner_id !== userId) {
      throw new ApiError("FORBIDDEN", "You can only update your own jerseys", 403);
    }

    const validated = jerseyUpdateSchema.parse(input);
    return await this.repository.update(id, validated);
  }

  async deleteJersey(id: string, userId: string) {
    const jersey = await this.repository.findById(id);
    
    if (!jersey) {
      throw new ApiError("NOT_FOUND", "Jersey not found", 404);
    }

    if (jersey.owner_id !== userId) {
      throw new ApiError("FORBIDDEN", "You can only delete your own jerseys", 403);
    }

    await this.repository.delete(id);
  }
}
```
**Rationale:** Business logic for jersey operations med authorization checks

#### 2. Listing Service
**File:** `apps/web/lib/services/listing-service.ts` (ny fil)
**Changes:** Opret listing service (lignende pattern)
**Rationale:** Business logic for listings

#### 3. Auction Service
**File:** `apps/web/lib/services/auction-service.ts` (ny fil)
**Changes:** Opret auction service
**Rationale:** Business logic for auctions

#### 4. Bid Service
**File:** `apps/web/lib/services/bid-service.ts` (ny fil)
**Changes:** Opret bid service med bid validation og transaction handling
```typescript
import { BidRepository } from "@/lib/repositories/bid-repository";
import { AuctionRepository } from "@/lib/repositories/auction-repository";
import { ProfileRepository } from "@/lib/repositories/profile-repository";
import { ApiError } from "@/lib/api/errors";
import { createClient } from "@/lib/supabase/server";
import type { BidCreateInput } from "@/lib/validation/auction-schemas";

export class BidService {
  private bidRepository = new BidRepository();
  private auctionRepository = new AuctionRepository();
  private profileRepository = new ProfileRepository();

  async placeBid(auctionId: string, input: BidCreateInput, bidderId: string) {
    const auction = await this.auctionRepository.findById(auctionId);
    
    if (!auction || auction.status !== "active") {
      throw new ApiError("BAD_REQUEST", "Auction is not active", 400);
    }

    const amountNum = parseFloat(input.amount);
    const currentBid = parseFloat(auction.current_bid || auction.starting_bid);
    const minBid = currentBid + 0.01; // Minimum increment

    if (amountNum <= currentBid) {
      throw new ApiError("BAD_REQUEST", `Bid must be higher than ${currentBid}`, 400);
    }

    // Check if user is verified (fra HUD-11 requirements)
    const profile = await this.profileRepository.findById(bidderId);
    if (!profile?.is_verified) {
      throw new ApiError("FORBIDDEN", "ID verification required to place bids", 403);
    }

    // Use Supabase RPC function for atomic transaction
    // This ensures both bid creation and auction.current_bid update happen atomically
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("place_bid", {
      p_auction_id: auctionId,
      p_bidder_id: bidderId,
      p_amount: input.amount,
    });

    if (error) {
      // Handle specific errors from RPC
      if (error.code === "P0001") {
        throw new ApiError("BAD_REQUEST", error.message, 400);
      }
      throw new ApiError("INTERNAL_SERVER_ERROR", "Failed to place bid", 500);
    }

    return data;
  }
}
```
**Note:** This requires a Supabase RPC function `place_bid` to be created in a migration. Create migration file `supabase/migrations/YYYYMMDDHHMMSS_create_place_bid_rpc.sql`:

```sql
CREATE OR REPLACE FUNCTION place_bid(
  p_auction_id UUID,
  p_bidder_id UUID,
  p_amount TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_auction RECORD;
  v_bid RECORD;
BEGIN
  -- Check auction exists and is active
  SELECT * INTO v_auction
  FROM auctions
  WHERE id = p_auction_id AND status = 'active'
  FOR UPDATE; -- Lock row for transaction

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction is not active' USING ERRCODE = 'P0001';
  END IF;

  -- Validate bid amount
  IF p_amount::NUMERIC <= COALESCE(v_auction.current_bid, v_auction.starting_bid)::NUMERIC THEN
    RAISE EXCEPTION 'Bid must be higher than current bid' USING ERRCODE = 'P0001';
  END IF;

  -- Insert bid
  INSERT INTO bids (auction_id, bidder_id, amount)
  VALUES (p_auction_id, p_bidder_id, p_amount)
  RETURNING * INTO v_bid;

  -- Update auction current_bid atomically
  UPDATE auctions
  SET current_bid = p_amount::NUMERIC, updated_at = NOW()
  WHERE id = p_auction_id;

  RETURN row_to_json(v_bid)::JSONB;
END;
$$;
```

**Rationale:** Business logic for bids med atomic transaction handling via RPC function

#### 5. Post Service
**File:** `apps/web/lib/services/post-service.ts` (ny fil)
**Changes:** Opret post service
**Rationale:** Business logic for posts

#### 6. Profile Service
**File:** `apps/web/lib/services/profile-service.ts` (ny fil)
**Changes:** Opret profile service
**Rationale:** Business logic for profiles

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Authorization checks virker korrekt
- [ ] Business rules håndhæves (fx bid amount validation)
- [ ] Error handling virker

**⚠️ PAUSE HERE** - Manual approval before Phase 5

---

## Phase 5: API Routes - Jerseys

### Overview
Implementer jersey endpoints: GET/POST `/api/v1/jerseys` og GET/PATCH/DELETE `/api/v1/jerseys/[id]`.

### Changes Required:

#### 1. Jerseys List/Create Route
**File:** `apps/web/app/api/v1/jerseys/route.ts` (ny fil)
**Changes:** Opret GET og POST handlers
```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { paginatedResponse, createdResponse } from "@/lib/api/responses";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { JerseyService } from "@/lib/services/jersey-service";
import { jerseyListQuerySchema, jerseyCreateSchema } from "@/lib/validation/query-schemas";
import { jerseyCreateSchema as createSchema } from "@/lib/validation/jersey-schemas";

const handler = async (req: NextRequest) => {
  try {
    if (req.method === "GET") {
      const auth = await optionalAuth(req);
      const searchParams = req.nextUrl.searchParams;
      
      const query = jerseyListQuerySchema.parse({
        limit: searchParams.get("limit"),
        cursor: searchParams.get("cursor"),
        ownerId: searchParams.get("ownerId"),
        visibility: searchParams.get("visibility"),
      });

      const service = new JerseyService();
      const result = await service.listJerseys(query, auth?.userId);

      return paginatedResponse(result.items, result.nextCursor);
    }

    if (req.method === "POST") {
      const { userId } = await requireAuth(req);
      const body = await req.json();
      
      const input = createSchema.parse(body);
      const service = new JerseyService();
      const jersey = await service.createJersey(input, userId);

      return createdResponse(jersey);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const POST = rateLimitMiddleware(handler);
```
**Rationale:** Jersey list og create endpoints

#### 2. Jersey Detail/Update/Delete Route
**File:** `apps/web/app/api/v1/jerseys/[id]/route.ts` (ny fil)
**Changes:** Opret GET, PATCH og DELETE handlers
```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse, noContentResponse } from "@/lib/api/responses";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { JerseyService } from "@/lib/services/jersey-service";
import { jerseyUpdateSchema } from "@/lib/validation/jersey-schemas";

const handler = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params;

    if (req.method === "GET") {
      const auth = await optionalAuth(req);
      const service = new JerseyService();
      const jersey = await service.getJersey(id, auth?.userId);

      return successResponse(jersey);
    }

    if (req.method === "PATCH") {
      const { userId } = await requireAuth(req);
      const body = await req.json();
      
      const input = jerseyUpdateSchema.parse(body);
      const service = new JerseyService();
      const jersey = await service.updateJersey(id, input, userId);

      return successResponse(jersey);
    }

    if (req.method === "DELETE") {
      const { userId } = await requireAuth(req);
      const service = new JerseyService();
      await service.deleteJersey(id, userId);

      return noContentResponse();
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const PATCH = rateLimitMiddleware(handler);
export const DELETE = rateLimitMiddleware(handler);
```
**Rationale:** Jersey detail, update og delete endpoints

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] GET `/api/v1/jerseys` returnerer liste med pagination
- [ ] POST `/api/v1/jerseys` opretter jersey (kræver auth)
- [ ] GET `/api/v1/jerseys/[id]` returnerer jersey detaljer
- [ ] PATCH `/api/v1/jerseys/[id]` opdaterer jersey (kun owner)
- [ ] DELETE `/api/v1/jerseys/[id]` sletter jersey (kun owner)
- [ ] Error responses har korrekt format
- [ ] Rate limiting virker

**⚠️ PAUSE HERE** - Manual approval before Phase 6

---

## Phase 6: API Routes - Listings

### Overview
Implementer sale listing endpoints: GET/POST `/api/v1/listings` og GET/PATCH/DELETE `/api/v1/listings/[id]`.

### Changes Required:

#### 1. Listings List/Create Route
**File:** `apps/web/app/api/v1/listings/route.ts` (ny fil)
**Changes:** Opret GET og POST handlers med error handling
```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { paginatedResponse, createdResponse } from "@/lib/api/responses";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { ListingService } from "@/lib/services/listing-service";
import { listingListQuerySchema } from "@/lib/validation/query-schemas";
import { saleListingCreateSchema } from "@/lib/validation/listing-schemas";

const handler = async (req: NextRequest) => {
  try {
    if (req.method === "GET") {
      const auth = await optionalAuth(req);
      const searchParams = req.nextUrl.searchParams;
      
      const query = listingListQuerySchema.parse({
        limit: searchParams.get("limit"),
        cursor: searchParams.get("cursor"),
        status: searchParams.get("status"),
        // ... other filters
      });

      const service = new ListingService();
      const result = await service.listListings(query, auth?.userId);

      return paginatedResponse(result.items, result.nextCursor);
    }

    if (req.method === "POST") {
      const { userId } = await requireAuth(req);
      const body = await req.json();
      
      const input = saleListingCreateSchema.parse(body);
      const service = new ListingService();
      const listing = await service.createListing(input, userId);

      return createdResponse(listing);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const POST = rateLimitMiddleware(handler);
```
**Rationale:** Listing list og create endpoints med error handling

#### 2. Listing Detail/Update/Delete Route
**File:** `apps/web/app/api/v1/listings/[id]/route.ts` (ny fil)
**Changes:** Opret GET, PATCH og DELETE handlers med error handling (lignende pattern som jersey routes)
**Rationale:** Listing detail, update og delete endpoints

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Alle listing endpoints fungerer
- [ ] Authorization checks virker (kun seller kan update/delete)
- [ ] Validation virker

**⚠️ PAUSE HERE** - Manual approval before Phase 7

---

## Phase 7: API Routes - Auctions & Bids

### Overview
Implementer auction og bid endpoints: GET/POST `/api/v1/auctions`, GET `/api/v1/auctions/[id]` og POST `/api/v1/bids`.

### Changes Required:

#### 1. Auctions List/Create Route
**File:** `apps/web/app/api/v1/auctions/route.ts` (ny fil)
**Changes:** Opret GET og POST handlers med error handling (lignende pattern som jersey routes)
**Rationale:** Auction list og create endpoints

#### 2. Auction Detail Route
**File:** `apps/web/app/api/v1/auctions/[id]/route.ts` (ny fil)
**Changes:** Opret GET handler med error handling
**Rationale:** Auction detail endpoint

#### 3. Bids Create Route
**File:** `apps/web/app/api/v1/bids/route.ts` (ny fil)
**Changes:** Opret POST handler med bid validation og error handling
```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { createdResponse } from "@/lib/api/responses";
import { requireAuth } from "@/lib/auth";
import { BidService } from "@/lib/services/bid-service";
import { bidCreateSchema } from "@/lib/validation/auction-schemas";

const handler = async (req: NextRequest) => {
  try {
    if (req.method === "POST") {
      const { userId } = await requireAuth(req);
      const body = await req.json();
      
      const input = bidCreateSchema.parse(body);
      const service = new BidService();
      const bid = await service.placeBid(input.auctionId, input, userId);

      return createdResponse(bid);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
```
**Rationale:** Bid placement med validation og atomic transaction via RPC function

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Alle auction endpoints fungerer
- [ ] Bid validation virker (amount > currentBid)
- [ ] ID verification check virker (403 hvis ikke verified)

**⚠️ PAUSE HERE** - Manual approval before Phase 8

---

## Phase 8: API Routes - Posts

### Overview
Implementer post endpoints: GET/POST `/api/v1/posts` og GET `/api/v1/posts/[id]`.

### Changes Required:

#### 1. Posts List/Create Route
**File:** `apps/web/app/api/v1/posts/route.ts` (ny fil)
**Changes:** Opret GET og POST handlers med error handling (lignende pattern som jersey routes)
**Rationale:** Post list og create endpoints

#### 2. Post Detail Route
**File:** `apps/web/app/api/v1/posts/[id]/route.ts` (ny fil)
**Changes:** Opret GET handler med error handling
**Rationale:** Post detail endpoint

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Alle post endpoints fungerer
- [ ] Feed pagination virker

**⚠️ PAUSE HERE** - Manual approval before Phase 9

---

## Phase 9: API Routes - Profiles

### Overview
Implementer profile endpoints: GET/PATCH `/api/v1/profiles/[id]`.

### Changes Required:

#### 1. Profile Detail/Update Route
**File:** `apps/web/app/api/v1/profiles/[id]/route.ts` (ny fil)
**Changes:** Opret GET og PATCH handlers med error handling
```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { requireAuth, optionalAuth } from "@/lib/auth";
import { ProfileService } from "@/lib/services/profile-service";
import { profileUpdateSchema } from "@/lib/validation/profile-schemas";

const handler = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params;

    if (req.method === "GET") {
      const auth = await optionalAuth(req);
      const service = new ProfileService();
      const profile = await service.getProfile(id, auth?.userId);

      return successResponse(profile);
    }

    if (req.method === "PATCH") {
      const { userId } = await requireAuth(req);
      const body = await req.json();
      
      const input = profileUpdateSchema.parse(body);
      const service = new ProfileService();
      const profile = await service.updateProfile(id, input, userId);

      return successResponse(profile);
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const GET = rateLimitMiddleware(handler);
export const PATCH = rateLimitMiddleware(handler);
```
**Rationale:** Profile detail og update endpoints med error handling og username uniqueness check

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] GET `/api/v1/profiles/[id]` returnerer profil
- [ ] PATCH `/api/v1/profiles/[id]` opdaterer profil (kun owner)
- [ ] Username uniqueness check virker (409 hvis taget)

**⚠️ PAUSE HERE** - Manual approval before Phase 10

---

## Phase 10: API Routes - Auth

### Overview
Implementer auth endpoints: POST `/api/v1/auth/signup`, POST `/api/v1/auth/signin`, POST `/api/v1/auth/signout`.

**Note:** Clerk håndterer faktisk signup/signin i frontend. Disse endpoints kan være wrappers eller kan være valgfrie hvis vi bruger Clerk direkte. Vi implementerer dem som API endpoints for konsistens.

### Changes Required:

#### 1. Auth Route
**File:** `apps/web/app/api/v1/auth/route.ts` (ny fil)
**Changes:** Opret POST handlers for signup/signin/signout (optional - Clerk håndterer primært i frontend)
```typescript
import { NextRequest } from "next/server";
import { rateLimitMiddleware } from "@/lib/api/rate-limit";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";
import { auth } from "@clerk/nextjs/server";

const handler = async (req: NextRequest) => {
  try {
    // Note: Clerk håndterer faktisk auth i frontend via ClerkProvider
    // Disse endpoints kan være valgfrie eller wrappers for consistency
    // For nu returnerer vi info om auth status
    
    if (req.method === "POST") {
      const { userId } = await auth();
      
      if (!userId) {
        return Response.json(
          { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
          { status: 401 }
        );
      }

      return successResponse({ authenticated: true, userId });
    }

    return new Response(null, { status: 405 });
  } catch (error) {
    return handleApiError(error, req);
  }
};

export const POST = rateLimitMiddleware(handler);
```
**Rationale:** Auth endpoints (wrappers for consistency, primær auth håndteres af Clerk i frontend)

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Auth endpoints fungerer (eller redirecter til Clerk)

**⚠️ PAUSE HERE** - Manual approval before Phase 11

---

## Phase 11: Frontend Migration

### Overview
Opdater frontend komponenter til at bruge API endpoints i stedet for direkte Supabase calls. Opret TanStack Query hooks.

### Changes Required:

#### 1. API Client
**File:** `apps/web/lib/api/client.ts` (ny fil)
**Changes:** Opret API client helper
```typescript
import { ApiError } from "@/lib/api/errors";
import { auth } from "@clerk/nextjs/server";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    
    const response = await fetch(`/api/v1${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: { code: "UNKNOWN_ERROR", message: "API request failed" },
      }));
      
      throw new ApiClientError(
        error.error?.code || "API_ERROR",
        error.error?.message || "API request failed",
        response.status
      );
    }

    if (response.status === 204) return null as T;
    return response.json();
  } catch (error) {
    if (error instanceof ApiClientError) throw error;
    
    // Network errors or other fetch failures
    throw new ApiClientError(
      "NETWORK_ERROR",
      error instanceof Error ? error.message : "Failed to connect to API",
      0
    );
  }
}
```
**Rationale:** Centraliseret API client

#### 2. TanStack Query Hooks
**File:** `apps/web/lib/hooks/use-jerseys.ts` (ny fil)
**Changes:** Opret hooks for jerseys
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api/client";

export function useJerseys(params?: { ownerId?: string; visibility?: string }) {
  return useQuery({
    queryKey: ["jerseys", params],
    queryFn: () => apiRequest<{ items: Jersey[]; nextCursor: string | null }>(
      `/jerseys?${new URLSearchParams(params as any)}`
    ),
  });
}

export function useJersey(id: string) {
  return useQuery({
    queryKey: ["jersey", id],
    queryFn: () => apiRequest<Jersey>(`/jerseys/${id}`),
  });
}

export function useCreateJersey() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: JerseyCreateInput) =>
      apiRequest<Jersey>("/jerseys", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jerseys"] });
    },
  });
}
```
**Rationale:** Type-safe React Query hooks

#### 3. Update Marketplace Component
**File:** `apps/web/app/(dashboard)/marketplace/page.tsx`
**Changes:** Erstat direkte Supabase calls med hooks
```typescript
// Før:
const { data } = await supabase.from("sale_listings").select("*");

// Efter:
const { data } = useListings();
```
**Rationale:** Migrer til API endpoints

#### 4. Update Profile Component
**File:** `apps/web/app/(dashboard)/profile/[username]/page.tsx`
**Changes:** Erstat direkte Supabase calls med hooks
**Rationale:** Migrer til API endpoints

#### 5. Update Wardrobe Component
**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`
**Changes:** Erstat direkte Supabase calls med hooks
**Rationale:** Migrer til API endpoints

#### 6. Update Community Component
**File:** `apps/web/app/(dashboard)/community/page.tsx`
**Changes:** Erstat direkte Supabase calls med hooks
**Rationale:** Migrer til API endpoints

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`

#### Manual Verification:
- [ ] Alle komponenter bruger API endpoints
- [ ] Ingen direkte Supabase calls i frontend komponenter
- [ ] TanStack Query caching virker
- [ ] Error handling i UI virker

**⚠️ PAUSE HERE** - Manual approval before Phase 12

---

## Phase 12: Testing & Polish

### Overview
Test alle endpoints, verificer error handling, performance optimering og dokumentation.

### Changes Required:

#### 1. Endpoint Testing
**File:** Test alle endpoints med Postman/Thunder Client
**Changes:** 
- Test happy paths
- Test error scenarios (401, 403, 404, 409, 500)
- Test validation errors
- Test rate limiting
- Test pagination

#### 2. Integration Testing
**File:** Opret integration tests (valgfrit)
**Changes:** Test komplet flows (create jersey → list → update → delete)
**Rationale:** Verificer end-to-end funktionalitet

#### 3. Performance Optimization
**File:** Review queries og optimer
**Changes:**
- Tjek database indexes
- Optimér N+1 queries
- Implementér caching hvor relevant

#### 4. Documentation
**File:** `apps/web/app/api/v1/README.md` (ny fil)
**Changes:** Opret API documentation med alle endpoints
**Rationale:** Gør API let at forstå og bruge

**Minimum Documentation Requirements:**
- Liste alle endpoints med HTTP methods
- Request/response eksempler for hver endpoint
- Error codes og deres betydning
- Authentication requirements
- Pagination format
- Rate limiting information

**Example format:**
```markdown
# Huddle API v1

## Authentication
All protected endpoints require `Authorization: Bearer <clerk_token>` header.

## Endpoints

### Jerseys
- `GET /api/v1/jerseys` - List jerseys (public)
- `POST /api/v1/jerseys` - Create jersey (protected)
- `GET /api/v1/jerseys/:id` - Get jersey details
- `PATCH /api/v1/jerseys/:id` - Update jersey (protected, owner only)
- `DELETE /api/v1/jerseys/:id` - Delete jersey (protected, owner only)

[... rest of endpoints ...]

## Error Format
All errors follow: `{ error: { code, message, details? } }`
```

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npm run typecheck`
- [ ] Lint: `npm run lint`
- [ ] Build: `npm run build`
- [ ] Alle tests passerer (hvis implementeret)

#### Manual Verification:
- [ ] Alle endpoints testet og funktionelle
- [ ] Error handling virker korrekt (401, 403, 404, 409, 500)
- [ ] Performance er acceptabel (< 500ms for simple queries)
- [ ] Rate limiting virker (test med 100+ requests)
- [ ] Frontend integration virker perfekt
- [ ] Sentry captures errors korrekt (tjek Sentry dashboard)
- [ ] Health check endpoint virker
- [ ] API documentation er komplet og opdateret

---

## Testing Strategy

### Unit Tests (Valgfrit):
- Test validation schemas
- Test repository methods
- Test service business logic

### Integration Tests (Valgfrit):
- Test komplet API flows
- Test authentication flow
- Test authorization checks

### Manual Testing:
- Test alle endpoints med Postman/Thunder Client
- Test fra frontend at API calls fungerer
- Test error scenarios
- Test rate limiting
- Test pagination

---

## References

- **Linear Issues:**
  - HUD-12: Fase 4: Opret backend API routes
  - HUD-11: Fase 3.5: Migrer Auth Context til Next.js pattern

- **Documentation:**
  - `.project/05-API_Design.md` - API design spec
  - `.project/06-Backend_Guide.md` - Backend guide
  - `.cursor/rules/21-api_design.mdc` - API design patterns
  - `.cursor/rules/33-clerk_auth.mdc` - Clerk auth patterns
  - `.cursor/rules/32-supabase_patterns.mdc` - Supabase patterns

- **Related Files:**
  - `apps/web/lib/supabase/server.ts` - Supabase server client
  - `apps/web/lib/supabase/client.ts` - Supabase browser client
  - `apps/web/contexts/AuthContext.tsx` - Current auth context (skal migreres)

---

## Rollback Plan

Hvis noget går galt:

1. **Phase 1-4 (Foundation):** Kan rulles tilbage ved at fjerne nye filer
2. **Phase 5-10 (API Routes):** Kan deaktiveres ved at fjerne route handlers
3. **Phase 11 (Frontend Migration):** Kan rulles tilbage ved at gendanne direkte Supabase calls
4. **Database:** Ingen migrations i denne fase, så ingen database rollback nødvendig

---

## Estimated Timeline

- **Phase 1:** 4-6 timer (auth, errors, rate limiting)
- **Phase 2:** 2-3 timer (validation schemas)
- **Phase 3:** 4-6 timer (repositories)
- **Phase 4:** 4-6 timer (services)
- **Phase 5:** 3-4 timer (jersey endpoints)
- **Phase 6:** 2-3 timer (listing endpoints)
- **Phase 7:** 3-4 timer (auction/bid endpoints)
- **Phase 8:** 2-3 timer (post endpoints)
- **Phase 9:** 1-2 timer (profile endpoints)
- **Phase 10:** 1-2 timer (auth endpoints)
- **Phase 11:** 6-8 timer (frontend migration)
- **Phase 12:** 4-6 timer (testing & polish)

**Total:** ~36-50 timer

---

## Notes

- **Clerk Integration:** Vi migrerer fra Supabase Auth til Clerk i denne fase (HUD-11)
- **Profile Sync:** Automatisk profile oprettelse ved første API kald
- **Rate Limiting:** Start med in-memory, kan opgraderes til Redis senere. Bruger userId for authenticated users
- **Pagination:** Cursor-based fra start for bedre performance
- **Error Handling:** Konsistent format på tværs af alle endpoints. Sentry integration for unexpected errors
- **Frontend Migration:** Gradvis migration - kan testes endpoint-for-endpoint
- **Transaction Handling:** Bid placement bruger Supabase RPC function for atomic operations
- **Sentry:** Error tracking per `.cursor/rules/24-observability_sentry.mdc` - ingen PII i logs
- **Health Check:** `/api/v1/health` endpoint for monitoring
- **Documentation:** API README er obligatorisk (Phase 12)


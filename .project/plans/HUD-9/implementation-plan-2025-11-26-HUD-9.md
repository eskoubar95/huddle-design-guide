# Fase 3.3: Migrer Domain Komponenter - Implementation Plan

## Overview

Migrer domain-specifikke komponenter fra `src/components/` til `apps/web/components/`, én ad gangen. Dette er Fase 3.3 i migrationsplanen og omfatter alle business logic komponenter (ikke UI primitives).

**Hvorfor:** Efter UI komponenter (HUD-7) og Supabase client (HUD-8) er migreret, skal domain komponenter migreres for at Next.js appen kan bruge dem. Disse komponenter indeholder business logic, data fetching, og routing - alle skal opdateres til Next.js patterns.

**Mål:** Alle domain komponenter er migreret til Next.js app, fungerer identisk med eksisterende frontend, og bruger Next.js routing, Supabase SSR clients, og type imports korrekt.

---

## Linear Issue

**Issue:** [HUD-9](https://linear.app/huddle-world/issue/HUD-9/fase-33-migrer-domain-komponenter-jerseycard-sidebar-etc)  
**Status:** In Progress  
**Labels:** Migration, Frontend, Feature  
**Project:** Frontend Migration  
**Branch:** `nicklaseskou95/hud-9-fase-33-migrer-domain-komponenter-jerseycard-sidebar-etc`

---

## Current State Analysis

### Eksisterende Struktur:

```
src/components/
├── Layout komponenter:
│   ├── Sidebar.tsx              # Bruger React Router, AuthContext, Supabase
│   ├── BottomNav.tsx            # Bruger React Router, Supabase
│   └── CommandBar.tsx           # Bruger React Router, Supabase
├── Jersey komponenter:
│   ├── JerseyCard.tsx           # Bruger React Router
│   └── UploadJersey.tsx          # Bruger React Router, Supabase, RHF
├── Marketplace komponenter:
│   ├── CreateSaleListing.tsx    # Bruger Supabase, RHF
│   ├── CreateAuction.tsx        # Bruger Supabase, RHF
│   ├── PlaceBid.tsx             # Bruger Supabase
│   └── CountdownTimer.tsx       # Stateless timer
├── Community komponenter:
│   ├── CreatePost.tsx           # Bruger Supabase, RHF
│   ├── PostComments.tsx         # Bruger Supabase
│   └── home/                    # 6 filer
│       ├── ActivitySnapshot.tsx
│       ├── CommunityPreview.tsx
│       ├── HeroSpotlight.tsx
│       ├── MarketplaceForYou.tsx
│       ├── QuickActions.tsx
│       └── RightSidebar.tsx
├── Profile komponenter:
│   ├── EditProfile.tsx          # Bruger Supabase, RHF
│   ├── NavLink.tsx              # React Router NavLink wrapper
│   └── SidebarNavLink.tsx        # React Router Link
└── Utility komponenter:
    └── ProtectedRoute.tsx        # React Router, AuthContext
```

### Next.js App State:

```
apps/web/
├── components/
│   └── ui/                      # ✅ Migreret (HUD-7)
├── lib/
│   ├── utils.ts                 # ✅ Eksisterer
│   └── supabase/
│       ├── client.ts             # ✅ Migreret (HUD-8)
│       ├── server.ts            # ✅ Migreret (HUD-8)
│       └── types.ts             # ✅ Migreret (HUD-8)
├── hooks/
│   └── use-mobile.tsx           # ✅ Eksisterer
└── app/                         # Next.js App Router
```

### Key Discoveries:

1. **Routing Changes Required:**
   - `useNavigate()` → `useRouter().push()` fra `next/navigation`
   - `useLocation()` → `usePathname()` fra `next/navigation`
   - `Link` fra `react-router-dom` → `Link` fra `next/link`
   - `NavLink` fra `react-router-dom` → Custom component med `usePathname()`

2. **Supabase Client Changes:**
   - `import { supabase } from "@/integrations/supabase/client"` → `import { createClient } from "@/lib/supabase/client"` (Client Components)
   - `supabase` (singleton) → `createClient()` (function call per component)
   - Server Components skal bruge `@/lib/supabase/server` (async)

3. **AuthContext:**
   - Komponenter bruger `useAuth()` fra `@/contexts/AuthContext`
   - **AuthContext eksisterer IKKE i Next.js app endnu**
   - **Løsning:** Migrer AuthContext først ELLER brug Supabase auth direkte i komponenter
   - **Anbefaling:** Migrer AuthContext i Phase 0 (foundation)

4. **Types:**
   - Types er i `packages/types/index.ts`
   - Import: `import type { Jersey, Post } from "@huddle/types"`

5. **React Hook Form:**
   - Komponenter bruger RHF - allerede installeret i Next.js app
   - Ingen ændringer nødvendig (bortset fra imports hvis nødvendigt)

6. **Component Dependencies:**
   - Alle komponenter bruger UI komponenter fra `@/components/ui/*` (✅ klar)
   - Alle komponenter bruger `cn()` fra `@/lib/utils` (✅ klar)
   - Supabase clients er klar (✅ HUD-8)

### Component Count:

- **Layout:** 3 komponenter
- **Jersey:** 2 komponenter
- **Marketplace:** 4 komponenter
- **Community:** 8 komponenter (2 + 6 i home/)
- **Profile:** 3 komponenter
- **Utility:** 1 komponent

**Total: 21 komponenter**

### Constraints:

- **KRITISK:** Eksisterende frontend skal fortsat kunne køre på `localhost:8080`
- Komponenter skal fungere identisk i Next.js app som i legacy app
- Routing skal opdateres til Next.js App Router patterns
- Supabase integration skal bruge SSR-compatible clients
- AuthContext skal migreres eller komponenter skal opdateres til Supabase auth direkte

---

## Desired End State

### Målstruktur:

```
apps/web/
├── components/
│   ├── ui/                      # ✅ UI komponenter (HUD-7)
│   ├── layout/                  # 🆕 Layout komponenter
│   │   ├── Sidebar.tsx
│   │   ├── BottomNav.tsx
│   │   └── CommandBar.tsx
│   ├── jersey/                  # 🆕 Jersey komponenter
│   │   ├── JerseyCard.tsx
│   │   └── UploadJersey.tsx
│   ├── marketplace/             # 🆕 Marketplace komponenter
│   │   ├── CreateSaleListing.tsx
│   │   ├── CreateAuction.tsx
│   │   ├── PlaceBid.tsx
│   │   └── CountdownTimer.tsx
│   ├── community/               # 🆕 Community komponenter
│   │   ├── CreatePost.tsx
│   │   ├── PostComments.tsx
│   │   └── home/
│   │       ├── ActivitySnapshot.tsx
│   │       ├── CommunityPreview.tsx
│   │       ├── HeroSpotlight.tsx
│   │       ├── MarketplaceForYou.tsx
│   │       ├── QuickActions.tsx
│   │       └── RightSidebar.tsx
│   ├── profile/                 # 🆕 Profile komponenter
│   │   ├── EditProfile.tsx
│   │   ├── NavLink.tsx
│   │   └── SidebarNavLink.tsx
│   └── ProtectedRoute.tsx      # 🆕 Utility komponent
├── contexts/                    # 🆕 Auth context
│   └── AuthContext.tsx
└── lib/
    └── supabase/                # ✅ Supabase clients (HUD-8)
```

### Verification Criteria:

- ✅ Alle 21 domain komponenter er migreret til Next.js app
- ✅ Routing er opdateret til Next.js patterns (useRouter, usePathname, next/link)
- ✅ Supabase integration bruger SSR-compatible clients
- ✅ Types er korrekt importeret fra `@huddle/types`
- ✅ AuthContext er migreret eller komponenter bruger Supabase auth direkte
- ✅ Komponenter fungerer identisk med eksisterende frontend
- ✅ Ingen console errors eller warnings i Next.js app
- ✅ Eksisterende frontend kører stadig uden problemer

---

## What We're NOT Doing

- ❌ **Ingen page migration** - det er senere fase
- ❌ **Ingen API route oprettelse** - det er Fase 4
- ❌ **Ingen Clerk integration** - det er senere fase
- ❌ **Ingen modificeringer af legacy komponenter** - legacy app forbliver uændret
- ❌ **Ingen database schema ændringer** - kun frontend migration
- ❌ **Ingen test suite oprettelse** - manual testing per komponent

---

## Implementation Approach

**Strategi:** Gradvist, inkrementelt migration med pause points efter hver phase. Hver phase kan testes isoleret.

**Phase Sequence:**
1. **Phase 0:** Migrer AuthContext (foundation for mange komponenter)
2. **Phase 1:** Migrer Layout komponenter (Sidebar, BottomNav, CommandBar)
3. **Phase 2:** Migrer Jersey komponenter (JerseyCard, UploadJersey)
4. **Phase 3:** Migrer Marketplace komponenter (CreateSaleListing, CreateAuction, PlaceBid, CountdownTimer)
5. **Phase 4:** Migrer Community komponenter (CreatePost, PostComments, home/*)
6. **Phase 5:** Migrer Profile komponenter (EditProfile, NavLink, SidebarNavLink)
7. **Phase 6:** Migrer Utility komponenter (ProtectedRoute)

**Key Decisions:**
1. **AuthContext først:** Mange komponenter afhænger af `useAuth()` - migrer foundation først
2. **Layout først:** Sidebar, BottomNav, CommandBar er fundamentale UI komponenter
3. **Grupper logisk:** Jersey → Marketplace → Community → Profile → Utility
4. **Én ad gangen:** Test hver komponent grundigt før næste
5. **Routing patterns:** Konsistent brug af Next.js routing i alle komponenter

---

## Error Handling Strategy

**Princip:** Alle komponenter skal håndtere errors gracefully med user-friendly messages og proper cleanup.

### General Error Handling Patterns:

#### 1. Supabase Query Errors
```typescript
try {
  const { data, error } = await supabase.from("table").select("*");
  
  if (error) {
    console.error("Supabase error:", error);
    toast({
      title: "Error",
      description: error.message || "Something went wrong. Please try again.",
      variant: "destructive",
    });
    return;
  }
  
  // Use data...
} catch (error) {
  console.error("Unexpected error:", error);
  toast({
    title: "Error",
    description: "An unexpected error occurred. Please try again.",
    variant: "destructive",
  });
}
```

#### 2. Form Validation Errors
```typescript
try {
  const validated = schema.parse(formData);
  // Submit...
} catch (error) {
  if (error instanceof z.ZodError) {
    const firstError = error.issues[0];
    toast({
      title: "Validation Error",
      description: firstError.message,
      variant: "destructive",
    });
  }
}
```

#### 3. Network/Upload Errors
```typescript
try {
  const { error: uploadError } = await supabase.storage
    .from("bucket")
    .upload(path, file);
  
  if (uploadError) {
    throw uploadError;
  }
} catch (error) {
  console.error("Upload error:", error);
  toast({
    title: "Upload Failed",
    description: "Failed to upload file. Please check your connection and try again.",
    variant: "destructive",
  });
}
```

#### 4. Realtime Subscription Cleanup
```typescript
useEffect(() => {
  const channel = supabase.channel("channel-name")
    .on("postgres_changes", { ... }, callback)
    .subscribe();
  
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### Error Handling per Phase:

- **Phase 0 (AuthContext):** Handle auth state errors, session refresh failures
- **Phase 1 (Layout):** Handle Supabase query errors, realtime subscription failures
- **Phase 2 (Jersey):** Handle upload errors, validation errors, query errors
- **Phase 3 (Marketplace):** Handle form validation, bid placement errors, auction errors
- **Phase 4 (Community):** Handle post creation errors, comment errors, realtime errors
- **Phase 5 (Profile):** Handle profile update errors, avatar upload errors
- **Phase 6 (ProtectedRoute):** Handle auth check errors, redirect errors

---

## Input Validation Strategy

**Princip:** Alle forms skal bruge Zod schemas per `.cursor/rules/12-forms_actions_validation.mdc`.

### Existing Schemas (from `src/components/`):

#### 1. Jersey Upload Schema
**Location:** `src/components/UploadJersey.tsx`
```typescript
const jerseySchema = z.object({
  club: z.string().trim().min(1, "Club name is required").max(100),
  season: z.string().trim().min(1, "Season is required").max(20),
  jerseyType: z.string().min(1, "Jersey type is required"),
  playerName: z.string().trim().max(50).optional(),
  playerNumber: z.string().trim().max(3).optional(),
  competitionBadges: z.array(z.string()).optional(),
  conditionRating: z.number().min(1).max(10),
  notes: z.string().trim().max(1000).optional(),
  visibility: z.enum(["public", "private"]),
});
```

#### 2. Profile Schema
**Location:** `src/components/EditProfile.tsx`
```typescript
const profileSchema = z.object({
  username: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(500).optional(),
  country: z.string().optional(),
});
```

### Validation Migration Strategy:

**Option 1: Kopier schemas direkte**
- Kopier Zod schemas fra `src/components/` til migrerede komponenter
- **Pros:** Hurtigt, ingen ekstra filer
- **Cons:** Duplikation, svært at vedligeholde

**Option 2: Opret shared validation schemas (Anbefalet)**
- Opret `apps/web/lib/validation/` directory
- Opret `jerseySchemas.ts`, `listingSchemas.ts`, `profileSchemas.ts`
- Migrer schemas til shared location
- Import i komponenter: `import { jerseySchema } from "@/lib/validation/jerseySchemas"`

**Anbefaling:** Brug Option 2 for bedre maintainability, men start med Option 1 for hurtig migration, refactor senere.

### Required Schemas:

1. **Jersey Upload** (`jerseySchemas.ts`)
   - `jerseySchema` - for UploadJersey

2. **Sale Listing** (`listingSchemas.ts`)
   - `saleListingSchema` - for CreateSaleListing
   - Fields: `jerseyId`, `price` (> 0), `currency`, `negotiable`, shipping flags

3. **Auction** (`listingSchemas.ts`)
   - `auctionSchema` - for CreateAuction
   - Fields: `jerseyId`, `startingBid`, `durationHours` (24|48|72|168), shipping flags

4. **Bid** (`listingSchemas.ts`)
   - `bidSchema` - for PlaceBid
   - Fields: `amount` (> currentBid + min step)

5. **Post** (`postSchemas.ts`)
   - `postSchema` - for CreatePost
   - Fields: `content` (required, max length), `jerseyId` (optional)

6. **Profile** (`profileSchemas.ts`)
   - `profileSchema` - for EditProfile
   - Fields: `username`, `bio`, `country`

### Form Validation Pattern:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jerseySchema } from "@/lib/validation/jerseySchemas";

const form = useForm({
  resolver: zodResolver(jerseySchema),
  defaultValues: { ... },
});

const onSubmit = async (data: z.infer<typeof jerseySchema>) => {
  try {
    const validated = jerseySchema.parse(data);
    // Submit...
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
    }
  }
};
```

---

## Performance Considerations

**Princip:** Komponenter skal være performante og følge Next.js best practices.

### Performance Targets:

- **Page Load Time:** < 2 seconds (per PRD)
- **Time to Interactive:** < 3 seconds
- **Bundle Size:** Minimize client bundle, use dynamic imports where appropriate
- **Realtime Subscriptions:** Cleanup properly to avoid memory leaks

### Optimization Strategies:

#### 1. Code Splitting
- Use dynamic imports for heavy components:
```typescript
const UploadJersey = dynamic(() => import("@/components/jersey/UploadJersey"), {
  ssr: false, // If component requires client-only features
});
```

#### 2. Supabase Query Optimization
- Use `.select()` with specific fields instead of `*`
- Add `.limit()` for lists
- Use indexes (already defined in migrations)
- Batch related queries to avoid N+1

#### 3. Realtime Subscription Management
- Always cleanup subscriptions in `useEffect` return
- Limit number of active subscriptions
- Use single subscription with filters instead of multiple

#### 4. Image Optimization
- Use Next.js `Image` component for jersey images (future optimization)
- Compress images before upload
- Use appropriate image sizes

#### 5. Form Performance
- Debounce search inputs (CommandBar)
- Disable submit button during submission
- Show loading states

### Performance Checklist per Phase:

- **Phase 0:** AuthContext - Minimal impact, single subscription
- **Phase 1:** Layout - Verify no unnecessary re-renders, cleanup subscriptions
- **Phase 2:** Jersey - Optimize image handling, query optimization
- **Phase 3:** Marketplace - Form debouncing, query optimization
- **Phase 4:** Community - Realtime subscription cleanup, query batching
- **Phase 5:** Profile - Form optimization, image upload handling
- **Phase 6:** ProtectedRoute - Minimal impact

---

## Accessibility Checklist

**Princip:** Alle komponenter skal være accessible per WCAG 2.1 AA standards.

### General Accessibility Requirements:

#### 1. Keyboard Navigation
- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Escape key closes modals/dialogs
- [ ] Enter/Space activates buttons

#### 2. Screen Reader Support
- [ ] Semantic HTML elements used (`<nav>`, `<main>`, `<button>`, etc.)
- [ ] ARIA labels for icon-only buttons
- [ ] ARIA live regions for dynamic content
- [ ] Form labels associated with inputs
- [ ] Error messages announced

#### 3. Visual Accessibility
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] Focus states are visible
- [ ] No color-only indicators (use icons/text too)
- [ ] Text is resizable (up to 200%)

#### 4. Form Accessibility
- [ ] All inputs have labels
- [ ] Error messages are associated with inputs
- [ ] Required fields are marked
- [ ] Form validation errors are announced

### Accessibility Checklist per Component:

#### Layout Components:
- **Sidebar:** Keyboard navigation, ARIA labels for nav items, focus management
- **BottomNav:** Keyboard navigation, ARIA labels, active state announced
- **CommandBar:** Search input labeled, results keyboard navigable, ARIA live region

#### Jersey Components:
- **JerseyCard:** Keyboard accessible, image alt text, button labels
- **UploadJersey:** Form labels, error announcements, progress indicators

#### Marketplace Components:
- **CreateSaleListing:** Form accessibility, error handling
- **CreateAuction:** Form accessibility, error handling
- **PlaceBid:** Form accessibility, amount input labeled
- **CountdownTimer:** ARIA live region for countdown

#### Community Components:
- **CreatePost:** Form accessibility, content area labeled
- **PostComments:** Keyboard navigation, comment form accessible
- **home/*:** Keyboard navigation, ARIA labels

#### Profile Components:
- **EditProfile:** Form accessibility, image upload accessible
- **NavLink:** Keyboard accessible, active state announced
- **SidebarNavLink:** Keyboard accessible, badge announced

#### Utility Components:
- **ProtectedRoute:** Loading state announced, redirect announced

---

## Sentry Integration Notes

**Princip:** Errors skal captures med Sentry per `.cursor/rules/24-observability_sentry.mdc`, men ingen PII.

### Sentry Error Capture:

#### 1. Supabase Errors
```typescript
import * as Sentry from "@sentry/nextjs";

try {
  const { error } = await supabase.from("table").select("*");
  if (error) {
    Sentry.captureException(error, {
      tags: { component: "ComponentName", operation: "query" },
      extra: { table: "table_name" }, // No PII
    });
    // Show user-friendly error
  }
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: "ComponentName" },
  });
}
```

#### 2. Form Validation Errors
- **Don't capture:** Zod validation errors (expected user errors)
- **Do capture:** Unexpected form submission errors

#### 3. Upload Errors
```typescript
try {
  // Upload...
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: "UploadJersey", operation: "upload" },
    extra: { fileSize: file.size, fileType: file.type }, // No PII
  });
}
```

### Sentry Context:

- **User ID:** Include in context (not PII)
- **Component:** Tag with component name
- **Operation:** Tag with operation type
- **No PII:** Never log emails, names, addresses, etc.

### Sentry Setup:

**Note:** Sentry integration skal verificeres i root layout eller error boundary. For nu, antager vi Sentry er konfigureret. Hvis ikke, skal errors stadig håndteres gracefully, men ikke nødvendigvis sendt til Sentry i denne fase.

---

## Edge Case Handling

**Princip:** Alle edge cases skal håndteres gracefully med proper UI feedback.

### Edge Cases per Category:

#### 1. Authentication Edge Cases

**Missing Auth:**
- ProtectedRoute redirects to /auth
- Show loading state during auth check
- Handle auth state changes gracefully

**Session Expired:**
- AuthContext detects expired session
- Show message: "Your session has expired. Please sign in again."
- Redirect to /auth

**Auth Errors:**
- Handle network errors during sign in/out
- Show retry option
- Don't crash app

#### 2. Data Fetching Edge Cases

**Empty States:**
- Show empty state UI for lists (no jerseys, no posts, etc.)
- Provide action to create first item
- Example: "No jerseys yet. Upload your first jersey!"

**Loading States:**
- Show skeleton loaders or spinners
- Don't show blank screens
- Provide cancel option for long operations

**Network Failures:**
- Show retry button
- Message: "Failed to load. Please check your connection and try again."
- Don't crash component

**Large Data Sets:**
- Use pagination or virtual scrolling
- Limit initial query results
- Load more on scroll/click

#### 3. Form Edge Cases

**Validation Errors:**
- Show inline errors
- Focus first error field
- Announce errors to screen readers

**Submission Failures:**
- Show error message
- Keep form data (don't clear)
- Allow retry
- Disable submit during submission

**File Upload Edge Cases:**
- File too large: Show error, suggest compression
- Invalid file type: Show error with allowed types
- Upload timeout: Show retry option
- Network interruption: Resume or retry

#### 4. Realtime Edge Cases

**Subscription Failures:**
- Handle connection errors gracefully
- Show connection status
- Retry subscription
- Cleanup on unmount

**Race Conditions:**
- Use optimistic updates carefully
- Handle out-of-order updates
- Verify server state after mutations

#### 5. Routing Edge Cases

**Invalid Routes:**
- Next.js handles 404 automatically
- Show helpful message: "Page not found"

**Navigation During Load:**
- Cancel in-flight requests
- Cleanup subscriptions
- Prevent memory leaks

#### 6. Component-Specific Edge Cases

**JerseyCard:**
- Missing image: Show placeholder
- Invalid jersey data: Show error state

**UploadJersey:**
- No images selected: Disable submit
- Image upload fails: Show error, allow retry
- Validation fails: Show specific errors

**CreateSaleListing/CreateAuction:**
- Jersey already listed: Show error
- Invalid price: Show validation error
- Auction already ended: Show error

**PlaceBid:**
- Bid too low: Show validation error
- Auction ended: Show error
- Outbid during submission: Show error, refresh

**PostComments:**
- Empty comments: Show empty state
- Comment submission fails: Show error, allow retry
- Realtime update fails: Fallback to manual refresh

---

## ProtectedRoute Middleware Evaluation

**Current Approach:** Component-based ProtectedRoute (migrated from React Router)

**Alternative:** Next.js Middleware

### Component Approach (Current):

**Pros:**
- ✅ Consistent with legacy app
- ✅ Easy to migrate
- ✅ Flexible (can show loading states)
- ✅ Works with AuthContext

**Cons:**
- ❌ Client-side only (requires client component)
- ❌ Less performant (runs after page load)
- ❌ Can flash content before redirect

### Middleware Approach (Alternative):

**Pros:**
- ✅ Server-side (runs before page load)
- ✅ More performant (no flash)
- ✅ Better SEO (proper redirects)
- ✅ Follows Next.js best practices

**Cons:**
- ❌ Requires server-side auth check
- ❌ More complex setup
- ❌ Different from legacy app

### Recommendation:

**For Migration (Phase 6):** Use component approach for consistency and easier migration.

**Future Optimization:** Consider migrating to middleware after all components are migrated. Middleware would:
1. Check auth server-side using Supabase server client
2. Redirect before page renders
3. Better performance and UX

### Middleware Implementation (Future):

```typescript
// apps/web/middleware.ts (future)
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const isProtectedRoute = request.nextUrl.pathname.startsWith("/profile") ||
    request.nextUrl.pathname.startsWith("/wardrobe") ||
    // ... other protected routes
    
  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/wardrobe/:path*", /* ... */],
};
```

**Note:** This is for future reference. Phase 6 uses component approach.

---

## Phase 0: Migrer AuthContext (Foundation)

### Overview

Migrer AuthContext fra `src/contexts/AuthContext.tsx` til `apps/web/contexts/AuthContext.tsx`. Dette er kritisk foundation da mange komponenter afhænger af `useAuth()` hook.

**Hvorfor først:** Sidebar, ProtectedRoute, og flere komponenter bruger `useAuth()`. Uden AuthContext vil migration af disse komponenter fejle.

### Changes Required:

#### 1. Opret contexts directory

**File:** `apps/web/contexts/` (ny directory)

**Changes:** Opret directory struktur

**Rationale:** Contexts skal ligge i `apps/web/contexts/` for at matche Next.js path alias `@/contexts/...`

#### 2. Migrer AuthContext

**File:** `apps/web/contexts/AuthContext.tsx` (ny fil)

**Changes:** Migrer AuthContext med Supabase SSR client

**Rationale:** AuthContext skal bruge Next.js Supabase client i stedet for Vite client.

**Original (src/contexts/AuthContext.tsx):**
```typescript
import { supabase } from "@/integrations/supabase/client";
```

**Migreret (apps/web/contexts/AuthContext.tsx):**
```typescript
'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
```

**Key Changes:**
- Tilføj `'use client'` directive (Client Component)
- `import { supabase }` → `import { createClient }` og kald `createClient()` i stedet for singleton
- Kald `createClient()` i `useEffect` og `signOut` (ikke global singleton)

#### 3. Integrer AuthProvider i Root Layout

**File:** `apps/web/app/layout.tsx`

**Changes:** Wrap children med AuthProvider

**Rationale:** AuthProvider skal være tilgængelig i hele appen.

```typescript
import { AuthProvider } from "@/contexts/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Error Handling:

- [ ] Auth state listener errors håndteres gracefully
- [ ] Session refresh failures viser user-friendly error
- [ ] Sign out errors håndteres (network failures)
- [ ] No console errors ved auth operations

### Success Criteria:

#### Automated Verification:
- [ ] `apps/web/contexts/AuthContext.tsx` eksisterer
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors)
- [ ] Lint: `cd apps/web && npm run lint` (ingen errors)

#### Manual Verification:
- [ ] AuthProvider er integreret i layout (`apps/web/app/layout.tsx`)
- [ ] `useAuth()` hook kan importeres: `import { useAuth } from "@/contexts/AuthContext"`
- [ ] Type safety: IntelliSense viser korrekte types (User, Session, loading, signOut)
- [ ] Auth state updates korrekt ved sign in/out
- [ ] Loading state vises korrekt under auth check
- [ ] Session persists across page refreshes
- [ ] No console errors eller warnings
- [ ] Error handling: Network errors viser user-friendly message

**⚠️ PAUSE HERE** - Verificer AuthContext før Phase 1

---

## Phase 1: Migrer Layout Komponenter

### Overview

Migrer layout komponenter (Sidebar, BottomNav, CommandBar) til Next.js app. Disse er fundamentale UI komponenter der bruges i hele appen.

### Changes Required:

#### 1. Migrer Sidebar

**File:** `apps/web/components/layout/Sidebar.tsx` (ny fil)

**Changes:** Migrer Sidebar med Next.js routing og Supabase client

**Key Changes:**
- `useNavigate()` → `useRouter().push()` fra `next/navigation`
- `import { supabase }` → `import { createClient }` og kald `createClient()`
- `import { useAuth }` → Bruger migreret AuthContext
- `import { SidebarNavLink }` → Bruger migreret SidebarNavLink (Phase 5)

**Routing Changes:**
```typescript
// Before (React Router)
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
navigate("/auth");

// After (Next.js)
import { useRouter } from "next/navigation";
const router = useRouter();
router.push("/auth");
```

**Supabase Changes:**
```typescript
// Before
import { supabase } from "@/integrations/supabase/client";
const channel = supabase.channel(...);

// After
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const channel = supabase.channel(...);
```

**Note:** SidebarNavLink migreres i Phase 5, så denne komponent kan ikke testes før da. Men strukturen kan oprettes.

#### 2. Migrer BottomNav

**File:** `apps/web/components/layout/BottomNav.tsx` (ny fil)

**Changes:** Migrer BottomNav med Next.js routing og Supabase client

**Key Changes:**
- `useLocation()` → `usePathname()` fra `next/navigation`
- `Link` fra `react-router-dom` → `Link` fra `next/link`
- `useNavigate()` → `useRouter().push()`
- `import { supabase }` → `import { createClient }` og kald `createClient()`

**Routing Changes:**
```typescript
// Before
import { useLocation, Link, useNavigate } from "react-router-dom";
const location = useLocation();
const isActive = location.pathname === to;
<Link to="/profile">Profile</Link>

// After
import { usePathname } from "next/navigation";
import Link from "next/link";
const pathname = usePathname();
const isActive = pathname === to;
<Link href="/profile">Profile</Link>
```

#### 3. Migrer CommandBar

**File:** `apps/web/components/layout/CommandBar.tsx` (ny fil)

**Changes:** Migrer CommandBar med Next.js routing og Supabase client

**Key Changes:**
- `useNavigate()` → `useRouter().push()`
- `import { supabase }` → `import { createClient }` og kald `createClient()`

### Error Handling:

- [ ] Supabase query errors håndteres (Sidebar unread count, BottomNav messages, CommandBar search)
- [ ] Realtime subscription errors håndteres gracefully
- [ ] Network failures viser user-friendly messages
- [ ] Subscription cleanup fungerer (no memory leaks)

### Performance:

- [ ] Realtime subscriptions cleanup korrekt i useEffect return
- [ ] No unnecessary re-renders
- [ ] Query optimization: Specific fields selected, limits applied

### Accessibility:

- [ ] Sidebar: Keyboard navigation fungerer, ARIA labels for nav items
- [ ] BottomNav: Keyboard navigation, active state announced
- [ ] CommandBar: Search input labeled, results keyboard navigable

### Success Criteria:

#### Automated Verification:
- [ ] Alle 3 layout komponenter eksisterer i `apps/web/components/layout/`
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors)
- [ ] Lint: `cd apps/web && npm run lint` (ingen errors)

#### Manual Verification:
- [ ] Sidebar kan importeres: `import { Sidebar } from "@/components/layout/Sidebar"`
- [ ] BottomNav kan importeres: `import { BottomNav } from "@/components/layout/BottomNav"`
- [ ] CommandBar kan importeres: `import { CommandBar } from "@/components/layout/CommandBar"`
- [ ] **Routing test:**
  - [ ] Click navigation link i Sidebar → URL ændres, page loader
  - [ ] Click navigation link i BottomNav → URL ændres, page loader
  - [ ] Active state opdateres korrekt (highlighted link)
  - [ ] Navigation fungerer på mobile og desktop
- [ ] **Supabase queries test:**
  - [ ] Sidebar: Unread message count vises korrekt
  - [ ] BottomNav: Message count vises korrekt
  - [ ] CommandBar: Search queries fungerer
  - [ ] Realtime updates fungerer (test ved at sende message)
- [ ] **Error handling test:**
  - [ ] Disconnect network → Error message vises
  - [ ] Reconnect → Data refreshes korrekt
- [ ] **Performance test:**
  - [ ] No memory leaks (check React DevTools)
  - [ ] Subscriptions cleanup korrekt ved unmount
- [ ] **Accessibility test:**
  - [ ] Tab navigation fungerer
  - [ ] Focus states er synlige
  - [ ] Screen reader announces active nav item

**⚠️ PAUSE HERE** - Verificer layout komponenter før Phase 2

---

## Phase 2: Migrer Jersey Komponenter

### Overview

Migrer Jersey komponenter (JerseyCard, UploadJersey) til Next.js app. Disse er core domain komponenter.

### Changes Required:

#### 1. Migrer JerseyCard

**File:** `apps/web/components/jersey/JerseyCard.tsx` (ny fil)

**Changes:** Migrer JerseyCard med Next.js routing

**Key Changes:**
- `useNavigate()` → `useRouter().push()`
- `import type { Jersey }` → `import type { Jersey } from "@huddle/types"` (hvis types bruges)

**Routing Changes:**
```typescript
// Before
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
onClick={() => navigate(`/jersey/${id}`)}

// After
import { useRouter } from "next/navigation";
const router = useRouter();
onClick={() => router.push(`/jersey/${id}`)}
```

#### 2. Migrer UploadJersey

**File:** `apps/web/components/jersey/UploadJersey.tsx` (ny fil)

**Changes:** Migrer UploadJersey med Next.js routing, Supabase client, og Zod validation

**Key Changes:**
- `useNavigate()` → `useRouter().push()`
- `import { supabase }` → `import { createClient }` og kald `createClient()`
- React Hook Form imports skal verificeres (burde være kompatible)
- **Kopier Zod schema:** `jerseySchema` fra `src/components/UploadJersey.tsx` (eller opret shared schema)

**Supabase Changes:**
```typescript
// Before
import { supabase } from "@/integrations/supabase/client";
const { data: { user } } = await supabase.auth.getUser();
const { error: uploadError } = await supabase.storage.from("jersey_images").upload(...);

// After
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
const { error: uploadError } = await supabase.storage.from("jersey_images").upload(...);
```

**Validation:**
- Kopier `jerseySchema` fra `src/components/UploadJersey.tsx` (lines 50-60)
- Brug `zodResolver(jerseySchema)` med React Hook Form
- Håndter Zod validation errors med user-friendly messages

**Error Handling:**
- Upload errors: Show retry option, don't clear form
- Validation errors: Show inline errors, focus first error
- Network errors: Show error message, allow retry
- File errors: Show specific error (too large, invalid type)

### Error Handling:

- [ ] Upload errors håndteres (file too large, network failure, invalid type)
- [ ] Validation errors vises inline med specific messages
- [ ] Form data bevares ved fejl (ikke clear form)
- [ ] Retry funktion fungerer

### Input Validation:

- [ ] Zod schema kopieret fra `src/components/UploadJersey.tsx`
- [ ] React Hook Form bruger `zodResolver(jerseySchema)`
- [ ] Validation errors vises korrekt
- [ ] Required fields er markeret

### Performance:

- [ ] Image compression før upload (hvis muligt)
- [ ] Upload progress vises
- [ ] Submit button disabled under submission

### Accessibility:

- [ ] Form labels er tilknyttet inputs
- [ ] Error messages er annonceret til screen readers
- [ ] File upload er keyboard accessible
- [ ] Required fields er markeret

### Success Criteria:

#### Automated Verification:
- [ ] Begge Jersey komponenter eksisterer i `apps/web/components/jersey/`
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors)

#### Manual Verification:
- [ ] JerseyCard kan importeres: `import { JerseyCard } from "@/components/jersey/JerseyCard"`
- [ ] UploadJersey kan importeres: `import { UploadJersey } from "@/components/jersey/UploadJersey"`
- [ ] **JerseyCard test:**
  - [ ] Click på card → Navigerer til `/jersey/[id]`
  - [ ] Hover states fungerer
  - [ ] Keyboard navigation fungerer (Enter aktiverer navigation)
  - [ ] Missing image viser placeholder
- [ ] **UploadJersey test:**
  - [ ] Form kan åbnes og lukkes
  - [ ] Image upload fungerer (select, preview, remove)
  - [ ] Validation: Submit uden data → Errors vises
  - [ ] Validation: Submit med invalid data → Specific errors vises
  - [ ] Submit med valid data → Upload succeeds, success message vises
  - [ ] Error handling: Network failure → Error message, retry fungerer
  - [ ] Error handling: File too large → Error message med suggestion
  - [ ] Form data bevares ved fejl
- [ ] **Accessibility test:**
  - [ ] Form labels er tilknyttet
  - [ ] Error messages annonceres
  - [ ] Keyboard navigation fungerer
  - [ ] Focus states er synlige

**⚠️ PAUSE HERE** - Verificer Jersey komponenter før Phase 3

---

## Phase 3: Migrer Marketplace Komponenter

### Overview

Migrer Marketplace komponenter (CreateSaleListing, CreateAuction, PlaceBid, CountdownTimer) til Next.js app.

### Changes Required:

#### 1. Migrer CreateSaleListing

**File:** `apps/web/components/marketplace/CreateSaleListing.tsx` (ny fil)

**Changes:** Migrer med Supabase client og Zod validation

**Key Changes:**
- `import { supabase }` → `import { createClient }` og kald `createClient()`
- **Opret Zod schema:** `saleListingSchema` per `.cursor/rules/12-forms_actions_validation.mdc`
  - Fields: `jerseyId`, `price` (> 0), `currency`, `negotiable`, shipping flags

**Validation Schema:**
```typescript
const saleListingSchema = z.object({
  jerseyId: z.string().uuid(),
  price: z.number().positive("Price must be greater than 0"),
  currency: z.enum(["EUR", "DKK", "USD"]),
  negotiable: z.boolean(),
  shippingWorldwide: z.boolean(),
  shippingLocalOnly: z.boolean(),
  shippingCostBuyer: z.boolean(),
  // ... other shipping flags
});
```

#### 2. Migrer CreateAuction

**File:** `apps/web/components/marketplace/CreateAuction.tsx` (ny fil)

**Changes:** Migrer med Supabase client og Zod validation

**Key Changes:**
- `import { supabase }` → `import { createClient }` og kald `createClient()`
- **Opret Zod schema:** `auctionSchema` per `.cursor/rules/12-forms_actions_validation.mdc`
  - Fields: `jerseyId`, `startingBid`, `durationHours` (24|48|72|168), shipping flags

**Validation Schema:**
```typescript
const auctionSchema = z.object({
  jerseyId: z.string().uuid(),
  startingBid: z.number().positive("Starting bid must be greater than 0"),
  buyNowPrice: z.number().positive().optional(),
  durationHours: z.enum([24, 48, 72, 168]),
  currency: z.enum(["EUR", "DKK", "USD"]),
  // ... shipping flags
});
```

#### 3. Migrer PlaceBid

**File:** `apps/web/components/marketplace/PlaceBid.tsx` (ny fil)

**Changes:** Migrer med Supabase client og Zod validation

**Key Changes:**
- `import { supabase }` → `import { createClient }` og kald `createClient()`
- **Opret Zod schema:** `bidSchema` per `.cursor/rules/12-forms_actions_validation.mdc`
  - Fields: `amount` (> currentBid + min step)

**Validation Schema:**
```typescript
const bidSchema = z.object({
  amount: z.number().refine(
    (val) => val > currentBid + minStep,
    "Bid must be higher than current bid"
  ),
});
```

### Error Handling:

- [ ] Form validation errors vises inline
- [ ] Supabase errors håndteres (jersey already listed, auction ended, etc.)
- [ ] Network errors viser retry option
- [ ] Form data bevares ved fejl

### Input Validation:

- [ ] Zod schemas oprettet for alle forms
- [ ] React Hook Form bruger zodResolver
- [ ] Validation errors vises korrekt
- [ ] Business logic validation (bid > currentBid, etc.)

### Performance:

- [ ] Form debouncing (hvis search/autocomplete)
- [ ] Submit button disabled under submission
- [ ] Loading states vises

### Accessibility:

- [ ] Form labels tilknyttet
- [ ] Error messages annonceres
- [ ] Required fields markeret
- [ ] Keyboard navigation fungerer

#### 4. Migrer CountdownTimer

**File:** `apps/web/components/marketplace/CountdownTimer.tsx` (ny fil)

**Changes:** Kopier direkte (stateless komponent)

**Rationale:** CountdownTimer er stateless og kræver ingen ændringer.

### Success Criteria:

#### Automated Verification:
- [ ] Alle 4 Marketplace komponenter eksisterer i `apps/web/components/marketplace/`
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors)

#### Manual Verification:
- [ ] Alle 4 komponenter kan importeres korrekt
- [ ] **CreateSaleListing test:**
  - [ ] Form kan åbnes og lukkes
  - [ ] Validation: Submit uden data → Errors vises
  - [ ] Validation: Invalid price → Error vises
  - [ ] Submit med valid data → Listing created, success message
  - [ ] Error: Jersey already listed → Error message vises
  - [ ] Form data bevares ved fejl
- [ ] **CreateAuction test:**
  - [ ] Form kan åbnes og lukkes
  - [ ] Validation: Invalid duration → Error vises
  - [ ] Validation: Starting bid <= 0 → Error vises
  - [ ] Submit med valid data → Auction created, success message
  - [ ] Error handling fungerer
- [ ] **PlaceBid test:**
  - [ ] Form kan åbnes
  - [ ] Validation: Bid too low → Error vises
  - [ ] Validation: Auction ended → Error vises
  - [ ] Submit med valid bid → Bid placed, success message
  - [ ] Error: Outbid during submission → Error vises, refresh
- [ ] **CountdownTimer test:**
  - [ ] Timer vises korrekt
  - [ ] Countdown updates korrekt
  - [ ] ARIA live region announces updates
- [ ] **Accessibility test:**
  - [ ] Forms er keyboard accessible
  - [ ] Error messages annonceres
  - [ ] Focus management fungerer

**⚠️ PAUSE HERE** - Verificer Marketplace komponenter før Phase 4

---

## Phase 4: Migrer Community Komponenter

### Overview

Migrer Community komponenter (CreatePost, PostComments, home/*) til Next.js app.

### Changes Required:

#### 1. Migrer CreatePost

**File:** `apps/web/components/community/CreatePost.tsx` (ny fil)

**Changes:** Migrer med Supabase client og Zod validation

**Key Changes:**
- `import { supabase }` → `import { createClient }` og kald `createClient()`
- **Opret Zod schema:** `postSchema` per `.cursor/rules/12-forms_actions_validation.mdc`
  - Fields: `content` (required, max length), `jerseyId` (optional)

**Validation Schema:**
```typescript
const postSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(1000),
  jerseyId: z.string().uuid().optional(),
});
```

#### 2. Migrer PostComments

**File:** `apps/web/components/community/PostComments.tsx` (ny fil)

**Changes:** Migrer med Supabase client og realtime subscription cleanup

**Key Changes:**
- `import { supabase }` → `import { createClient }` og kald `createClient()`
- **Realtime cleanup:** Ensure subscription cleanup i useEffect return

#### 3. Migrer home/ komponenter

**Files:**
- `apps/web/components/community/home/ActivitySnapshot.tsx`
- `apps/web/components/community/home/CommunityPreview.tsx`
- `apps/web/components/community/home/HeroSpotlight.tsx`
- `apps/web/components/community/home/MarketplaceForYou.tsx`
- `apps/web/components/community/home/QuickActions.tsx`
- `apps/web/components/community/home/RightSidebar.tsx`

**Changes:** Migrer alle med Next.js routing og Supabase client

**Key Changes:**
- `useNavigate()` → `useRouter().push()`
- `import { supabase }` → `import { createClient }` og kald `createClient()`

### Success Criteria:

#### Automated Verification:
- [ ] Alle 8 Community komponenter eksisterer i `apps/web/components/community/`
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors)

### Error Handling:

- [ ] Post creation errors håndteres
- [ ] Comment submission errors håndteres
- [ ] Realtime subscription errors håndteres
- [ ] Empty states vises korrekt (no posts, no comments)

### Performance:

- [ ] Realtime subscriptions cleanup korrekt
- [ ] Query batching (hvis multiple queries)
- [ ] No memory leaks

### Accessibility:

- [ ] Forms er keyboard accessible
- [ ] Comments er keyboard navigable
- [ ] ARIA labels for interactive elements

#### Manual Verification:
- [ ] Alle 8 komponenter kan importeres korrekt
- [ ] **CreatePost test:**
  - [ ] Form kan åbnes
  - [ ] Validation: Empty content → Error vises
  - [ ] Validation: Content too long → Error vises
  - [ ] Submit med valid data → Post created, success message
  - [ ] Error handling fungerer
- [ ] **PostComments test:**
  - [ ] Comments loader korrekt
  - [ ] Comment submission fungerer
  - [ ] Realtime updates fungerer (test ved at poste comment fra anden browser)
  - [ ] Empty state vises når ingen comments
  - [ ] Subscription cleanup fungerer (no memory leaks)
- [ ] **home/* komponenter test:**
  - [ ] Routing fungerer (click links → navigation)
  - [ ] Data fetching fungerer
  - [ ] Empty states vises korrekt
  - [ ] Error handling fungerer
- [ ] **Accessibility test:**
  - [ ] Keyboard navigation fungerer
  - [ ] Focus states er synlige
  - [ ] Screen reader support

**⚠️ PAUSE HERE** - Verificer Community komponenter før Phase 5

---

## Phase 5: Migrer Profile Komponenter

### Overview

Migrer Profile komponenter (EditProfile, NavLink, SidebarNavLink) til Next.js app.

### Changes Required:

#### 1. Migrer EditProfile

**File:** `apps/web/components/profile/EditProfile.tsx` (ny fil)

**Changes:** Migrer med Supabase client og Zod validation

**Key Changes:**
- `import { supabase }` → `import { createClient }` og kald `createClient()`
- **Kopier Zod schema:** `profileSchema` fra `src/components/EditProfile.tsx` (eller opret shared schema)

**Validation Schema:**
```typescript
const profileSchema = z.object({
  username: z.string().trim().min(1).max(50),
  bio: z.string().trim().max(500).optional(),
  country: z.string().optional(),
});
```

**Error Handling:**
- Avatar upload errors: Show retry option
- Profile update errors: Show error message, preserve form data
- Validation errors: Show inline errors

#### 2. Migrer NavLink

**File:** `apps/web/components/profile/NavLink.tsx` (ny fil)

**Changes:** Migrer til Next.js Link med active state

**Rationale:** Next.js Link har ikke built-in active state, så vi skal bruge `usePathname()`.

**Original (React Router):**
```typescript
import { NavLink as RouterNavLink, NavLinkProps } from "react-router-dom";
```

**Migreret (Next.js):**
```typescript
'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
  [key: string]: any;
}

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ href, className, activeClassName, children, ...props }, ref) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

NavLink.displayName = "NavLink";
```

#### 3. Migrer SidebarNavLink

**File:** `apps/web/components/profile/SidebarNavLink.tsx` (ny fil)

**Changes:** Migrer til Next.js Link med active state

**Original (React Router):**
```typescript
import { Link, useLocation } from "react-router-dom";
const location = useLocation();
const isActive = location.pathname === to;
```

**Migreret (Next.js):**
```typescript
'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
}

export const SidebarNavLink = ({ href, icon: Icon, label, badge }: SidebarNavLinkProps) => {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-smooth text-sm font-medium",
        isActive
          ? "bg-secondary text-foreground border-l-2 border-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-primary flex items-center justify-center">
          <span className="text-xs text-primary-foreground font-bold">
            {badge > 99 ? "99+" : badge}
          </span>
        </span>
      )}
    </Link>
  );
};
```

**Note:** Nu kan Sidebar (Phase 1) bruge SidebarNavLink korrekt.

### Success Criteria:

#### Automated Verification:
- [ ] Alle 3 Profile komponenter eksisterer i `apps/web/components/profile/`
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors)

### Error Handling:

- [ ] Profile update errors håndteres
- [ ] Avatar upload errors håndteres
- [ ] Validation errors vises inline

### Input Validation:

- [ ] Zod schema kopieret fra `src/components/EditProfile.tsx`
- [ ] React Hook Form bruger zodResolver
- [ ] Validation errors vises korrekt

### Performance:

- [ ] Image compression før upload
- [ ] Upload progress vises
- [ ] Submit button disabled under submission

### Accessibility:

- [ ] Forms er keyboard accessible
- [ ] Error messages annonceres
- [ ] Image upload er accessible
- [ ] Nav links er keyboard accessible

#### Manual Verification:
- [ ] **EditProfile test:**
  - [ ] Form kan åbnes
  - [ ] Validation: Invalid username → Error vises
  - [ ] Validation: Bio too long → Error vises
  - [ ] Submit med valid data → Profile updated, success message
  - [ ] Avatar upload fungerer
  - [ ] Error: Upload fails → Error message, retry fungerer
  - [ ] Form data bevares ved fejl
- [ ] **NavLink test:**
  - [ ] Link navigation fungerer
  - [ ] Active state opdateres korrekt (highlighted)
  - [ ] Keyboard navigation fungerer (Tab, Enter)
  - [ ] Screen reader announces active state
- [ ] **SidebarNavLink test:**
  - [ ] Link navigation fungerer
  - [ ] Active state opdateres korrekt
  - [ ] Badge vises korrekt
  - [ ] Keyboard navigation fungerer
  - [ ] Screen reader announces active state og badge
- [ ] **Accessibility test:**
  - [ ] All forms keyboard accessible
  - [ ] Focus states synlige
  - [ ] Error messages annonceres

**⚠️ PAUSE HERE** - Verificer Profile komponenter før Phase 6

---

## Phase 6: Migrer Utility Komponenter

### Overview

Migrer Utility komponenter (ProtectedRoute) til Next.js app. ProtectedRoute skal konverteres til Next.js middleware eller layout pattern.

### Changes Required:

#### 1. Migrer ProtectedRoute

**File:** `apps/web/components/ProtectedRoute.tsx` (ny fil)

**Changes:** Migrer til Next.js pattern med useRouter

**Original (React Router):**
```typescript
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);
  // ...
};
```

**Migreret (Next.js):**
```typescript
'use client'

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
```

**Key Changes:**
- `useNavigate()` → `useRouter().push()`
- `import { useAuth }` → Bruger migreret AuthContext

**Alternative Approach (Middleware):**
Se "ProtectedRoute Middleware Evaluation" sektion for detaljer. For nu bruger vi komponent approach for konsistens med legacy app.

### Error Handling:

- [ ] Auth check errors håndteres gracefully
- [ ] Redirect errors håndteres
- [ ] Loading state vises korrekt

### Performance:

- [ ] Minimal re-renders
- [ ] Redirect happens quickly

### Accessibility:

- [ ] Loading state annonceres til screen readers
- [ ] Redirect annonceres

### Success Criteria:

#### Automated Verification:
- [ ] ProtectedRoute eksisterer i `apps/web/components/`
- [ ] Type check: `cd apps/web && npx tsc --noEmit` (ingen errors)
- [ ] Build: `cd apps/web && npm run build` (ingen errors)

#### Manual Verification:
- [ ] ProtectedRoute kan importeres: `import { ProtectedRoute } from "@/components/ProtectedRoute"`
- [ ] **Authentication test:**
  - [ ] User authenticated → Children renders
  - [ ] User not authenticated → Redirects to /auth
  - [ ] Loading state → Shows spinner, "Loading..." text
  - [ ] Auth state change → Updates korrekt
- [ ] **Error handling test:**
  - [ ] Auth check fails → Shows error, allows retry
  - [ ] Redirect fails → Shows error message
- [ ] **Accessibility test:**
  - [ ] Loading state annonceres
  - [ ] Redirect annonceres
  - [ ] Keyboard navigation fungerer

**⚠️ PAUSE HERE** - Verificer ProtectedRoute før afslutning

---

## Testing Strategy

### Per-Component Testing

**For hver komponent:**
1. Kopier fil til Next.js app
2. Opdater imports (routing, Supabase, types)
3. Test komponenten i Next.js page
4. Verificer funktionalitet matcher eksisterende frontend
5. Test error handling
6. Test edge cases
7. Test accessibility

### Integration Testing

**Manual Testing:**
1. Test hver komponent individuelt i Next.js app
2. Verificer data fetching fungerer korrekt
3. Test interaktive features (forms, buttons, navigation)
4. Sammenlign med eksisterende frontend for konsistens
5. Test error scenarios (network failures, validation errors)
6. Test edge cases (empty states, large data, race conditions)
7. Test accessibility (keyboard navigation, screen reader)

### Error Handling Testing

**For hver komponent med Supabase queries:**
1. Disconnect network → Verify error message vises
2. Reconnect → Verify data refreshes
3. Invalid query → Verify error handling
4. Realtime subscription failure → Verify cleanup

**For hver form:**
1. Submit empty form → Verify validation errors
2. Submit invalid data → Verify specific errors
3. Submit during network failure → Verify error message
4. Retry after error → Verify retry fungerer

### Edge Case Testing

1. **Missing auth:** ProtectedRoute redirect fungerer
2. **Supabase errors:** Error handling fungerer korrekt
3. **Routing:** Navigation fungerer på tværs af komponenter
4. **Realtime:** Supabase realtime subscriptions fungerer og cleanup korrekt
5. **Empty states:** UI vises korrekt når ingen data
6. **Large data:** Pagination eller virtual scrolling fungerer
7. **Race conditions:** Optimistic updates håndteres korrekt
8. **File upload:** Large files, invalid types, network failures

### Accessibility Testing

**For hver komponent:**
1. **Keyboard navigation:**
   - [ ] Tab through all interactive elements
   - [ ] Enter/Space activates buttons
   - [ ] Escape closes modals
   - [ ] Focus order is logical

2. **Screen reader:**
   - [ ] Test with VoiceOver (Mac) eller NVDA (Windows)
   - [ ] All interactive elements are announced
   - [ ] Error messages are announced
   - [ ] Dynamic content updates are announced

3. **Visual:**
   - [ ] Focus states are visible
   - [ ] Color contrast meets WCAG AA
   - [ ] No color-only indicators

### Performance Testing

**For hver komponent:**
1. Check bundle size impact
2. Verify no memory leaks (React DevTools)
3. Test with slow network (throttle in DevTools)
4. Verify subscriptions cleanup
5. Check re-render frequency

### Sentry Integration Testing

**Note:** Sentry errors skal ikke testes manuelt i denne fase (antager Sentry er konfigureret). Men error handling skal stadig fungere gracefully.

**For production:**
- Verify Sentry captures errors (check Sentry dashboard)
- Verify no PII in error context
- Verify error tags are correct

---

## Rollback Strategy

Hvis noget går galt:

1. **Delete migrated files:**
   ```bash
   rm -rf apps/web/components/layout
   rm -rf apps/web/components/jersey
   rm -rf apps/web/components/marketplace
   rm -rf apps/web/components/community
   rm -rf apps/web/components/profile
   rm apps/web/components/ProtectedRoute.tsx
   rm -rf apps/web/contexts
   ```

2. **Verify legacy app still works:**
   ```bash
   cd src
   npm run dev
   # Verify app loads on localhost:8080
   ```

3. **No impact on legacy app** - alle ændringer er i Next.js app som kører separat.

---

## Dependencies & Prerequisites

### Required Dependencies (allerede installeret):

- ✅ `next` - Next.js framework
- ✅ `react` - React library
- ✅ `react-dom` - React DOM
- ✅ `@supabase/ssr` - Supabase SSR client
- ✅ `@supabase/supabase-js` - Supabase JS client
- ✅ `react-hook-form` - Form handling
- ✅ `@hookform/resolvers` - Form validation
- ✅ `zod` - Schema validation (hvis brugt)
- ✅ `@huddle/types` - Shared types (packages/types)
- ✅ `lucide-react` - Icons
- ✅ `clsx` - Class utilities
- ✅ `tailwind-merge` - Tailwind class merging

### Verificer Dependencies:

```bash
cd apps/web
npm list --depth=0 | grep -E "next|react|@supabase|react-hook-form|@hookform|zod|lucide-react|clsx|tailwind-merge"
```

---

## References

- **Linear Issue:** [HUD-9](https://linear.app/huddle-world/issue/HUD-9/fase-33-migrer-domain-komponenter-jerseycard-sidebar-etc)
- **Migration Plan:** `.project/08-Migration_Plan.md` - Fase 3.3
- **Frontend Guide:** `.project/07-Frontend_Guide.md` - Komponent struktur
- **Previous Phases:**
  - HUD-7: UI komponenter migration
  - HUD-8: Supabase client migration
- **Next.js Rules:** `.cursor/rules/10-nextjs_frontend.mdc`
- **Supabase Patterns:** `.cursor/rules/32-supabase_patterns.mdc`
- **Source Components:** `src/components/` (21 filer)
- **Source Contexts:** `src/contexts/AuthContext.tsx`

---

## Notes

- **Migrer én komponent ad gangen** - nemmere debugging
- **Test hver komponent grundigt** - før næste
- **Hold eksisterende frontend intakt** - som reference
- **Routing patterns:** Konsistent brug af Next.js routing i alle komponenter
- **Supabase clients:** Client Components bruger `@/lib/supabase/client`, Server Components bruger `@/lib/supabase/server` (async)
- **AuthContext:** Migreret i Phase 0, bruges af mange komponenter

---

## Timeline Estimate

- **Phase 0:** 30-45 min (AuthContext migration)
- **Phase 1:** 1-2 timer (3 layout komponenter)
- **Phase 2:** 1-1.5 timer (2 Jersey komponenter)
- **Phase 3:** 1-1.5 timer (4 Marketplace komponenter)
- **Phase 4:** 2-3 timer (8 Community komponenter)
- **Phase 5:** 1-1.5 timer (3 Profile komponenter)
- **Phase 6:** 30 min (1 Utility komponent)

**Total:** ~7-11 timer (inkl. testing og verificering)

---

## Success Metrics

- ✅ Alle 21 domain komponenter migreret
- ✅ AuthContext migreret og fungerer
- ✅ Routing opdateret til Next.js patterns
- ✅ Supabase integration bruger SSR-compatible clients
- ✅ Types korrekt importeret fra `@huddle/types`
- ✅ Komponenter fungerer identisk med eksisterende frontend
- ✅ Ingen breaking changes til legacy app
- ✅ Next.js app kan bruge alle domain komponenter
- ✅ Ready for Fase 4 (API routes)

---

**Plan oprettet:** 2025-11-26  
**Status:** Ready for Implementation  
**Next Step:** Start Phase 0 - Migrer AuthContext


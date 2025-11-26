# Fase 3.4: Migrer Pages til Next.js App Router - Implementation Plan

## Overview

Migrer alle 13 pages fra `src/pages/` til Next.js App Router struktur i `apps/web/app/`. Dette er Fase 3.4 i migrationsplanen og omfatter konvertering af React Router pages til Next.js App Router pages med korrekt routing, layouts, data fetching, og Server Components hvor muligt.

**Hvorfor:** Efter domain komponenter (HUD-9) er migreret, skal pages migreres for at Next.js appen kan fungere som fuldt funktionel frontend. Pages indeholder routing logic, data fetching, og orkestrering af komponenter - alle skal opdateres til Next.js patterns.

**Mål:** Alle pages er migreret til Next.js App Router, fungerer identisk med eksisterende frontend, bruger Next.js routing korrekt, og Server Components hvor muligt for bedre performance.

---

## Linear Issue

**Issue:** [HUD-10](https://linear.app/huddle-world/issue/HUD-10/fase-34-migrer-pages-til-nextjs-app-router)  
**Status:** In Progress  
**Labels:** Migration, Frontend, Feature  
**Project:** Frontend Migration  
**Branch:** `nicklaseskou95/hud-10-fase-34-migrer-pages-til-nextjs-app-router`

---

## Current State Analysis

### Eksisterende Pages i `src/pages/`:

```
src/pages/
├── Auth.tsx                    # Login/signup form, Supabase auth
├── Home.tsx                    # Dashboard med multiple komponenter
├── Wardrobe.tsx                # Jersey collection, filters, upload
├── Marketplace.tsx              # Sale listings + auctions, filters, pagination
├── Community.tsx               # Posts feed, create post, comments
├── Profile.tsx                  # User's own profile, stats, edit
├── UserProfile.tsx             # Other user's profile (dynamic route)
├── Notifications.tsx            # Notification list, mark as read
├── Settings.tsx                # Settings UI (simple, no data fetching)
├── JerseyDetail.tsx            # Jersey detail view (dynamic route)
├── Messages.tsx                 # Conversation list
├── Chat.tsx                    # Chat interface (dynamic route)
└── NotFound.tsx                # 404 page
```

### Next.js App Router State:

```
apps/web/app/
├── layout.tsx                   # ✅ Root layout (mangler providers)
├── page.tsx                     # ✅ Basic placeholder
└── test-*/                      # Test pages (kan fjernes senere)
```

### Key Discoveries:

1. **Root Layout Mangler:**
   - TanStack Query Provider (bruges i `src/App.tsx`)
   - Toaster og Sonner komponenter
   - Metadata skal opdateres

2. **Routing Changes Required:**
   - `useNavigate()` → `useRouter().push()` fra `next/navigation`
   - `useLocation()` → `usePathname()` fra `next/navigation`
   - `useParams()` → `params` prop i Server Components ELLER `useParams()` fra `next/navigation` i Client Components
   - `Link` fra `react-router-dom` → `Link` fra `next/link`
   - `NavLink` → Custom component med `usePathname()`

3. **Supabase Client Changes:**
   - `import { supabase } from "@/integrations/supabase/client"` → `import { createClient } from "@/lib/supabase/client"` (Client Components)
   - `supabase` (singleton) → `createClient()` (function call per component)
   - Server Components skal bruge `@/lib/supabase/server` (async)

4. **Layout Components:**
   - Sidebar, BottomNav, CommandBar er allerede migreret (HUD-9)
   - Skal wrappes i dashboard layout

5. **Protected Routes:**
   - `ProtectedRoute` komponent eksisterer allerede i Next.js app
   - Skal bruges i layouts eller page wrappers

6. **Data Fetching:**
   - Mange pages bruger `useEffect` + Supabase client fetching
   - Skal konverteres til Server Components hvor muligt
   - Client-side fetching (real-time, user interactions) skal forblive Client Components

7. **BottomNav:**
   - Alle pages har `<BottomNav />` component
   - Skal flyttes til dashboard layout (ikke i hver page)

8. **Database Dependencies:**
   - **KRITISK:** Supabase migrations er ikke kørt (HUD-14)
   - `profiles` tabel eksisterer ikke → PGRST205 error
   - Mange pages kræver database for fuld funktionalitet
   - **Strategi:** Migrer routing/UI først, brug mock data, opdater når database er klar

---

## Database Dependencies & Mock Strategy

### Current Database Status

**Problem:** Supabase migrations er ikke kørt (se HUD-14)
- `profiles` tabel mangler → PGRST205 error
- Username validation virker ikke ved signup
- Alle pages med data fetching fejler

**Impact på HUD-10:**
- Phase 3 (Auth): Username validation virker ikke (håndteret med graceful degradation)
- Phase 4-8: Alle pages med data fetching kræver database

### Migration Strategy

**Approach:** Migrer routing og UI først, opdater data fetching når database er klar

**Pages der kan migreres nu (ingen database):**
- ✅ Phase 0-2: Foundation, Structure, NotFound (done)
- ✅ Phase 3: Auth (done, med graceful degradation for username check)
- ✅ Phase 4: Settings (ingen data fetching)

**Pages der kræver mock/placeholder (database nødvendig):**
- ⚠️ Phase 4: Notifications (kræver `notifications` tabel)
- ⚠️ Phase 5: Wardrobe, Marketplace, Community (kræver `jerseys`, `sale_listings`, `auctions`, `posts` tabeller)
- ⚠️ Phase 6: Profile, UserProfile (kræver `profiles` tabel)
- ⚠️ Phase 7: JerseyDetail, Chat (kræver `jerseys`, `conversations`, `messages` tabeller)
- ⚠️ Phase 8: Home, Messages (kræver multiple tabeller)

### Mock Implementation Pattern

For pages der kræver database:

1. **Migrer routing og UI struktur først**
   - Konverter React Router → Next.js routing
   - Opdater layouts og navigation
   - Behold alle UI komponenter

2. **Data fetching med graceful degradation:**
```typescript
const fetchData = async () => {
  setLoading(true);
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("table_name")
      .select("*");
    
    if (error) {
      // Handle database errors gracefully
      if (error.code === "PGRST205") {
        // Table doesn't exist - show empty state
        console.warn("Database table not found - using mock data");
        setData([]); // or mock data for development
        return;
      }
      throw error;
    }
    
    setData(data || []);
  } catch (error) {
    console.error("Error fetching data:", error);
    toast({
      title: "Error",
      description: "Failed to load data",
      variant: "destructive",
    });
    setData([]); // Show empty state
  } finally {
    setLoading(false);
  }
};
```

3. **TODO kommentarer for post-database updates:**
```typescript
// TODO: Update when database is ready (HUD-14)
// - Verify table exists
// - Test data fetching
// - Remove mock data fallback
// - Test real-time subscriptions
```

4. **Empty states skal virke:**
   - Vis loading spinner
   - Vis empty state når `data.length === 0` og `!loading`
   - Vis error state med retry button

### Post-Database Migration Checklist

Når HUD-14 er løst og migrations er kørt:

**For hver page med data fetching:**
- [ ] Verificer tabel eksisterer (test query)
- [ ] Test data fetching fungerer
- [ ] Test error handling
- [ ] Test empty states
- [ ] Test loading states
- [ ] Test real-time subscriptions (hvis relevant)
- [ ] Fjern mock data fallbacks
- [ ] Fjern TODO kommentarer
- [ ] Opdater dokumentation

**Pages der skal opdateres:**
- Phase 3: Auth (username validation)
- Phase 4: Notifications
- Phase 5: Wardrobe, Marketplace, Community
- Phase 6: Profile, UserProfile
- Phase 7: JerseyDetail, Chat
- Phase 8: Home, Messages

**Estimated time:** 2-4 timer (test og verify alle pages)

---

## Desired End State

### App Router Struktur:

```
apps/web/app/
├── layout.tsx                   # Root layout med providers
├── not-found.tsx                 # 404 page
├── (auth)/
│   └── auth/
│       └── page.tsx             # Auth page
└── (dashboard)/
    ├── layout.tsx               # Dashboard layout (Sidebar + CommandBar + BottomNav)
    ├── page.tsx                  # Home page
    ├── wardrobe/
    │   └── page.tsx
    ├── marketplace/
    │   └── page.tsx
    ├── community/
    │   └── page.tsx
    ├── profile/
    │   ├── page.tsx             # Own profile
    │   └── [username]/
    │       └── page.tsx         # User profile (dynamic)
    ├── notifications/
    │   └── page.tsx
    ├── settings/
    │   └── page.tsx
    ├── jersey/
    │   └── [id]/
    │       └── page.tsx         # Jersey detail (dynamic)
    └── messages/
        ├── page.tsx             # Messages list
        └── [id]/
            └── page.tsx         # Chat (dynamic)
```

### Verification Criteria:

- ✅ Alle 13 pages migreret og fungerer
- ✅ Routing fungerer korrekt (inkl. dynamic routes)
- ✅ Data fetching fungerer (Server Components hvor muligt)
- ✅ Navigation fungerer mellem pages
- ✅ Layouts er korrekt sat op (Sidebar, BottomNav, CommandBar)
- ✅ Protected routes fungerer
- ✅ No console errors
- ✅ Build succeeds
- ✅ Type check passes

---

## What We're NOT Doing

- **Ikke migrere komponenter:** Domain komponenter er allerede migreret (HUD-9)
- **Ikke oprette nye features:** Kun migration af eksisterende pages
- **Ikke refaktorere business logic:** Beholder samme logik, kun konverterer til Next.js patterns
- **Ikke ændre UI/UX:** Identisk funktionalitet og design
- **Ikke optimere performance endnu:** Fokus på korrekt migration først, optimization senere
- **Ikke fjerne `src/pages/` endnu:** Bevares indtil Next.js app er fuldt testet

---

## Implementation Approach

**Strategi:** Batch migration fra simple til komplekse pages, med samlet test til sidst.

**Fasering:**
1. Foundation (root layout, providers)
2. Struktur (route groups, layouts)
3. Simple pages (NotFound, Settings)
4. Auth page (foundation for protected routes)
5. Dashboard pages batch 1 (Notifications, Settings - simple)
6. Dashboard pages batch 2 (Wardrobe, Marketplace, Community - med data fetching)
7. Profile pages (Profile, UserProfile - dynamic route)
8. Dynamic routes (JerseyDetail, Chat)
9. Complex pages (Home, Messages - mange komponenter)
10. Testing & polish

---

## Phase 0: Foundation - Root Layout & Providers

### Overview

Opdater root layout med alle nødvendige providers (TanStack Query, Toaster, Sonner) og korrekt metadata. Dette er foundation for alle pages.

### Changes Required:

#### 1. Root Layout - Tilføj Providers

**File:** `apps/web/app/layout.tsx`

**Changes:** 
- Tilføj TanStack Query Provider
- Tilføj Toaster og Sonner komponenter
- Opdater metadata til Huddle branding
- Behold AuthProvider (allerede der)

**Rationale:** 
- TanStack Query er brugt i mange komponenter og pages
- Toaster og Sonner er brugt for toast notifications
- Metadata opdateres til korrekt branding
- TanStack Query Provider skal være Client Component (Next.js App Router requirement)

**Note:** Vi opretter en QueryProvider wrapper fordi QueryClient skal oprettes i Client Component med `useState` for at undgå server/client mismatch i Next.js App Router.

**File:** `apps/web/components/providers/query-provider.tsx`

```typescript
'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Use useState to create QueryClient once per component instance
  // This prevents creating new client on every render (Next.js App Router requirement)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

**File:** `apps/web/app/layout.tsx`

**Code:**

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Huddle - Jersey Marketplace & Community",
  description: "Buy, sell, and trade football jerseys. Connect with collectors worldwide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>
            {children}
            <Toaster />
            <Sonner />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] App starter uden errors
- [ ] Toaster komponenter er tilgængelig (test med toast)
- [ ] TanStack Query fungerer (test med query)

---

## Phase 1: App Router Struktur

### Overview

Opret route groups `(auth)` og `(dashboard)`, og dashboard layout med Sidebar + CommandBar + BottomNav wrapper.

### Changes Required:

#### 1. Opret Route Groups

**Files:**
- `apps/web/app/(auth)/auth/page.tsx` (placeholder, migreres i Phase 3)
- `apps/web/app/(dashboard)/layout.tsx` (dashboard layout)
- `apps/web/app/(dashboard)/page.tsx` (placeholder, migreres i Phase 8)

**Directory Structure:**

```bash
mkdir -p apps/web/app/\(auth\)/auth
mkdir -p apps/web/app/\(dashboard\)
```

#### 2. Dashboard Layout

**File:** `apps/web/app/(dashboard)/layout.tsx`

**Changes:** 
- Wrapper med Sidebar, CommandBar, og BottomNav
- Håndter padding for sidebar (lg:pl-64)
- BottomNav padding (pb-20 lg:pb-8)

**Code:**

```typescript
'use client'

import { Sidebar } from "@/components/layout/Sidebar";
import { CommandBar } from "@/components/layout/CommandBar";
import { BottomNav } from "@/components/layout/BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <CommandBar />
      <Sidebar />
      <div className="lg:pl-64 min-h-screen pb-20 lg:pb-8">
        {children}
      </div>
      <BottomNav />
    </>
  );
}
```

**Rationale:** 
- Sidebar, CommandBar, og BottomNav skal være tilgængelig på alle dashboard pages
- Layout håndterer spacing og positioning
- Client Component fordi Sidebar/CommandBar bruger hooks

#### 3. Auth Route Group (Placeholder)

**File:** `apps/web/app/(auth)/auth/page.tsx`

**Changes:** 
- Placeholder (migreres i Phase 3)

**Code:**

```typescript
export default function AuthPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Auth page - migreres i Phase 3</p>
    </div>
  );
}
```

#### 4. Dashboard Home Placeholder

**File:** `apps/web/app/(dashboard)/page.tsx`

**Changes:** 
- Placeholder (migreres i Phase 8)

**Code:**

```typescript
export default function HomePage() {
  return (
    <div className="min-h-screen">
      <p>Home page - migreres i Phase 8</p>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] Naviger til `/` - dashboard layout vises (Sidebar + BottomNav)
- [ ] Naviger til `/auth` - auth page vises (ingen dashboard layout)
- [ ] Sidebar navigation fungerer
- [ ] CommandBar åbner med Cmd/Ctrl+K

---

## Phase 2: Simple Pages - NotFound

### Overview

Migrer NotFound page - den simpleste page uden data fetching eller kompleks logik.

### Changes Required:

#### 1. NotFound Page

**File:** `apps/web/app/not-found.tsx`

**Changes:** 
- Konverter fra React Router `useLocation` til Next.js `not-found.tsx`
- Fjern `useLocation` hook (ikke nødvendig i Next.js)
- Opdater link til `next/link`

**Code:**

```typescript
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <Link href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
```

**Rationale:** 
- Next.js `not-found.tsx` håndterer automatisk 404 routes
- `useLocation` er ikke nødvendig (Next.js logger automatisk)
- `Link` fra `next/link` for korrekt client-side navigation

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] Naviger til `/non-existent-route` - 404 page vises
- [ ] "Return to Home" link fungerer
- [ ] Ingen console errors

---

## Phase 3: Auth Page

### Overview

Migrer Auth page - foundation for authentication og protected routes.

**Database Status:**
- ⚠️ Username validation kræver `profiles` tabel (håndteret med graceful degradation)
- Auth flow virker, men username uniqueness check fejler hvis tabel mangler
- Se HUD-14 for database migration status

### Changes Required:

#### 1. Auth Page

**File:** `apps/web/app/(auth)/auth/page.tsx`

**Changes:** 
- Konverter fra React Router `useNavigate` til Next.js `useRouter`
- Opdater Supabase import fra `@/integrations/supabase/client` til `@/lib/supabase/client`
- Opdater `supabase` singleton til `createClient()` call
- Behold Client Component (form interactivity)

**Code (key changes):**

```typescript
'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
// ... other imports ...

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  // ... state ...
  const router = useRouter();
  const { user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = loginSchema.parse({ email, password });
      setIsSubmitting(true);

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        // Handle specific Supabase auth errors
        if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Login Failed",
            description: "Invalid email or password",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Login Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in",
        });
        router.push("/");
      }
    } catch (error) {
      // Handle validation errors
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        // Unexpected errors
        console.error("Login error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = signupSchema.parse({ username, email, password, confirmPassword });
      setIsSubmitting(true);

      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            username: validated.username,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please log in instead.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup Failed",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (data.user) {
        toast({
          title: "Account Created!",
          description: "Welcome to Huddle! Your account has been created.",
        });
        router.push("/");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.issues[0];
        toast({
          title: "Validation Error",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        console.error("Signup error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... rest of component ...
};
```

**Rationale:** 
- `useRouter` fra `next/navigation` for navigation
- `createClient()` for Supabase client (per component instance)
- Client Component fordi form har interactivity

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] Naviger til `/auth` - auth page vises
- [ ] Login fungerer - redirect til `/` efter login
- [ ] Signup fungerer - redirect til `/` efter signup
- [ ] Form validation fungerer
- [ ] Error messages vises korrekt
- [ ] Redirect hvis allerede logged in

---

## Phase 4: Dashboard Pages - Batch 1 (Simple)

### Overview

Migrer simple dashboard pages: Settings (ingen database) og Notifications (kræver database).

**Database Status:**
- Settings: ✅ Ingen database nødvendig
- Notifications: ⚠️ Kræver `notifications` tabel (mock implementation nødvendig)

### Changes Required:

#### 1. Settings Page

**File:** `apps/web/app/(dashboard)/settings/page.tsx`

**Changes:** 
- Konverter `useNavigate` til `useRouter`
- Fjern `<BottomNav />` (håndteres i layout)
- Behold Client Component (interactivity)

**Code (key changes):**

```typescript
'use client'

import { useRouter } from "next/navigation";
// ... other imports ...
// Remove BottomNav import

const Settings = () => {
  const { signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/auth");
  };

  return (
    <div className="min-h-screen">
      {/* Remove pb-20 lg:pb-8 (handled by layout) */}
      {/* ... rest of component ... */}
    </div>
  );
};
```

**Rationale:** 
- BottomNav er i dashboard layout, ikke i hver page
- `useRouter` for navigation

#### 2. Notifications Page

**File:** `apps/web/app/(dashboard)/notifications/page.tsx`

**Changes:** 
- Konverter `useNavigate` til `useRouter`
- Opdater Supabase import til `createClient()`
- Fjern `<BottomNav />`
- Behold Client Component (real-time updates)
- **Database Dependency:** Kræver `notifications` tabel (mock implementation nødvendig)

**Code (key changes):**

```typescript
'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
// Remove BottomNav import

const Notifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  // ... state ...

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      
      // TODO: Update when database is ready (HUD-14)
      // Handle database table not found gracefully
      if (error.code === "PGRST205") {
        console.warn("Notifications table not found - using empty state");
        setNotifications([]);
        setLoading(false);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
      // Set empty array on error to show empty state
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of component ...
};
```

**Rationale:** 
- Client Component fordi notifications skal opdateres real-time
- `createClient()` for Supabase
- `useRouter` for navigation

**Loading & Empty States:**
- Vis loading spinner mens data fetches
- Vis empty state hvis `notifications.length === 0` og `!loading`
- Empty state: "No notifications yet"

**Error Handling Pattern:**
```typescript
catch (error) {
  console.error("Error fetching notifications:", error);
  // Sentry error capture (if configured)
  // *Sentry.captureException(error, { tags: { page: "notifications" } });
  toast({
    title: "Error",
    description: "Failed to load notifications",
    variant: "destructive",
  });
  setNotifications([]); // Show empty state on error
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] Naviger til `/settings` - settings page vises med layout
- [ ] Naviger til `/notifications` - notifications page vises med layout
- [ ] BottomNav vises korrekt (ikke duplikeret)
- [ ] Sidebar navigation fungerer
- [ ] Settings logout fungerer
- [ ] Notifications load og vises korrekt

---

## Phase 5: Dashboard Pages - Batch 2 (Med Data Fetching)

### Overview

Migrer pages med data fetching: Wardrobe, Marketplace, Community. Disse kan potentielt konverteres til Server Components, men beholder Client Components for nu (real-time updates, filters, pagination).

**Database Status:**
- ⚠️ Wardrobe: Kræver `jerseys` tabel (mock implementation nødvendig)
- ⚠️ Marketplace: Kræver `sale_listings`, `auctions`, `jerseys` tabeller (mock implementation nødvendig)
- ⚠️ Community: Kræver `posts`, `profiles`, `jerseys` tabeller (mock implementation nødvendig)

### Changes Required:

#### 1. Wardrobe Page

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** 
- Konverter `useNavigate` til `useRouter`
- Opdater Supabase import til `createClient()`
- Fjern `<BottomNav />`
- Opdater protected route check (brug `ProtectedRoute` eller redirect)

**Code (key changes):**

```typescript
'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
// Remove BottomNav import
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Wardrobe = () => {
  const { user } = useAuth();
  const router = useRouter();
  // ... state ...

  useEffect(() => {
    if (user) {
      fetchJerseys();
    } else {
      router.push("/auth");
    }
  }, [user, router]);

  const fetchJerseys = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("jerseys")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      setJerseys(data || []);
    } catch (error) {
      console.error("Error fetching jerseys:", error);
      toast({
        title: "Error",
        description: "Failed to load jerseys",
        variant: "destructive",
      });
      setJerseys([]);
    } finally {
      setLoading(false);
    }
  };

  // Wrap return with ProtectedRoute
  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* ... rest of component ... */}
      </div>
    </ProtectedRoute>
  );
};
```

**Rationale:** 
- Client Component fordi filters og upload er interactive
- `ProtectedRoute` wrapper for auth check
- `createClient()` for Supabase

**Loading & Empty States:**
- Vis loading spinner mens jerseys fetches
- Vis empty state hvis `jerseys.length === 0` og `!loading`
- Empty state: "No jerseys yet. Upload your first jersey!"

**Error Handling Pattern:**
```typescript
catch (error) {
  console.error("Error fetching jerseys:", error);
  // *Sentry.captureException(error, { tags: { page: "wardrobe" } });
  toast({
    title: "Error",
    description: "Failed to load jerseys",
    variant: "destructive",
  });
  setJerseys([]);
}
```

#### 2. Marketplace Page

**File:** `apps/web/app/(dashboard)/marketplace/page.tsx`

**Changes:** 
- Samme pattern som Wardrobe
- Konverter pagination logic
- Opdater filters til Next.js patterns

**Code (key changes):**

```typescript
'use client'

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Marketplace = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  // ... state ...

  // Use searchParams for URL state (filters, pagination)
  useEffect(() => {
    const category = searchParams.get("category");
    const minPrice = searchParams.get("minPrice");
    // ... update filters from URL ...
  }, [searchParams]);

  const updateFilters = (newFilters: FilterState) => {
    const params = new URLSearchParams();
    if (newFilters.category) params.set("category", newFilters.category);
    // ... set other params ...
    router.push(`/marketplace?${params.toString()}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* ... rest of component ... */}
      </div>
    </ProtectedRoute>
  );
};
```

**Rationale:** 
- `useSearchParams` for URL state management
- Client Component fordi filters og pagination er interactive

**Loading & Empty States:**
- Vis loading skeleton mens listings fetches
- Vis empty state hvis `listings.length === 0` og `!loading`
- Empty state: "No listings found. Try adjusting your filters."

**Error Handling Pattern:**
```typescript
catch (error) {
  console.error("Error fetching marketplace:", error);
  // *Sentry.captureException(error, { tags: { page: "marketplace" } });
  toast({
    title: "Error",
    description: "Failed to load marketplace listings",
    variant: "destructive",
  });
  setListings([]);
}
```

#### 3. Community Page

**File:** `apps/web/app/(dashboard)/community/page.tsx`

**Changes:** 
- Samme pattern som Wardrobe/Marketplace
- Opdater post fetching
- Opdater create post logic

**Code (key changes):**

```typescript
'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Community = () => {
  const { user } = useAuth();
  const router = useRouter();
  // ... state ...

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user, activeTab]);

  const fetchPosts = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      // ... fetch logic based on activeTab ...
      const { data, error } = await supabase
        .from("posts")
        .select("*, profiles(*), jerseys(*), post_likes(*), comments(*)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* ... rest of component ... */}
      </div>
    </ProtectedRoute>
  );
};
```

**Rationale:** 
- Client Component fordi posts skal opdateres real-time
- `ProtectedRoute` for auth check

**Loading & Empty States:**
- Vis loading skeleton mens posts fetches
- Vis empty state hvis `posts.length === 0` og `!loading`
- Empty state: "No posts yet. Be the first to post!"

**Error Handling Pattern:**
```typescript
catch (error) {
  console.error("Error fetching posts:", error);
  // *Sentry.captureException(error, { tags: { page: "community" } });
  toast({
    title: "Error",
    description: "Failed to load posts",
    variant: "destructive",
  });
  setPosts([]);
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] Naviger til `/wardrobe` - wardrobe page vises, jerseys load
- [ ] Naviger til `/marketplace` - marketplace page vises, listings load
- [ ] Naviger til `/community` - community page vises, posts load
- [ ] Filters fungerer (marketplace)
- [ ] Pagination fungerer (marketplace)
- [ ] Upload fungerer (wardrobe)
- [ ] Create post fungerer (community)
- [ ] Protected routes redirect hvis ikke logged in

---

## Phase 6: Profile Pages

### Overview

Migrer Profile og UserProfile pages. UserProfile har dynamic route `[username]`.

**Database Status:**
- ⚠️ Profile: Kræver `profiles` tabel (mock implementation nødvendig)
- ⚠️ UserProfile: Kræver `profiles`, `jerseys`, `posts` tabeller (mock implementation nødvendig)

### Changes Required:

#### 1. Profile Page (Own Profile)

**File:** `apps/web/app/(dashboard)/profile/page.tsx`

**Changes:** 
- Konverter `useNavigate` til `useRouter`
- Opdater Supabase import til `createClient()`
- Fjern `<BottomNav />`
- Behold Client Component

**Code (key changes):**

```typescript
'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Profile = () => {
  const { user } = useAuth();
  const router = useRouter();
  // ... state ...

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* ... rest of component ... */}
      </div>
    </ProtectedRoute>
  );
};
```

#### 2. UserProfile Page (Dynamic Route)

**File:** `apps/web/app/(dashboard)/profile/[username]/page.tsx`

**Changes:** 
- Konverter `useParams` til `params` prop (Server Component) ELLER `useParams()` (Client Component)
- Opdater Supabase import
- Fjern `<BottomNav />`

**Code (Client Component approach):**

```typescript
'use client'

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";

const UserProfile = () => {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = params.username;
  // ... state ...

  useEffect(() => {
    if (username) {
      fetchProfile();
      fetchJerseys();
      fetchPosts();
    }
  }, [username]);

  const fetchProfile = async () => {
    if (!username) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) {
        // Handle not found
        if (error.code === "PGRST116") {
          router.push("/not-found");
          return;
        }
        throw error;
      }
      
      setProfile(data);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      router.push("/not-found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ... rest of component ... */}
    </div>
  );
};
```

**Alternative (Server Component approach):**

```typescript
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UserProfileClient } from "./user-profile-client";

interface PageProps {
  params: Promise<{ username: string }>;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !profile) {
    notFound();
  }

  return <UserProfileClient profile={profile} username={username} />;
}
```

**Rationale:** 
- Client Component for nu (simpler migration)
- Server Component kan optimeres senere
- `useParams()` for dynamic route params

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] Naviger til `/profile` - own profile vises
- [ ] Naviger til `/profile/[username]` - user profile vises
- [ ] Profile data load korrekt
- [ ] Stats vises korrekt
- [ ] Edit profile fungerer
- [ ] Jerseys/posts tabs fungerer (UserProfile)

---

## Phase 7: Dynamic Routes - JerseyDetail & Chat

### Overview

Migrer dynamic route pages: JerseyDetail (`jersey/[id]`) og Chat (`messages/[id]`).

**Database Status:**
- ⚠️ JerseyDetail: Kræver `jerseys` tabel (mock implementation nødvendig)
- ⚠️ Chat: Kræver `conversations`, `messages` tabeller (mock implementation nødvendig)

### Changes Required:

#### 1. JerseyDetail Page

**File:** `apps/web/app/(dashboard)/jersey/[id]/page.tsx`

**Changes:** 
- Konverter `useParams` til `params` prop eller `useParams()`
- Opdater Supabase import
- Opdater navigation til jersey detail
- Fjern `<BottomNav />`

**Code (Client Component approach):**

```typescript
'use client'

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const JerseyDetail = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jerseyId = params.id;
  // ... state ...

  useEffect(() => {
    if (jerseyId) {
      fetchJersey();
      fetchListings();
    }
  }, [jerseyId]);

  const fetchJersey = async () => {
    if (!jerseyId) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("jerseys")
        .select("*")
        .eq("id", jerseyId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          router.push("/not-found");
          return;
        }
        throw error;
      }
      
      setJersey(data);
    } catch (error) {
      console.error("Error fetching jersey:", error);
      toast({
        title: "Error",
        description: "Failed to load jersey details",
        variant: "destructive",
      });
      router.push("/not-found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* ... rest of component ... */}
      </div>
    </ProtectedRoute>
  );
};
```

**Rationale:** 
- Client Component fordi der er mange interactions (like, bookmark, bid, etc.)
- `useParams()` for dynamic route params

**Loading & Empty States:**
- Vis loading skeleton mens jersey data fetches
- Vis 404/not-found hvis jersey ikke findes (error code PGRST116)
- Vis error state med retry button ved fejl

**Error Handling Pattern:**
```typescript
catch (error) {
  console.error("Error fetching jersey:", error);
  // *Sentry.captureException(error, { tags: { page: "jersey-detail", jerseyId } });
  if (error.code === "PGRST116") {
    router.push("/not-found");
    return;
  }
  toast({
    title: "Error",
    description: "Failed to load jersey details",
    variant: "destructive",
  });
  router.push("/not-found");
}
```

#### 2. Chat Page

**File:** `apps/web/app/(dashboard)/messages/[id]/page.tsx`

**Changes:** 
- Konverter `useParams` til `params` prop eller `useParams()`
- Opdater Supabase import
- Opdater real-time message subscriptions
- Fjern `<BottomNav />`

**Code (Client Component approach):**

```typescript
'use client'

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Chat = () => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const conversationId = params.id;
  // ... state ...


  const fetchConversation = async () => {
    if (!conversationId || !user) return;

    try {
      const supabase = createClient();
      // ... fetch conversation and messages ...
    } catch (error) {
      // ... error handling ...
    }
  };

  const subscribeToMessages = () => {
    if (!conversationId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        // Handle new message
        if (payload.new) {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      })
      .subscribe();

    // Return cleanup function
    return () => {
      supabase.removeChannel(channel);
    };
  };

  // Use subscription in useEffect with explicit cleanup
  useEffect(() => {
    if (conversationId && user) {
      fetchConversation();
      const cleanup = subscribeToMessages();
      
      // Return cleanup function from useEffect
      return cleanup;
    }
  }, [conversationId, user]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* ... rest of component ... */}
      </div>
    </ProtectedRoute>
  );
};
```

**Rationale:** 
- Client Component fordi real-time subscriptions kræver client-side
- `useParams()` for dynamic route params

**Loading & Empty States:**
- Vis loading skeleton mens conversation/messages fetches
- Vis empty state hvis `messages.length === 0` og `!loading`
- Empty state: "No messages yet. Start the conversation!"

**Error Handling Pattern:**
```typescript
catch (error) {
  console.error("Error fetching conversation:", error);
  // *Sentry.captureException(error, { tags: { page: "chat", conversationId } });
  toast({
    title: "Error",
    description: "Failed to load conversation",
    variant: "destructive",
  });
  // Optionally redirect to messages list
  router.push("/messages");
}
```

**Subscription Cleanup:**
- Eksplicit cleanup i useEffect return statement
- Test at subscriptions cleanup korrekt (check Supabase dashboard)

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] Naviger til `/jersey/[id]` - jersey detail vises
- [ ] Naviger til `/messages/[id]` - chat vises
- [ ] Jersey data load korrekt
- [ ] Messages load korrekt
- [ ] Real-time updates fungerer (chat)
- [ ] Interactions fungerer (like, bid, send message)
- [ ] Dynamic routes fungerer med forskellige IDs

---

## Phase 8: Complex Pages - Home & Messages

### Overview

Migrer de mest komplekse pages: Home (mange komponenter, data fetching) og Messages (conversation list).

### Changes Required:

#### 1. Home Page

**File:** `apps/web/app/(dashboard)/page.tsx`

**Changes:** 
- Konverter `useNavigate` til `useRouter`
- Opdater Supabase import
- Fjern `<BottomNav />` (håndteres i layout)
- Opdater alle home komponenter imports (allerede migreret i HUD-9)

**Code (key changes):**

```typescript
'use client'

import { Search, Bell, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { HeroSpotlight } from "@/components/home/HeroSpotlight";
import { ActivitySnapshot } from "@/components/home/ActivitySnapshot";
import { QuickActions } from "@/components/home/QuickActions";
import { MarketplaceForYou } from "@/components/home/MarketplaceForYou";
import { CommunityPreview } from "@/components/home/CommunityPreview";
import { RightSidebar } from "@/components/home/RightSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
// Remove BottomNav import

const Home = () => {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <>
      <div className="min-h-screen flex">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Sticky Header */}
          <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border shadow-lg">
            <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-3xl font-black tracking-tight text-gradient-neon uppercase">Huddle</h1>
              
                <div className="flex items-center gap-3">
                  {/* Search */}
                  <button
                    onClick={() => window.dispatchEvent(new Event("openCommandBar"))}
                    className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>

                  {/* Notifications */}
                  <button
                    onClick={() => router.push("/notifications")}
                    className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors relative"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  </button>

                  {/* Avatar */}
                  <button
                    onClick={() => router.push("/profile")}
                    className="w-10 h-10 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                    aria-label="Profile"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6 space-y-8">
            <HeroSpotlight />
            <ActivitySnapshot />
            <QuickActions />
            <MarketplaceForYou />
            <CommunityPreview />
          </main>
        </div>

        {/* Right Sidebar - Desktop Only */}
        <aside className="hidden xl:block w-80 border-l border-border p-6">
          <RightSidebar />
        </aside>
      </div>
    </>
  );
};

export default Home;
```

**Rationale:** 
- Client Component fordi der er interactions (buttons, command bar)
- `useRouter` for navigation
- Home komponenter er allerede migreret (HUD-9)

**Loading & Empty States:**
- Home komponenter håndterer deres egne loading/empty states
- HeroSpotlight, ActivitySnapshot, etc. har indbygget loading states
- Ingen global loading state nødvendig (komponenter loader individuelt)

**Error Handling:**
- Home komponenter håndterer deres egne errors
- Ingen global error handling nødvendig

#### 2. Messages Page

**File:** `apps/web/app/(dashboard)/messages/page.tsx`

**Changes:** 
- Konverter `useNavigate` til `useRouter`
- Opdater Supabase import
- Opdater navigation til chat pages
- Fjern `<BottomNav />`

**Code (key changes):**

```typescript
'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
// ... other imports ...
import { createClient } from "@/lib/supabase/client";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  // ... state ...

  const fetchConversations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const supabase = createClient();
      // ... fetch logic ...
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages(*), profiles(*)")
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    router.push(`/messages/${conversationId}`);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen">
        {/* ... rest of component ... */}
        {conversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => handleConversationClick(conv.id)}
            // ... rest of conversation item ...
          />
        ))}
      </div>
    </ProtectedRoute>
  );
};
```

**Rationale:** 
- Client Component fordi conversations skal opdateres real-time
- `useRouter` for navigation til chat pages

**Loading & Empty States:**
- Vis loading skeleton mens conversations fetches
- Vis empty state hvis `conversations.length === 0` og `!loading`
- Empty state: "No conversations yet. Start a conversation!"

**Error Handling Pattern:**
```typescript
catch (error) {
  console.error("Error fetching conversations:", error);
  // *Sentry.captureException(error, { tags: { page: "messages" } });
  toast({
    title: "Error",
    description: "Failed to load conversations",
    variant: "destructive",
  });
  setConversations([]);
}
```

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors

#### Manual Verification:
- [ ] Naviger til `/` - home page vises med alle komponenter
- [ ] Naviger til `/messages` - messages page vises
- [ ] Home komponenter load korrekt
- [ ] Conversations load korrekt
- [ ] Navigation fungerer (notifications, profile, chat)
- [ ] CommandBar fungerer (Cmd/Ctrl+K)

---

## Phase 9: Testing & Polish

### Overview

Test alle migrerede pages, verificer funktionalitet, og fix eventuelle issues.

### Changes Required:

#### 1. Comprehensive Testing

**Test alle routes:**
- [ ] `/` - Home page
- [ ] `/auth` - Auth page
- [ ] `/wardrobe` - Wardrobe page
- [ ] `/marketplace` - Marketplace page
- [ ] `/community` - Community page
- [ ] `/profile` - Own profile
- [ ] `/profile/[username]` - User profile
- [ ] `/notifications` - Notifications
- [ ] `/settings` - Settings
- [ ] `/jersey/[id]` - Jersey detail
- [ ] `/messages` - Messages list
- [ ] `/messages/[id]` - Chat
- [ ] `/non-existent` - 404 page

**Test funktionalitet:**
- [ ] Navigation mellem alle pages
- [ ] Dynamic routes fungerer med forskellige params
- [ ] Data fetching fungerer på alle pages
- [ ] Protected routes redirect korrekt
- [ ] Forms fungerer (auth, create post, etc.)
- [ ] Real-time updates fungerer (chat, notifications)
- [ ] Filters og sorting fungerer (marketplace)
- [ ] Pagination fungerer (marketplace, community)

#### 2. Fix Issues

**Common issues to check:**
- Console errors
- Type errors
- Build errors
- Lint errors
- Missing imports
- Incorrect routing
- Supabase client issues
- Auth context issues

#### 3. Performance Check

**Verify:**
- [ ] Pages load < 2 seconds
- [ ] No unnecessary re-renders
- [ ] Images load correctly
- [ ] No memory leaks (subscriptions cleanup)

#### 4. Accessibility Check

**Verify:**
- [ ] Keyboard navigation fungerer
- [ ] Focus states er synlige
- [ ] ARIA labels er korrekte
- [ ] Screen reader compatibility

#### 5. Cleanup

**Remove:**
- [ ] Test pages i `apps/web/app/test-*/` (hvis ikke længere nødvendige)
- [ ] Placeholder code
- [ ] Unused imports
- [ ] Console.log statements

### Success Criteria:

#### Automated Verification:
- [ ] Type check: `npx tsc --noEmit` - passes
- [ ] Build: `npm run build` - succeeds
- [ ] Lint: `npm run lint` - no errors
- [ ] All tests pass (hvis tests eksisterer)

#### Manual Verification:
- [ ] Alle 13 pages fungerer korrekt
- [ ] Ingen console errors
- [ ] Navigation fungerer mellem alle pages
- [ ] Data fetching fungerer på alle pages
- [ ] Protected routes fungerer
- [ ] Dynamic routes fungerer
- [ ] Performance er acceptabel
- [ ] Accessibility er i orden

---

## Testing Strategy

### Unit Tests (Future)

- Test individual page components
- Test routing logic
- Test data fetching functions

### Integration Tests (Future)

- Test page flows (auth → home → profile)
- Test protected routes
- Test dynamic routes

### Manual Testing (Current)

**Test Plan:**

1. **Navigation Test:**
   - Test alle links i Sidebar
   - Test alle links i BottomNav
   - Test navigation fra pages (buttons, links)
   - Test browser back/forward buttons

2. **Data Fetching Test:**
   - Test hver page loader korrekt
   - Test error states
   - Test empty states
   - Test real-time updates

3. **Protected Routes Test:**
   - Test redirect hvis ikke logged in
   - Test access hvis logged in
   - Test auth flow (login → redirect)

4. **Dynamic Routes Test:**
   - Test med forskellige IDs/usernames
   - Test invalid IDs (404)
   - Test navigation mellem dynamic routes

5. **Forms Test:**
   - Test auth forms
   - Test create post
   - Test filters
   - Test validation

6. **Real-time Test:**
   - Test chat updates
   - Test notification updates
   - Test subscription cleanup

---

## References

- Linear: [HUD-10](https://linear.app/huddle-world/issue/HUD-10/fase-34-migrer-pages-til-nextjs-app-router)
- Migration Plan: `.project/08-Migration_Plan.md` - Fase 3.4
- Frontend Guide: `.project/07-Frontend_Guide.md` - Page struktur
- Next.js Rules: `.cursor/rules/10-nextjs_frontend.mdc` - Next.js patterns
- HUD-9 Plan: `.project/plans/HUD-9/implementation-plan-2025-11-26-HUD-9.md` - Domain components migration

---

## Notes

### Server Components Optimization (Future)
- **VIGTIGT:** Planen bruger Client Components for nu (simpler migration, real-time requirements)
- **Optimization opportunity:** Mange pages kan konverteres til Server Components senere:
  - UserProfile page (read-only data) → Server Component med Client Component for interactions
  - JerseyDetail page (initial data) → Server Component med Client Component for like/save/bid
  - Profile page (own profile) → Server Component med Client Component for edit
- **Benefits:** Bedre performance, mindre client bundle, SEO improvements
- **When to optimize:** Efter initial migration er testet og stabil

### Error Handling Standards
- **Pattern:** Alle data fetching skal have try/catch med toast notifications
- **Sentry:** Tilføj `*Sentry.captureException(error, { tags: { page: "page-name" } })` i error handlers (når Sentry er konfigureret)
- **User-facing errors:** Brug toast med `variant: "destructive"` og specifik besked
- **Console logging:** Brug `console.error()` for debugging (ikke i production)

### Loading & Empty States
- **Loading states:** Alle data fetching skal have `loading` state og vis loading UI
- **Empty states:** Vis empty state når `data.length === 0` og `!loading`
- **Error states:** Vis empty state eller retry button ved fejl

### Subscription Cleanup
- **Pattern:** Real-time subscriptions skal returnere cleanup function
- **useEffect cleanup:** Return cleanup function direkte fra useEffect
- **Example:** `return () => { supabase.removeChannel(channel); }`

### Database Dependencies
- **KRITISK:** Supabase migrations er ikke kørt (HUD-14)
- Pages med data fetching skal håndtere PGRST205 errors gracefully
- Brug mock/empty states når database tabeller mangler
- TODO kommentarer skal markere hvad der skal opdateres når database er klar
- Se "Post-Database Migration Checklist" for opdateringer når HUD-14 er løst

### Other Notes
- Dynamic routes kræver `params` prop i Server Components ELLER `useParams()` i Client Components
- Layouts skal håndtere shared UI (Sidebar, CommandBar, BottomNav)
- Test hver page grundigt før næste (eller test samlet til sidst som beskrevet)
- Behold `src/pages/` indtil Next.js app er fuldt testet og godkendt
- Fjern test pages (`test-*/`) når migration er færdig

---

## Risk Assessment

**High Risk:**
- Routing bugs (dynamic routes, navigation)
- Data fetching issues (Supabase client/server)
- Protected routes ikke fungerer korrekt
- Real-time subscriptions ikke cleanup korrekt

**Medium Risk:**
- Performance issues (mange Client Components)
- Type errors (params, routing)
- Layout issues (spacing, positioning)

**Low Risk:**
- UI styling (Tailwind classes)
- Component imports (allerede migreret)

---

## Rollback Plan

Hvis migration fejler:

1. **Behold `src/pages/`** - eksisterende frontend fungerer stadig
2. **Revert commits** - git revert til før migration
3. **Fix issues** - fix specifikke problemer og prøv igen
4. **Gradual migration** - migrer én page ad gangen hvis nødvendigt

---

## Timeline Estimate

- **Phase 0:** 1-2 timer (foundation)
- **Phase 1:** 1-2 timer (struktur)
- **Phase 2:** 0.5 timer (NotFound)
- **Phase 3:** 2-3 timer (Auth)
- **Phase 4:** 2-3 timer (Settings, Notifications)
- **Phase 5:** 4-6 timer (Wardrobe, Marketplace, Community)
- **Phase 6:** 2-3 timer (Profile pages)
- **Phase 7:** 3-4 timer (Dynamic routes)
- **Phase 8:** 3-4 timer (Home, Messages)
- **Phase 9:** 4-6 timer (Testing & polish)

**Total:** ~22-32 timer

---

**Status:** Ready for implementation  
**Next Step:** Start Phase 0 - Foundation


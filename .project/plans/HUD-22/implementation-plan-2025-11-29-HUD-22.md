# Dynamisk Hero Carousel med Multiple Slide Types Implementation Plan

## Overview
Implementerer en dynamisk hero carousel der erstatter den statiske HeroSpotlight komponent. Carousellen viser fire forskellige slide types baseret på user data og admin control, inspireret af Sorare's approach med skiftende rectangles og dynamisk content.

## Linear Issue
**Issue:** HUD-22
**Title:** [Feature] Dynamisk Hero Carousel med Multiple Slide Types
**Priority:** High
**Status:** Backlog
**URL:** https://linear.app/huddle-world/issue/HUD-22/feature-dynamisk-hero-carousel-med-multiple-slide-types

## Current State Analysis
- **HeroSpotlight:** Statisk komponent i `apps/web/components/home/HeroSpotlight.tsx` viser hardcoded content.
- **Dashboard:** Bruger HeroSpotlight direkte i `apps/web/app/(dashboard)/page.tsx` (linje 139).
- **Carousel Component:** Embla-baseret Carousel component eksisterer allerede i `apps/web/components/ui/carousel.tsx`.
- **Data Hooks:** TanStack Query hooks eksisterer for jerseys (`useJerseys`), auctions (`useAuctions`), listings (`useListings`).
- **CountdownTimer:** Komponent eksisterer i `apps/web/components/marketplace/CountdownTimer.tsx`.
- **JerseyCard:** Komponent eksisterer i `apps/web/components/jersey/JerseyCard.tsx`.

### Key Discoveries:
- **Carousel:** Embla-carousel-react allerede installeret og Carousel component klar til brug med navigation support (arrows, dots).
- **Gradient Tokens:** Gradient tokens tilgængelige i `globals.css` (gradient-primary, gradient-accent, gradient-hero).
- **Hook Pattern:** Alle hooks følger TanStack Query pattern med `useApiRequest()` wrapper.
- **Stats Pattern:** `ActivitySnapshot.tsx` viser pattern for user stats fetching via Supabase direkte calls.
- **Follows Pattern:** Follows bruges direkte via Supabase (ingen API endpoint endnu - HUD-17).
- **Environment Variables:** NEXT_PUBLIC_ prefix pattern for client-side env vars (se `README-ENV.md`).

## Desired End State
- **Dynamic Carousel:** HeroCarousel component med Embla integration, navigation (arrows, dots indicator).
- **5 Slide Types:**
  1. User Stats Slide - User's collection stats + featured jersey fra wardrobe
  2. Upload Encouragement Slide - Vises når user ikke har nogen trøjer i wardrobe (appellerer til upload)
  3. Featured Auction Slide - Admin-controlled via `NEXT_PUBLIC_FEATURED_AUCTION_ID` env var
  4. Recommended Jersey Slide - Jersey fra followed clubs (not in wardrobe)
  5. Featured Sale Slide - Admin-controlled via `NEXT_PUBLIC_FEATURED_SALE_ID` env var
- **Data Hooks:** 5 nye hooks for slide data fetching.
- **Priority System:** Featured content først, derefter user stats/upload encouragement, derefter recommendations.
- **Loading/Error States:** Graceful handling af manglende data.
- **Responsive Design:** Desktop + iPad først, mobil version til sidst.
- **Dimensions:** Definerede størrelser og spacing for hero carousel (desktop/iPad).
- **Integration:** Erstatter HeroSpotlight i dashboard.

## What We're NOT Doing
- Vi implementerer IKKE auto-rotate carousel (kan tilføjes senere).
- Vi implementerer IKKE touch gestures ud over standard Embla support.
- Vi ændrer IKKE eksisterende API endpoints (bruger dem som de er).
- Vi tilføjer IKKE nye database tables eller migrations.
- Vi ændrer IKKE JerseyCard komponent (bruger den som den er).
- Vi implementerer IKKE admin dashboard for featured content control (bruger env vars).
- Vi fokuserer IKKE på mobil version i første iteration (kun desktop + iPad, mobil kommer i sidste fase).

## Dependencies
- ✅ **HUD-20 (Color Palette):** Gradient tokens tilgængelige i `globals.css`.
- ⚠️ **HUD-21 (Layout Optimering):** Spacing tokens kan være nyttige, men ikke påkrævet.
- ⚠️ **HUD-17 (Follows API):** Follows bruges direkte via Supabase, ikke blocker.

## Implementation Approach
1. **Phase 1:** Definer hero slider dimensioner og spacing (desktop + iPad only).
2. **Phase 2:** Carousel foundation med Embla - setup, navigation (arrows + dots indicator), basic slide rendering.
3. **Phase 3-6:** Implementér hver slide type individuelt med hooks og UI (User Stats, Upload Encouragement, Featured Auction, Recommended Jersey, Featured Sale).
4. **Phase 7:** Integration, priority sorting, fallbacks, og polish.
5. **Phase 8:** Mobil responsive version (til sidst).

## Phase 1: Hero Slider Dimensions

### Overview
Definer hero carousel dimensioner, spacing, og layout struktur for desktop og iPad. Fokus på at etablere korrekt størrelse og padding før vi bygger carousel funktionaliteten.

### Changes Required:

#### 1. Hero Slide Dimensions Specification
**File:** `apps/web/components/dashboard/hero/HeroSlide.tsx` (ny fil - skeleton)
**Changes:** Opret base slide wrapper med definerede dimensioner
```typescript
'use client'

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeroSlideProps {
  children: ReactNode;
  gradient?: string;
}

export const HeroSlide = ({ children, gradient }: HeroSlideProps) => {
  return (
    <div
      className={cn(
        // Container dimensions - Desktop + iPad
        "relative overflow-hidden rounded-3xl shadow-elevated",
        "w-full",
        
        // Height: Minimum 500px, optimal 600px for desktop/iPad
        "min-h-[500px] md:min-h-[600px]",
        
        // Padding: Responsive but focused on larger screens
        "p-8 md:p-12 lg:p-20",
        
        // Flex layout for content
        "flex flex-col justify-center",
        
        // Gradient background (will be applied via prop)
        gradient
      )}
    >
      {/* Stadium gradient overlay */}
      <div className="absolute inset-0 gradient-stadium opacity-40" />
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};
```
**Rationale:** Base slide wrapper med definerede dimensioner for desktop/iPad. Mobile padding kan justeres senere.

#### 2. Carousel Container Dimensions
**File:** `.project/plans/HUD-22/hero-dimensions.md` (ny dokumentation fil)
**Changes:** Dokumenter hero carousel dimensioner
```markdown
# Hero Carousel Dimensions

## Desktop (≥1024px)
- **Container Width:** Full width (constrained by parent container max-width `max-w-7xl` to prevent over-stretching on 27"+ screens)
- **Container Height:** min-h-[600px], optimal 600px
- **Padding:** p-20 (80px) vertical, p-12 (48px) horizontal
- **Border Radius:** rounded-3xl (24px)
- **Content Layout:** 2-column grid (md:grid-cols-2) med gap-8

## Large Screens (≥1536px / 27"+)
- **Container Width:** `max-w-[1600px]` (increased from standard 7xl if design allows, otherwise keep 7xl)
- **Container Height:** `min-h-[700px]` (scaling up for larger viewports)
- **Padding:** `p-24` (96px) vertical
- **Note:** Ensure aspect ratio remains consistent without stretching images awkwardly.

## iPad (768px - 1023px)
- **Container Width:** Full width
- **Container Height:** min-h-[600px]
- **Padding:** p-12 (48px)
- **Border Radius:** rounded-3xl (24px)
- **Content Layout:** 2-column grid (md:grid-cols-2) med gap-8

## Mobile (< 768px)
- **Will be implemented in Phase 8**
- **Note:** Fokus i Phase 1-7 er på desktop/iPad
```

**Rationale:** Dokumenter dimensioner for reference.

#### 3. Update HeroSpotlight Reference
**File:** `apps/web/components/home/HeroSpotlight.tsx` (reference check)
**Changes:** Noter eksisterende dimensioner for reference
- Current: `min-h-[500px]`, `p-12 md:p-20`
- New target: `min-h-[500px] md:min-h-[600px]`, `p-8 md:p-12 lg:p-20`

**Rationale:** Reference eksisterende dimensions for consistency.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] HeroSlide komponent har korrekte dimensioner defineret
- [ ] Padding følger specifikation (p-8 md:p-12 lg:p-20)
- [ ] Min-height er korrekt (min-h-[500px] md:min-h-[600px])
- [ ] Rounded corners følger design system (rounded-3xl)
- [ ] Dimensioner passer på desktop viewport (≥1024px)
- [ ] Dimensioner passer på iPad viewport (768px-1023px)
- [ ] Content kan centreres korrekt med flex layout

**⚠️ PAUSE HERE** - Manual approval before Phase 2

---

## Phase 2: Carousel Foundation

### Overview
Setup hero carousel komponent med Embla integration, navigation controls (arrows + dots indicator), og grundlæggende slide container struktur.

### Changes Required:

#### 1. HeroCarousel Component
**File:** `apps/web/components/dashboard/hero/HeroCarousel.tsx` (ny fil)
**Changes:** Opret main carousel wrapper komponent med dots indicator
```typescript
'use client'

import { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { HeroSlide } from "./HeroSlide";
import { useHeroSlides } from "@/lib/hooks/use-hero-slides";
import { cn } from "@/lib/utils";

export const HeroCarousel = () => {
  const { slides, isLoading } = useHeroSlides();
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-3xl shadow-elevated min-h-[500px] md:min-h-[600px] bg-card animate-pulse" />
    );
  }

  if (!slides || slides.length === 0) {
    return null; // Will be handled in Phase 7 with fallback
  }

  const showNavigation = slides.length > 1;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-elevated">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: showNavigation,
        }}
        className="w-full"
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id || index}>
              <HeroSlide gradient={slide.gradient}>
                {/* Slide content will be rendered here in later phases */}
              </HeroSlide>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {showNavigation && (
          <>
            <CarouselPrevious className="left-4 hidden md:flex" />
            <CarouselNext className="right-4 hidden md:flex" />
            
            {/* Dots Indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    index === current
                      ? "w-8 bg-primary"
                      : "w-2 bg-muted-foreground/50 hover:bg-muted-foreground"
                  )}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </Carousel>
    </div>
  );
};
```
**Rationale:** Main carousel wrapper med dots indicator, navigation arrows (desktop only).

#### 2. Update HeroSlide Component
**File:** `apps/web/components/dashboard/hero/HeroSlide.tsx`
**Changes:** Opdater for at modtage children og gradient prop
```typescript
'use client'

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeroSlideProps {
  children: ReactNode;
  gradient?: string;
}

export const HeroSlide = ({ children, gradient }: HeroSlideProps) => {
  return (
    <div
      className={cn(
        // Container dimensions - Desktop + iPad
        "relative overflow-hidden rounded-3xl shadow-elevated w-full",
        "min-h-[500px] md:min-h-[600px]",
        "p-8 md:p-12 lg:p-20",
        "flex flex-col justify-center",
        
        // Apply gradient background if provided
        gradient && `bg-gradient-to-br ${gradient}`
      )}
    >
      {/* Stadium gradient overlay */}
      <div className="absolute inset-0 gradient-stadium opacity-40" />
      
      {/* Content wrapper */}
      <div className="relative z-10 w-full">
        {children}
      </div>
    </div>
  );
};
```
**Rationale:** Opdateret for at modtage children og gradient prop.

#### 3. useHeroSlides Hook (Skeleton)
**File:** `apps/web/lib/hooks/use-hero-slides.ts` (ny fil)
**Changes:** Opret hook skeleton der senere samler alle slides
```typescript
'use client'

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";

export function useHeroSlides() {
  const { user } = useUser();
  
  // Will be implemented in later phases
  const isLoading = false;
  const slides: any[] = [];

  return { slides, isLoading };
}
```
**Rationale:** Skeleton hook der bliver udvidet i senere faser.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### Manual Verification:
- [ ] HeroCarousel komponent renders
- [ ] Carousel container har korrekte dimensioner (fra Phase 1)
- [ ] Navigation arrows vises (desktop/iPad only)
- [ ] Dots indicator vises når flere end 1 slide
- [ ] Dots indicator viser aktiv slide
- [ ] Klik på dots skifter slide
- [ ] Carousel loops korrekt når flere slides
- [ ] Loading state vises korrekt

**⚠️ PAUSE HERE** - Manual approval before Phase 3

---

## Phase 3: User Stats Slide & Upload Encouragement

### Overview
Implementer User Stats Slide der viser user's collection stats (jersey count, for sale count, active auctions) samt featured jersey fra wardrobe. Hvis user ikke har nogen trøjer i wardrobe, vis Upload Encouragement Slide der appellerer til at upload.

### Changes Required:

#### 1. useUserStats Hook
**File:** `apps/web/lib/hooks/use-user-stats.ts` (ny fil)
**Changes:** Opret hook for user stats data
```typescript
'use client'

import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { useJerseys } from "./use-jerseys";
import { useListings } from "./use-listings";
import { useAuctions } from "./use-auctions";

interface UserStats {
  jerseyCount: number;
  forSaleCount: number;
  activeAuctions: number;
  featuredJersey: {
    id: string;
    club: string;
    season: string;
    jersey_type: string;
    images: string[];
  } | null;
}

export function useUserStats() {
  const { user } = useUser();

  // Fetch user's jerseys
  const { data: jerseysData } = useJerseys(
    user?.id
      ? {
          ownerId: user.id,
          visibility: "all",
          limit: 1, // Just need one for featured
        }
      : undefined
  );

  // Fetch user's active listings
  const { data: listingsData } = useListings(
    user?.id
      ? {
          status: "active",
          limit: 1000, // Get all for count
        }
      : undefined
  );

  // Fetch user's active auctions
  const { data: auctionsData } = useAuctions(
    user?.id
      ? {
          status: "active",
          limit: 1000, // Get all for count
        }
      : undefined
  );

  const stats: UserStats | null = user && jerseysData ? {
    jerseyCount: jerseysData.items.length,
    forSaleCount: listingsData?.items.filter((l) => l.seller_id === user.id).length || 0,
    activeAuctions: auctionsData?.items.filter((a) => a.seller_id === user.id).length || 0,
    featuredJersey: jerseysData.items.length > 0 ? {
      id: jerseysData.items[0].id,
      club: jerseysData.items[0].club,
      season: jerseysData.items[0].season,
      jersey_type: jerseysData.items[0].jersey_type,
      images: jerseysData.items[0].images,
    } : null,
  } : null;

  return {
    data: stats,
    isLoading: !user || !jerseysData,
  };
}
```
**Rationale:** Hook der samler user stats fra eksisterende hooks.

#### 2. UserStatsSlide Component
**File:** `apps/web/components/dashboard/hero/slides/UserStatsSlide.tsx` (ny fil)
**Changes:** Opret slide komponent for user stats
```typescript
'use client'

import { useRouter } from "next/navigation";
import { Shirt, Store, Gavel, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStats } from "@/lib/hooks/use-user-stats";

export const UserStatsSlide = () => {
  const router = useRouter();
  const { data: stats, isLoading } = useUserStats();

  if (isLoading || !stats) {
    return null; // Don't show slide if no user or loading
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Stats Section - Left */}
      <div className="space-y-6">
        <div>
          <h2 className="text-5xl md:text-7xl font-black mb-3 text-gradient-neon uppercase tracking-tight">
            Your Collection
          </h2>
          <p className="text-muted-foreground text-xl font-medium">
            Track your jerseys and listings
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-background/20 backdrop-blur-sm border border-white/10">
            <Shirt className="w-6 h-6 text-primary mb-2" />
            <div className="text-3xl font-bold text-foreground">{stats.jerseyCount}</div>
            <div className="text-sm text-muted-foreground">Jerseys</div>
          </div>
          <div className="p-4 rounded-xl bg-background/20 backdrop-blur-sm border border-white/10">
            <Store className="w-6 h-6 text-accent mb-2" />
            <div className="text-3xl font-bold text-foreground">{stats.forSaleCount}</div>
            <div className="text-sm text-muted-foreground">For Sale</div>
          </div>
          <div className="p-4 rounded-xl bg-background/20 backdrop-blur-sm border border-white/10">
            <Gavel className="w-6 h-6 text-success mb-2" />
            <div className="text-3xl font-bold text-foreground">{stats.activeAuctions}</div>
            <div className="text-sm text-muted-foreground">Auctions</div>
          </div>
        </div>

        <Button
          onClick={() => router.push("/wardrobe")}
          className="h-14 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity shadow-neon uppercase tracking-wide"
        >
          View Wardrobe
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>

      {/* Featured Jersey - Right */}
      {stats.featuredJersey && (
        <div className="relative group">
          <div className="absolute inset-0 gradient-primary opacity-20 blur-3xl group-hover:opacity-30 transition-opacity rounded-3xl" />
          <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-neon border-2 border-primary/30 neon-border">
            <img
              src={stats.featuredJersey.images[0]}
              alt={`${stats.featuredJersey.club} ${stats.featuredJersey.season}`}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
            />
            <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-background via-background/80 to-transparent">
              <h3 className="text-2xl font-bold mb-1">{stats.featuredJersey.club}</h3>
              <p className="text-muted-foreground">{stats.featuredJersey.season} • {stats.featuredJersey.jersey_type}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```
**Rationale:** User stats slide med featured jersey, gradient background (primary → accent).

#### 3. Upload Encouragement Slide Component
**File:** `apps/web/components/dashboard/hero/slides/UploadEncouragementSlide.tsx` (ny fil)
**Changes:** Opret slide der appellerer til at upload første trøje
```typescript
'use client'

import { useRouter } from "next/navigation";
import { Upload, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const UploadEncouragementSlide = () => {
  const router = useRouter();

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* CTA Section - Left */}
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-6 shadow-glow">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" aria-hidden="true" />
            <span className="text-sm font-bold text-primary uppercase tracking-wider">Start Your Collection</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black mb-3 text-gradient-neon uppercase tracking-tight">
            Upload Your First Jersey
          </h2>
          <p className="text-muted-foreground text-xl font-medium">
            Build your collection and connect with fellow collectors
          </p>
        </div>

        <div className="space-y-4">
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">1</span>
              </div>
              <span>Add jerseys to your wardrobe</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">2</span>
              </div>
              <span>Track your collection stats</span>
            </li>
            <li className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">3</span>
              </div>
              <span>Share with the community</span>
            </li>
          </ul>

          <Button
            onClick={() => router.push("/wardrobe?action=upload")}
            className="h-14 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity shadow-neon uppercase tracking-wide w-full"
          >
            <Upload className="mr-2 w-5 h-5" />
            Upload Jersey
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Illustration/Visual - Right */}
      <div className="relative group">
        <div className="absolute inset-0 gradient-primary opacity-20 blur-3xl group-hover:opacity-30 transition-opacity rounded-3xl" />
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-neon border-2 border-primary/30 neon-border bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Upload className="w-24 h-24 text-primary/50 mx-auto animate-pulse" />
            <p className="text-muted-foreground text-sm">Upload your first jersey to get started</p>
          </div>
        </div>
      </div>
    </div>
  );
};
```
**Rationale:** Upload encouragement slide med CTA til at upload første trøje, gradient background (primary → accent).

#### 4. Update useUserStats Hook
**File:** `apps/web/lib/hooks/use-user-stats.ts`
**Changes:** Tilføj flag for om user har trøjer
```typescript
interface UserStats {
  jerseyCount: number;
  forSaleCount: number;
  activeAuctions: number;
  hasJerseys: boolean; // Add this flag
  featuredJersey: {
    id: string;
    club: string;
    season: string;
    jersey_type: string;
    images: string[];
  } | null;
}

// In hook:
const stats: UserStats | null = user && jerseysData ? {
  jerseyCount: jerseysData.items.length,
  forSaleCount: listingsData?.items.filter((l) => l.seller_id === user.id).length || 0,
  activeAuctions: auctionsData?.items.filter((a) => a.seller_id === user.id).length || 0,
  hasJerseys: jerseysData.items.length > 0, // Add flag
  featuredJersey: jerseysData.items.length > 0 ? {
    // ... existing code
  } : null,
} : null;
```
**Rationale:** Flag for at kunne vise upload encouragement når ingen trøjer.

#### 5. Update useHeroSlides Hook
**File:** `apps/web/lib/hooks/use-hero-slides.ts`
**Changes:** Tilføj UserStatsSlide eller UploadEncouragementSlide baseret på wardrobe status
```typescript
import { useUserStats } from "./use-user-stats";
// ... existing imports

export function useHeroSlides() {
  const { user } = useUser();
  const { data: userStats, isLoading: userStatsLoading } = useUserStats();
  
  // ... existing code

  const slides = useMemo(() => {
    const result = [];
    
    // User Stats Slide eller Upload Encouragement (only if user is logged in)
    if (user && userStats) {
      if (userStats.hasJerseys) {
        // User has jerseys - show stats slide
        result.push({
          id: 'user-stats',
          type: 'user-stats' as const,
          gradient: 'from-primary/20 to-accent/20',
          data: userStats,
        });
      } else {
        // User has no jerseys - show upload encouragement
        result.push({
          id: 'upload-encouragement',
          type: 'upload-encouragement' as const,
          gradient: 'from-primary/20 to-accent/20',
          data: null,
        });
      }
    }
    
    // ... rest of slides
  }, [user, userStats, featuredAuction, featuredSale, recommendedJersey]);

  return { slides, isLoading: isLoading || userStatsLoading };
}
```
**Rationale:** Conditional rendering af User Stats eller Upload Encouragement baseret på wardrobe status.

#### 6. Update HeroCarousel Component
**File:** `apps/web/components/dashboard/hero/HeroCarousel.tsx`
**Changes:** Render slide content i HeroSlide
```typescript
import { UserStatsSlide } from "./slides/UserStatsSlide";
import { UploadEncouragementSlide } from "./slides/UploadEncouragementSlide";
// ... other slide imports (to be added in later phases)

// In CarouselContent:
{slides.map((slide, index) => (
  <CarouselItem key={slide.id || index}>
    <HeroSlide gradient={slide.gradient}>
      {slide.type === 'user-stats' && <UserStatsSlide />}
      {slide.type === 'upload-encouragement' && <UploadEncouragementSlide />}
      {/* Other slide types will be added in later phases */}
    </HeroSlide>
  </CarouselItem>
))}
```
**Rationale:** Render slide content baseret på slide type.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds

#### Manual Verification:
- [ ] User Stats Slide vises for logged-in users MED jerseys
- [ ] Stats vises korrekt (jersey count, for sale, auctions)
- [ ] Featured jersey vises (hvis user har jerseys)
- [ ] Upload Encouragement Slide vises for logged-in users UDEN jerseys
- [ ] Upload CTA button navigerer korrekt
- [ ] Gradient background (primary → accent) vises korrekt
- [ ] Slides vises IKKE for logged-out users

**⚠️ PAUSE HERE** - Manual approval before Phase 4

---

## Phase 4: Featured Auction Slide

### Overview
Implementer Featured Auction Slide der viser admin-controlled featured auction via environment variable, med real-time countdown timer.

### Changes Required:

#### 1. Environment Variable Setup
**File:** `apps/web/README-ENV.md`
**Changes:** Tilføj dokumentation for featured auction env var
```markdown
### `NEXT_PUBLIC_FEATURED_AUCTION_ID`
- **Type:** String
- **Required:** No
- **Description:** ID of featured auction to display in hero carousel
- **Example:** `auction-abc123`
- **Note:** If not set, featured auction slide will not appear
```
**Rationale:** Dokumenter environment variable pattern.

#### 2. useFeaturedAuction Hook
**File:** `apps/web/lib/hooks/use-featured-auction.ts` (ny fil)
**Changes:** Opret hook for featured auction data
```typescript
'use client'

import { useQuery } from "@tanstack/react-query";
import { useAuction } from "./use-auctions";
import { useMarketplaceAuctions } from "./use-marketplace";

export function useFeaturedAuction() {
  const featuredAuctionId = process.env.NEXT_PUBLIC_FEATURED_AUCTION_ID;

  // If no env var, don't fetch
  if (!featuredAuctionId) {
    return {
      data: null,
      isLoading: false,
      error: null,
    };
  }

  // Fetch auction details
  const { data: auction, isLoading, error } = useAuction(featuredAuctionId);

  // Fetch marketplace auctions to get jersey data
  const { auctions } = useMarketplaceAuctions({});

  // Join auction with jersey data
  const auctionWithJersey = auction && auctions
    ? auctions.find((a) => a.auction_id === auction.id)
    : null;

  return {
    data: auctionWithJersey || null,
    isLoading,
    error,
  };
}
```
**Rationale:** Hook der fetcher featured auction baseret på env var.

#### 3. AuctionSlide Component
**File:** `apps/web/components/dashboard/hero/slides/AuctionSlide.tsx` (ny fil)
**Changes:** Opret slide komponent for featured auction
```typescript
'use client'

import { useRouter } from "next/navigation";
import { Timer, Gavel, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountdownTimer } from "@/components/marketplace/CountdownTimer";
import { useFeaturedAuction } from "@/lib/hooks/use-featured-auction";

export const AuctionSlide = () => {
  const router = useRouter();
  const { data: auction, isLoading } = useFeaturedAuction();

  if (isLoading || !auction) {
    return null; // Don't show slide if no featured auction
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Details Section - Left */}
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/30 backdrop-blur-sm mb-6 shadow-glow">
            <Gavel className="w-5 h-5 text-accent animate-pulse" aria-hidden="true" />
            <span className="text-sm font-bold text-accent uppercase tracking-wider">Featured Auction</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black mb-3 text-gradient-neon uppercase tracking-tight">
            {auction.club}
          </h2>
          <p className="text-muted-foreground text-xl font-medium">
            {auction.season} • {auction.jersey_type}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-black text-gradient-neon">
              {auction.currency} {(auction.current_bid || auction.starting_bid).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-4 px-5 py-3 rounded-full bg-background/60 backdrop-blur-sm border border-accent/30 neon-border shadow-neon">
            <Timer className="w-5 h-5 text-accent animate-pulse" aria-hidden="true" />
            <CountdownTimer 
              endsAt={auction.ends_at} 
              onExpire={() => {
                // Optionally refetch or hide slide
              }}
            />
          </div>
        </div>

        <Button
          onClick={() => router.push(`/marketplace?auction=${auction.auction_id}`)}
          className="h-14 text-lg font-bold gradient-accent hover:opacity-90 transition-opacity shadow-neon uppercase tracking-wide"
        >
          Place Bid
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>

      {/* Jersey Image - Right */}
      <div className="relative group">
        <div className="absolute inset-0 gradient-accent opacity-20 blur-3xl group-hover:opacity-30 transition-opacity rounded-3xl" />
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-neon border-2 border-accent/30 neon-border">
          <img
            src={auction.images[0]}
            alt={`${auction.club} ${auction.season}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
        </div>
      </div>
    </div>
  );
};
```
**Rationale:** Featured auction slide med countdown timer, gradient background (accent → success).

#### 4. Update useHeroSlides Hook
**File:** `apps/web/lib/hooks/use-hero-slides.ts`
**Changes:** Integrer AuctionSlide (allerede done i Phase 1 skeleton)
**Rationale:** Hook allerede setup, bare verify integration.

#### 5. Update HeroSlide Component
**File:** `apps/web/components/dashboard/hero/HeroSlide.tsx`
**Changes:** Tilføj AuctionSlide case
```typescript
import { AuctionSlide } from "./slides/AuctionSlide";

// In renderSlideContent:
case 'auction':
  return <AuctionSlide />;
```
**Rationale:** Conditional rendering af auction slide.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds

#### Manual Verification:
- [ ] Featured Auction Slide vises når `NEXT_PUBLIC_FEATURED_AUCTION_ID` er sat
- [ ] Countdown timer vises og opdateres i real-time
- [ ] Auction details vises korrekt (club, season, bid amount)
- [ ] Jersey image vises
- [ ] CTA button navigerer til marketplace
- [ ] Gradient background (accent → success) vises korrekt
- [ ] Slide vises IKKE når env var ikke er sat

**⚠️ PAUSE HERE** - Manual approval before Phase 5

---

## Phase 5: Recommended Jersey Slide

### Overview
Implementer Recommended Jersey Slide der viser en jersey fra followed clubs som user ikke har i deres wardrobe.

### Changes Required:

#### 1. useRecommendedJersey Hook
**File:** `apps/web/lib/hooks/use-recommended-jersey.ts` (ny fil)
**Changes:** Opret hook med algorithm: follows → jerseys → not in wardrobe → available
```typescript
'use client'

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useJerseys } from "./use-jerseys";
import { useListings } from "./use-listings";

export function useRecommendedJersey() {
  const { user } = useUser();

  // Fetch user's followed users (via Supabase directly - HUD-17 not done yet)
  const { data: followedUsers, isLoading: followsLoading } = useQuery({
    queryKey: ["follows", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      if (error) {
        console.error("Error fetching follows:", error);
        return [];
      }

      return data?.map((f) => f.following_id) || [];
    },
    enabled: !!user,
  });

  // Fetch jerseys from followed users
  const { data: jerseysData, isLoading: jerseysLoading } = useJerseys({
    limit: 100, // Fetch more to find one not in wardrobe
  });

  // Fetch user's wardrobe jerseys
  const { data: wardrobeData } = useJerseys(
    user?.id
      ? {
          ownerId: user.id,
          visibility: "all",
          limit: 1000, // Get all for comparison
        }
      : undefined
  );

  // Fetch active listings to ensure jersey is available
  const { data: listingsData } = useListings({
    status: "active",
    limit: 1000,
  });

  const recommendedJersey = useMemo(() => {
    if (!user || !followedUsers || followedUsers.length === 0) return null;
    if (!jerseysData?.items || jerseysData.items.length === 0) return null;

    const wardrobeIds = new Set(wardrobeData?.items.map((j) => j.id) || []);
    const availableJerseyIds = new Set(
      listingsData?.items.map((l) => l.jersey_id) || []
    );

    // Find jerseys from followed users that:
    // 1. User doesn't own (not in wardrobe)
    // 2. Are available for sale
    // 3. Are from followed users' collections
    const followedUserIds = new Set(followedUsers);

    const recommended = jerseysData.items.find((jersey) => {
      const isFromFollowedUser = followedUserIds.has(jersey.owner_id);
      const notInWardrobe = !wardrobeIds.has(jersey.id);
      const isAvailable = availableJerseyIds.has(jersey.id);

      return isFromFollowedUser && notInWardrobe && isAvailable;
    });

    // Get listing for this jersey
    if (recommended) {
      const listing = listingsData?.items.find(
        (l) => l.jersey_id === recommended.id
      );
      return {
        ...recommended,
        listing,
      };
    }

    return null;
  }, [user, followedUsers, jerseysData, wardrobeData, listingsData]);

  return {
    data: recommendedJersey,
    isLoading: followsLoading || jerseysLoading,
  };
}
```
**Rationale:** Hook med kompleks algorithm for at finde relevant recommended jersey.

#### 2. JerseySlide Component
**File:** `apps/web/components/dashboard/hero/slides/JerseySlide.tsx` (ny fil)
**Changes:** Opret slide komponent for recommended jersey
```typescript
'use client'

import { useRouter } from "next/navigation";
import { Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecommendedJersey } from "@/lib/hooks/use-recommended-jersey";

export const JerseySlide = () => {
  const router = useRouter();
  const { data: jersey, isLoading } = useRecommendedJersey();

  if (isLoading || !jersey) {
    return null; // Don't show slide if no recommendation
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Details Section - Left */}
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 backdrop-blur-sm mb-6 shadow-glow">
            <Star className="w-5 h-5 text-success animate-pulse" aria-hidden="true" />
            <span className="text-sm font-bold text-success uppercase tracking-wider">Recommended For You</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black mb-3 text-gradient-neon uppercase tracking-tight">
            {jersey.club}
          </h2>
          <p className="text-muted-foreground text-xl font-medium">
            {jersey.season} • {jersey.jersey_type}
          </p>
        </div>

        {jersey.listing && (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-gradient-neon">
                {jersey.listing.currency} {jersey.listing.price.toLocaleString()}
              </span>
            </div>

            <Button
              onClick={() => router.push(`/jersey/${jersey.id}`)}
              className="h-14 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity shadow-neon uppercase tracking-wide w-full"
            >
              View Jersey
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Jersey Image - Right */}
      <div className="relative group">
        <div className="absolute inset-0 gradient-success opacity-20 blur-3xl group-hover:opacity-30 transition-opacity rounded-3xl" />
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-neon border-2 border-success/30 neon-border">
          <img
            src={jersey.images[0]}
            alt={`${jersey.club} ${jersey.season}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
        </div>
      </div>
    </div>
  );
};
```
**Rationale:** Recommended jersey slide med gradient background (success → primary).

#### 3. Update useHeroSlides Hook
**File:** `apps/web/lib/hooks/use-hero-slides.ts`
**Changes:** Integrer JerseySlide (allerede done i Phase 1 skeleton)
**Rationale:** Hook allerede setup, bare verify integration.

#### 4. Update HeroSlide Component
**File:** `apps/web/components/dashboard/hero/HeroSlide.tsx`
**Changes:** Tilføj JerseySlide case
```typescript
import { JerseySlide } from "./slides/JerseySlide";

// In renderSlideContent:
case 'jersey':
  return <JerseySlide />;
```
**Rationale:** Conditional rendering af jersey slide.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds

#### Manual Verification:
- [ ] Recommended Jersey Slide vises for logged-in users med follows
- [ ] Jersey fra followed clubs vises
- [ ] Jersey IKKE i user's wardrobe
- [ ] Jersey er available for sale
- [ ] Jersey details vises korrekt
- [ ] CTA button navigerer til jersey detail
- [ ] Gradient background (success → primary) vises korrekt
- [ ] Slide vises IKKE hvis user ikke følger nogen eller ingen recommendations fundet

**⚠️ PAUSE HERE** - Manual approval before Phase 6

---

## Phase 6: Featured Sale Slide

### Overview
Implementer Featured Sale Slide der viser admin-controlled featured sale via environment variable.

### Changes Required:

#### 1. Environment Variable Setup
**File:** `apps/web/README-ENV.md`
**Changes:** Tilføj dokumentation for featured sale env var
```markdown
### `NEXT_PUBLIC_FEATURED_SALE_ID`
- **Type:** String
- **Required:** No
- **Description:** ID of featured sale listing to display in hero carousel
- **Example:** `listing-abc123`
- **Note:** If not set, featured sale slide will not appear
```
**Rationale:** Dokumenter environment variable pattern.

#### 2. useFeaturedSale Hook
**File:** `apps/web/lib/hooks/use-featured-sale.ts` (ny fil)
**Changes:** Opret hook for featured sale data
```typescript
'use client'

import { useListing } from "./use-listings";
import { useMarketplaceSales } from "./use-marketplace";

export function useFeaturedSale() {
  const featuredSaleId = process.env.NEXT_PUBLIC_FEATURED_SALE_ID;

  // If no env var, don't fetch
  if (!featuredSaleId) {
    return {
      data: null,
      isLoading: false,
      error: null,
    };
  }

  // Fetch listing details
  const { data: listing, isLoading, error } = useListing(featuredSaleId);

  // Fetch marketplace sales to get jersey data
  const { sales } = useMarketplaceSales({});

  // Join listing with jersey data
  const saleWithJersey = listing && sales
    ? sales.find((s) => s.id === listing.id)
    : null;

  return {
    data: saleWithJersey || null,
    isLoading,
    error,
  };
}
```
**Rationale:** Hook der fetcher featured sale baseret på env var.

#### 3. SaleSlide Component
**File:** `apps/web/components/dashboard/hero/slides/SaleSlide.tsx` (ny fil)
**Changes:** Opret slide komponent for featured sale
```typescript
'use client'

import { useRouter } from "next/navigation";
import { Store, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeaturedSale } from "@/lib/hooks/use-featured-sale";

export const SaleSlide = () => {
  const router = useRouter();
  const { data: sale, isLoading } = useFeaturedSale();

  if (isLoading || !sale) {
    return null; // Don't show slide if no featured sale
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Details Section - Left */}
      <div className="space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm mb-6 shadow-glow">
            <Store className="w-5 h-5 text-primary animate-pulse" aria-hidden="true" />
            <span className="text-sm font-bold text-primary uppercase tracking-wider">Featured Sale</span>
          </div>
          <h2 className="text-5xl md:text-7xl font-black mb-3 text-gradient-neon uppercase tracking-tight">
            {sale.club}
          </h2>
          <p className="text-muted-foreground text-xl font-medium">
            {sale.season} • {sale.jersey_type}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-baseline gap-3">
            <span className="text-6xl font-black text-gradient-neon">
              {sale.currency} {sale.price.toLocaleString()}
            </span>
          </div>

          <Button
            onClick={() => router.push(`/jersey/${sale.id}`)}
            className="h-14 text-lg font-bold gradient-primary hover:opacity-90 transition-opacity shadow-neon uppercase tracking-wide"
          >
            View Details
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Jersey Image - Right */}
      <div className="relative group">
        <div className="absolute inset-0 gradient-primary opacity-20 blur-3xl group-hover:opacity-30 transition-opacity rounded-3xl" />
        <div className="relative aspect-[3/4] rounded-3xl overflow-hidden shadow-neon border-2 border-primary/30 neon-border">
          <img
            src={sale.images[0]}
            alt={`${sale.club} ${sale.season}`}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
          />
        </div>
      </div>
    </div>
  );
};
```
**Rationale:** Featured sale slide med gradient background (primary → accent).

#### 4. Update useHeroSlides Hook
**File:** `apps/web/lib/hooks/use-hero-slides.ts`
**Changes:** Integrer SaleSlide (allerede done i Phase 1 skeleton)
**Rationale:** Hook allerede setup, bare verify integration.

#### 5. Update HeroSlide Component
**File:** `apps/web/components/dashboard/hero/HeroSlide.tsx`
**Changes:** Tilføj SaleSlide case
```typescript
import { SaleSlide } from "./slides/SaleSlide";

// In renderSlideContent:
case 'sale':
  return <SaleSlide />;
```
**Rationale:** Conditional rendering af sale slide.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds

#### Manual Verification:
- [ ] Featured Sale Slide vises når `NEXT_PUBLIC_FEATURED_SALE_ID` er sat
- [ ] Sale details vises korrekt (club, season, price)
- [ ] Jersey image vises
- [ ] CTA button navigerer til jersey detail
- [ ] Gradient background (primary → accent) vises korrekt
- [ ] Slide vises IKKE når env var ikke er sat

**⚠️ PAUSE HERE** - Manual approval before Phase 7

---

## Phase 7: Integration & Polish

### Overview
Integrer HeroCarousel i dashboard, implementer priority sorting, fallbacks, error states, loading states, og polish.

### Changes Required:

#### 1. Replace HeroSpotlight in Dashboard
**File:** `apps/web/app/(dashboard)/page.tsx`
**Changes:** Erstat HeroSpotlight med HeroCarousel
```typescript
// Remove:
import { HeroSpotlight } from "@/components/home/HeroSpotlight";

// Add:
import { HeroCarousel } from "@/components/dashboard/hero/HeroCarousel";

// In JSX, replace:
// <HeroSpotlight />
// With:
<HeroCarousel />
```
**Rationale:** Integrer ny carousel i dashboard.

#### 2. Enhance useHeroSlides Hook
**File:** `apps/web/lib/hooks/use-hero-slides.ts`
**Changes:** Forbedr priority sorting og error handling
```typescript
export function useHeroSlides() {
  // ... existing code

  const slides = useMemo(() => {
    const result = [];
    
    // Priority 1: Featured content (admin-controlled)
    if (featuredAuction && !featuredAuction.error) {
      result.push({
        id: 'featured-auction',
        type: 'auction' as const,
        gradient: 'from-accent/20 to-success/20',
        priority: 1,
        data: featuredAuction,
      });
    }
    
    if (featuredSale && !featuredSale.error) {
      result.push({
        id: 'featured-sale',
        type: 'sale' as const,
        gradient: 'from-primary/20 to-accent/20',
        priority: 1,
        data: featuredSale,
      });
    }
    
    // Priority 2: User Stats (only if logged in)
    if (user && userStats) {
      result.push({
        id: 'user-stats',
        type: 'user-stats' as const,
        gradient: 'from-primary/20 to-accent/20',
        priority: 2,
        data: userStats,
      });
    }
    
    // Priority 3: Recommendations (only if logged in)
    if (user && recommendedJersey) {
      result.push({
        id: 'recommended-jersey',
        type: 'jersey' as const,
        gradient: 'from-success/20 to-primary/20',
        priority: 3,
        data: recommendedJersey,
      });
    }

    // Sort by priority
    return result.sort((a, b) => (a.priority || 999) - (b.priority || 999));
  }, [user, userStats, featuredAuction, featuredSale, recommendedJersey]);

  // If no slides available, return empty array (carousel will handle fallback)
  return { slides, isLoading };
}
```
**Rationale:** Bedre priority sorting og error handling.

#### 3. Add Fallback State to HeroCarousel
**File:** `apps/web/components/dashboard/hero/HeroCarousel.tsx`
**Changes:** Tilføj fallback når ingen slides
```typescript
export const HeroCarousel = () => {
  const { slides, isLoading } = useHeroSlides();

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-3xl shadow-elevated min-h-[500px] bg-card animate-pulse" />
    );
  }

  if (!slides || slides.length === 0) {
    // Fallback: Show default HeroSpotlight or empty state
    return (
      <div className="relative overflow-hidden rounded-3xl shadow-elevated min-h-[500px] bg-card flex items-center justify-center">
        <p className="text-muted-foreground">No content available</p>
      </div>
    );
  }

  // If only one slide, don't show navigation
  const showNavigation = slides.length > 1;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-elevated">
      <Carousel
        opts={{
          align: "start",
          loop: showNavigation,
        }}
        className="w-full"
      >
        <CarouselContent>
          {slides.map((slide, index) => (
            <CarouselItem key={slide.id || index}>
              <HeroSlide slide={slide} />
            </CarouselItem>
          ))}
        </CarouselContent>
        {showNavigation && (
          <>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </>
        )}
      </Carousel>
    </div>
  );
};
```
**Rationale:** Fallback handling når ingen slides tilgængelige.

#### 4. Add Error States to Slides
**File:** `apps/web/components/dashboard/hero/slides/*.tsx`
**Changes:** Tilføj error handling i hver slide (eksempel for AuctionSlide)
```typescript
export const AuctionSlide = () => {
  const router = useRouter();
  const { data: auction, isLoading, error } = useFeaturedAuction();

  if (isLoading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !auction) {
    return null; // Don't show slide on error
  }

  // ... rest of component
};
```
**Rationale:** Graceful error handling i slides.

#### 5. Update Environment Variables Example
**File:** Create or update `.env.example` if it exists
**Changes:** Tilføj featured content env vars
```bash
# Featured Content (optional - for hero carousel)
NEXT_PUBLIC_FEATURED_AUCTION_ID=
NEXT_PUBLIC_FEATURED_SALE_ID=
```
**Rationale:** Dokumenter environment variables.

#### 6. Add Dots Indicator (Optional Enhancement)
**File:** `apps/web/components/dashboard/hero/HeroCarousel.tsx`
**Changes:** Tilføj dots indicator hvis ønsket (kan skippes hvis ikke prioritet)
**Rationale:** Bedre navigation UX.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] All tests pass (hvis tests eksisterer)

#### Manual Verification:
- [ ] HeroCarousel erstatter HeroSpotlight i dashboard
- [ ] Priority sorting virker (featured først, derefter user stats, derefter recommendations)
- [ ] Fallback state vises når ingen slides tilgængelige
- [ ] Loading states vises korrekt
- [ ] Error states håndteres gracefully (slides skjules ved error)
- [ ] Navigation vises kun når flere end 1 slide
- [ ] Responsive design virker på mobile
- [ ] Alle slides render korrekt med gradient backgrounds
- [ ] Environment variables dokumenteret i README-ENV.md

**⚠️ PAUSE HERE** - Manual approval before Phase 8

---

## Phase 8: Mobile Responsive

### Overview
Implementer mobil responsive version af hero carousel med optimeret layout, navigation, og spacing for mobile viewports.

### Changes Required:

#### 1. Update HeroSlide Mobile Styles
**File:** `apps/web/components/dashboard/hero/HeroSlide.tsx`
**Changes:** Tilføj mobil-specific spacing og layout
```typescript
export const HeroSlide = ({ children, gradient }: HeroSlideProps) => {
  return (
    <div
      className={cn(
        // Container dimensions - Mobile optimized
        "relative overflow-hidden rounded-2xl md:rounded-3xl shadow-elevated w-full",
        "min-h-[400px] sm:min-h-[450px] md:min-h-[600px]", // Reduced height on mobile
        "p-6 sm:p-8 md:p-12 lg:p-20", // Reduced padding on mobile
        "flex flex-col justify-center",
        
        // Apply gradient background if provided
        gradient && `bg-gradient-to-br ${gradient}`
      )}
    >
      {/* ... existing code ... */}
    </div>
  );
};
```
**Rationale:** Mobil-optimeret spacing og height.

#### 2. Update Carousel Navigation Mobile
**File:** `apps/web/components/dashboard/hero/HeroCarousel.tsx`
**Changes:** Mobil-optimerede navigation controls
```typescript
// Navigation arrows - hide on mobile, show swipe hint instead
{showNavigation && (
  <>
    <CarouselPrevious className="left-2 md:left-4 hidden md:flex" />
    <CarouselNext className="right-2 md:right-4 hidden md:flex" />
    
    {/* Dots Indicator - always visible */}
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
      {slides.map((_, index) => (
        <button
          key={index}
          onClick={() => api?.scrollTo(index)}
          className={cn(
            "h-2 rounded-full transition-all",
            index === current
              ? "w-8 bg-primary"
              : "w-2 bg-muted-foreground/50 hover:bg-muted-foreground"
          )}
          aria-label={`Go to slide ${index + 1}`}
        />
      ))}
    </div>
  </>
)}
```
**Rationale:** Skjul navigation arrows på mobil, brug swipe gestures i stedet.

#### 3. Update Slide Components for Mobile
**File:** `apps/web/components/dashboard/hero/slides/*.tsx`
**Changes:** Optimér slide content for mobil layout
- Skift fra 2-column grid til single column på mobil
- Reducér text størrelser
- Juster spacing og padding

**Example (UserStatsSlide):**
```typescript
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-center">
  {/* Content */}
</div>
```
**Rationale:** Single-column layout på mobil, 2-column på desktop/iPad.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds

#### Manual Verification:
- [ ] Carousel fungerer på mobil (< 768px)
- [ ] Slide content er læsbart på mobil
- [ ] Swipe gestures virker på mobil
- [ ] Dots indicator fungerer på mobil
- [ ] Navigation arrows er skjult på mobil
- [ ] Spacing og padding passer på mobil
- [ ] Text størrelser er passende på mobil
- [ ] Single-column layout bruges på mobil

**⚠️ PAUSE HERE** - Final validation before completion

---

## Testing Strategy

### Unit Tests (Future Enhancement)
- Test hooks (useHeroSlides, useFeaturedAuction, etc.)
- Test slide components rendering
- Test priority sorting logic

### Integration Tests (Future Enhancement)
- Test carousel navigation
- Test data fetching flows
- Test error handling

### Manual Testing Checklist
- [ ] **User logged in with jerseys:** User Stats Slide vises
- [ ] **User logged in with follows:** Recommended Jersey Slide vises (hvis recommendations fundet)
- [ ] **Featured Auction env var sat:** Auction Slide vises
- [ ] **Featured Sale env var sat:** Sale Slide vises
- [ ] **User logged out:** Kun featured slides vises (hvis env vars sat)
- [ ] **Ingen env vars, user logged out:** Fallback state vises
- [ ] **Multiple slides:** Navigation arrows virker
- [ ] **Single slide:** Navigation skjules
- [ ] **Mobile view:** Carousel responsive med swipe gestures, single-column layout
- [ ] **Upload Encouragement:** Vises når user ikke har jerseys i wardrobe
- [ ] **Countdown timer:** Opdateres i real-time
- [ ] **CTAs:** Alle buttons navigerer korrekt

### Performance Considerations
- Lazy loading af slide images
- Memoization af slide data
- Efficient data fetching (brug eksisterende hooks)

## References
- Linear: HUD-22
- Existing Carousel: `apps/web/components/ui/carousel.tsx`
- Existing CountdownTimer: `apps/web/components/marketplace/CountdownTimer.tsx`
- Existing JerseyCard: `apps/web/components/jersey/JerseyCard.tsx`
- Existing hooks pattern: `apps/web/lib/hooks/use-jerseys.ts`
- Gradient tokens: `apps/web/app/globals.css`
- Environment variables: `apps/web/README-ENV.md`
- Dashboard page: `apps/web/app/(dashboard)/page.tsx`

## Estimated Timeline
- **Phase 1:** 1-2 hours (dimensions only)
- **Phase 2:** 3-4 hours (carousel foundation with dots)
- **Phase 3:** 4-5 hours (user stats + upload encouragement)
- **Phase 4:** 2-3 hours (featured auction)
- **Phase 5:** 3-4 hours (recommended jersey)
- **Phase 6:** 2-3 hours (featured sale)
- **Phase 7:** 2-3 hours (integration & polish)
- **Phase 8:** 2-3 hours (mobile responsive)
- **Total:** 19-27 hours (~900 LOC)


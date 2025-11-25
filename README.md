# Huddle - Premium Football Jersey Marketplace

A Sorare-inspired platform for football jersey collectors to showcase, trade, and connect around their passion for classic and rare football kits.

## Project info

**URL**: https://lovable.dev/projects/a7723404-d14a-45f4-82e1-f14aded58ba7

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/a7723404-d14a-45f4-82e1-f14aded58ba7) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- **Frontend**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- **Backend**: Lovable Cloud (Supabase)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Real-time**: Supabase Realtime for live auctions and messaging
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for jersey images

## Recent Updates (November 25, 2025)

### 1. Search Analytics System
Implemented comprehensive search analytics to track user behavior and surface trending content:

- **Database**: Created `search_analytics` table with RLS policies
- **Tracking**: Automatic logging of all search queries with user attribution
- **Trending Searches**: Command bar displays popular searches from the last 7 days when empty
- **Insights**: Query aggregation and counting for trend analysis

**Files Modified**:
- `supabase/migrations/` - Search analytics schema
- `src/components/CommandBar.tsx` - Trending search display and query logging

---

### 2. Complete Dashboard Redesign (Sorare-Inspired)

Transformed the home dashboard from a basic layout into a premium, high-energy sports platform with modular sections and dynamic content.

#### A. Hero Spotlight Section
**Purpose**: Featured jersey showcase with premium visual treatment

**Features**:
- Full-width hero card with stadium-inspired blurred textures
- Ambient neon gradient backgrounds (cyan/blue/green)
- Large centered jersey image with dramatic lighting
- Side info panel displaying price, condition, and rarity
- Neon-accented primary CTAs
- Smooth fade-in animations

**Component**: `src/components/home/HeroSpotlight.tsx`

---

#### B. Activity Snapshot (Unified Metrics Strip)
**Purpose**: User's personal stats at a glance

**Design Evolution**: 
- Changed from individual boxes to one connected horizontal strip
- Glowing separators between metric sections
- Hover effects with scale and neon highlights

**Metrics Displayed**:
- **Wardrobe**: Total jerseys collected
- **For Sale**: Active listings count
- **Auctions**: Live auction count
- **Followers**: Weekly follower count

**Data Source**: Real-time queries to `jerseys`, `sale_listings`, `auctions`, and `follows` tables

**Component**: `src/components/home/ActivitySnapshot.tsx`

---

#### C. Quick Actions Section
**Purpose**: High-contrast action cards for core user flows

**Actions**:
1. **Upload Jersey**: Launch jersey upload modal
2. **List for Sale**: Create new sale listing
3. **Start Auction**: Begin a new auction
4. **Find Nearby**: Discover local collectors (with geolocation hint)

**Visual Design**:
- Large 2×2 card grid
- High-contrast neon gradients
- Strong iconography (Lucide icons)
- Animated hover states with glow effects
- Minimal text, maximum visual impact

**Component**: `src/components/home/QuickActions.tsx`

---

#### D. Marketplace For You Section
**Purpose**: Personalized marketplace recommendations

**Sub-sections**:
1. **Trending Now**: Hot items based on views and saves
2. **Ending Soon**: Auctions closing within 24 hours

**Features**:
- Horizontal scroll carousels
- Large jersey cards with `JerseyCard` component
- Real-time data from `sale_listings` and `auctions` tables
- "View all" CTAs to full marketplace

**Component**: `src/components/home/MarketplaceForYou.tsx`

---

#### E. Community Preview Section
**Purpose**: Social engagement preview

**Features**:
- Latest 6 posts from community feed
- User avatars and names
- Jersey images (when attached to posts)
- Like counters
- "Open Community Feed" CTA
- Animated grid layout

**Data Source**: `posts` table with joined `profiles` and `jerseys` data

**Component**: `src/components/home/CommunityPreview.tsx`

---

#### F. Right Sidebar (Sorare-Style Dynamic Panel)
**Purpose**: Real-time engagement and dynamic data hub

**Sections**:

1. **Watchlist** (Saved Jerseys)
   - User's saved items
   - Price drops highlighted
   - "Ending soon" indicators for auctions
   - Quick navigation to jersey details

2. **Live Auctions**
   - Real-time countdown timers
   - Current highest bid display
   - Auction status badges
   - Quick bid access

3. **Community Activity**
   - Recent follows
   - New jersey uploads
   - Auction wins
   - Social pulse indicators

4. **Marketplace Metrics**
   - Trending clubs
   - Most viewed jerseys
   - Recent price drops
   - Market insights

5. **Huddle News**
   - Jersey culture content
   - Platform updates
   - Classic kit spotlights
   - Community highlights

**Visibility**: 
- Hidden on mobile (< 1024px)
- Fixed sidebar on desktop
- Scrollable content area

**Component**: `src/components/home/RightSidebar.tsx`

---

### 3. Enhanced Visual Design System

Updated design tokens and utility classes for premium sports aesthetic:

#### Color System
- **Base**: Deep charcoal (`#0D0D0D`) for dark backgrounds
- **Neon Accents**: Electric blue, cyan, green (used sparingly)
- **Gradients**: 
  - `--gradient-neon`: Primary brand gradient
  - `--gradient-hero`: Epic hero section background
  - `--gradient-primary`: Subtle primary transitions
  - `--gradient-subtle`: Ambient background layers

#### Shadow System
- `--shadow-elevated`: Premium card elevation
- `--shadow-neon`: Glowing neon effect for highlights
- `--shadow-glow`: Soft ambient glow

#### Utility Classes
- `.stadium-texture`: Blurred ambient backgrounds
- `.neon-border`: Animated glowing borders
- Enhanced hover states and micro-interactions

**File**: `src/index.css`

---

### 4. Layout & Navigation Updates

#### Sticky Header
- Search button (opens CommandBar with Cmd+K)
- Notifications bell with pulse indicator
- User avatar with profile navigation
- Glassmorphism backdrop blur effect

#### Responsive Behavior
- Mobile-first with bottom navigation
- Desktop: full layout with right sidebar
- Tablet: adaptive grid layouts

**File**: `src/pages/Home.tsx`

---

## Design Philosophy

The Huddle dashboard follows Sorare's proven approach:

✅ **Modular Structure**: Clear section hierarchy  
✅ **High Contrast**: Dark backgrounds, neon highlights  
✅ **Dynamic Data**: Real-time updates and live content  
✅ **Emotional Design**: Premium sports atmosphere  
✅ **Progressive Disclosure**: From personal context → discovery → community  

---

## Database Schema Additions

### Search Analytics Table
```sql
CREATE TABLE search_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  user_id UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Indexes**: 
- `query` for aggregation
- `created_at` for time-based queries
- `user_id` for user behavior analysis

---

## Performance Optimizations

- Lazy loading for sidebar sections
- Debounced search query logging
- Efficient PostgreSQL queries with proper indexing
- React memoization for expensive computations
- Skeleton loaders for async data fetching

---

## Future Enhancements Roadmap

Based on today's foundation, potential next steps:

1. **Live Scores Section**: Real-time match scores for clubs in user's wardrobe
2. **Advanced Personalization**: ML-based recommendations
3. **Enhanced Animations**: Parallax effects, transition choreography
4. **News Section**: Curated jersey culture content
5. **Geolocation Features**: Nearby collectors and local pickup options

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/a7723404-d14a-45f4-82e1-f14aded58ba7) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

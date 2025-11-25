# Linear Workspace Setup - Huddle

Dette dokument beskriver den anbefalede struktur for Linear workspace til Huddle projektet.

## Labels (✅ Oprettet)

### Domæne Labels
- **Marketplace** - Marketplace features (listings, sales, transactions)
- **Auctions** - Auction functionality (bidding, closing, winner selection)
- **Jerseys** - Jersey management (wardrobe, upload, details, images)
- **Wardrobe** - User wardrobe features (collection management, visibility)
- **Community** - Social features (posts, feed, follows, likes, comments)
- **Messaging** - Direct messaging (conversations, messages, reactions)
- **Profile** - User profiles (settings, edit, public profile)

### Tech Stack Labels
- **Frontend** - Frontend work (React, Next.js, UI components)
- **Backend** - Backend work (API routes, MedusaJS, server logic)
- **Database** - Database work (migrations, schema changes, RLS policies)
- **API** - API design and implementation (routes, versioning, errors)
- **Infrastructure** - Infrastructure (deployment, CI/CD, monitoring, secrets)
- **Migration** - Migration work (Vite to Next.js, refactoring, restructuring)

### Type Labels (✅ Eksisterende)
- **Feature** - New features
- **Bug** - Bug fixes
- **Improvement** - Improvements to existing features

## Statuses (✅ Eksisterende)

- **Todo** - Ready to start
- **In Progress** - Currently being worked on
- **Done** - Completed
- **Backlog** - Future work
- **Canceled** - Cancelled work
- **Duplicate** - Duplicate issues

## Projekter (Opret manuelt i Linear)

### 1. Frontend Migration
**Labels:** Migration, Frontend  
**Summary:** Migrate from Vite React SPA to Next.js monorepo  
**Description:**
```
# Frontend Migration

Migrate existing Vite + React frontend to Next.js monorepo structure following the migration plan in `.project/08-Migration_Plan.md`.

## Phases
1. **Monorepo Setup** - Create workspace structure, preserve existing `src/`
2. **Next.js Setup** - Initialize Next.js app parallel to existing frontend
3. **Component Migration** - Gradually migrate components and pages
4. **API Routes** - Create backend API routes
5. **Cleanup** - Remove Vite frontend when Next.js is complete

## Tech Stack
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Shadcn UI
- TanStack Query
- React Hook Form + Zod

## Related Docs
- `.project/08-Migration_Plan.md`
- `.project/07-Frontend_Guide.md`
```

### 2. Frontend Development
**Labels:** Frontend  
**Summary:** Ongoing frontend feature development and improvements  
**Description:**
```
# Frontend Development

Ongoing frontend feature development, improvements, and enhancements after migration to Next.js is complete.

## Focus Areas
- New UI features and components
- User experience improvements
- Performance optimization
- Accessibility enhancements
- Responsive design improvements
- Component library expansion

## Key UI Areas (from Frontend Guide)
- Dashboard/Home - Feed, recommended jerseys, auctions, activity sidebar
- Wardrobe - User's jersey collection grid and details
- Marketplace - Sale listings with filters and sorting
- Auctions - Live/upcoming auctions with countdown and bid history
- Jersey Detail - Combined wardrobe view, sale status, auctions, social interaction
- Profile - User profile with stats, wardrobe preview, For Sale, Auctions, Posts
- Messaging - Inbox + conversation view linked to jerseys/listings
- Auth + Onboarding - "Upload your first shirt" experience after signup

## Tech Stack
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Shadcn UI
- TanStack Query
- React Hook Form + Zod

## Related Docs
- `.project/07-Frontend_Guide.md`
- `.project/10-nextjs_frontend.mdc`
- `.project/12-forms_actions_validation.mdc`
```

### 3. Backend API
**Labels:** Backend, API  
**Summary:** Implement Next.js API routes and MedusaJS integration  
**Description:**
```
# Backend API

Implement backend API routes following `.project/05-API_Design.md` and integrate MedusaJS for commerce functionality.

## Key Areas
- API routes in `apps/web/app/api/v1/`
- MedusaJS integration for marketplace
- Stripe Connect for payments
- Clerk authentication verification
- Supabase server-side clients

## Related Docs
- `.project/05-API_Design.md`
- `.project/06-Backend_Guide.md`
- `.project/03-Tech_Stack.md`
```

### 4. Database Schema
**Labels:** Database  
**Summary:** Supabase migrations, schema changes, and RLS policies  
**Description:**
```
# Database Schema

Manage database schema, migrations, and Row Level Security (RLS) policies for Supabase.

## Key Areas
- Supabase migrations in `supabase/migrations/`
- Schema changes and refinements
- RLS policy implementation
- MedusaJS schema integration planning
- Performance optimization

## Related Docs
- `.project/04-Database_Schema.md`
- `.project/30-database_postgres.mdc`
- `.project/32-supabase_patterns.mdc`
```

### 5. Marketplace Features
**Labels:** Marketplace, Auctions  
**Summary:** Marketplace functionality - listings, auctions, transactions  
**Description:**
```
# Marketplace Features

Build and enhance marketplace functionality including listings, auctions, and transaction handling.

## Key Features
- Sale listings (fixed price)
- Auctions with bidding
- Transaction handling
- Search and discovery
- Price negotiation

## Related Tables
- `sale_listings`
- `auctions`
- `bids`
- `transactions`
- `jerseys`

## Related Docs
- `.project/04-Database_Schema.md`
```

### 6. Community Features
**Labels:** Community, Messaging, Profile  
**Summary:** Social features - feed, posts, follows, messaging  
**Description:**
```
# Community Features

Build social and community features to engage users around jersey collecting.

## Key Features
- Feed and posts
- Follow/unfollow users
- Likes and comments
- Direct messaging
- Notifications
- User profiles

## Related Tables
- `posts`
- `follows`
- `likes`
- `comments`
- `conversations`
- `messages`
- `notifications`

## Related Docs
- `.project/04-Database_Schema.md`
```

### 7. Wardrobe Management
**Labels:** Jerseys, Wardrobe  
**Summary:** Jersey wardrobe features - upload, management, visibility  
**Description:**
```
# Wardrobe Management

Features for users to manage their jersey collections.

## Key Features
- Upload jerseys with images
- Wardrobe organization
- Visibility settings (public/private)
- Jersey details and metadata
- Saved jerseys/watchlist

## Related Tables
- `jerseys`
- `saved_jerseys`

## Related Docs
- `.project/04-Database_Schema.md`
```

## Issue Naming Convention

Brug følgende format for issue titles:
- `[Domain] [Feature Name]` - fx "Marketplace: Add advanced filtering"
- `[Tech] [Task]` - fx "Frontend: Migrate JerseyCard component"
- `[Type] [Description]` - fx "Bug: Auction countdown not updating"

## Label Kombinationer

Typiske label kombinationer:
- **Feature work:** Feature + Domain label + Tech label (fx Feature, Marketplace, Frontend)
- **Bug fixes:** Bug + Domain label + Tech label (fx Bug, Auctions, Backend)
- **Migration:** Migration + Tech label (fx Migration, Frontend)
- **Infrastructure:** Infrastructure + relevant tech label

## Workflow

1. **Opret issue** med relevante labels
2. **Tildel projekt** baseret på hovedområde
3. **Sæt status** til Todo når klar til arbejde
4. **Opdater status** til In Progress når arbejdet starter
5. **Markér Done** når færdig og merged

## Noter

- **Frontend Migration** projektet er tidsbegrænset - når migrationen er færdig, flyttes løbende frontend arbejde til **Frontend Development**
- Projekter kan have flere labels for bedre søgbarhed og filtrering
- Brug labels konsekvent for at opbygge god historik og tracking


# Research: AI Vision ved Jersey Upload

**Dato:** 2025-01-30  
**Feature:** Automatisk metadata-ekstraktion ved jersey upload med OpenAI Vision + Embeddings  
**Mål:** Springe step 2 og 3 over, afslutte ved step 4 hurtigere

---

## Executive Summary

Dette er en research-rapport for implementering af AI Vision ved jersey upload. Vi har allerede:
- ✅ Metadata matching infrastructure (Edge Function: `match-jersey-metadata`)
- ✅ Database schema med foreign keys (club_id, player_id, season_id)
- ✅ 4-step upload flow (Image Upload → Jersey Info → Player Print → Condition Notes)
- ✅ Supabase Storage til billeder

**Mangler:**
- ❌ OpenAI Vision integration
- ❌ Embedding generation og storage
- ❌ Template matching system
- ❌ Vision extraction Edge Function
- ❌ Database schema for embeddings (jersey_images, kit_templates)

---

## Step 1: Eksisterende Upload Flow

### Nuværende Flow

**Komponent:** `apps/web/components/jersey/UploadJersey.tsx`

**4 Steps:**
1. **ImageUploadStep** - Upload 1-10 billeder, drag-to-reorder, første billede = cover
2. **JerseyInfoStep** - Club, season, jersey_type input med autocomplete
3. **PlayerPrintStep** - Player name/number + badge selection + metadata matching
4. **ConditionNotesStep** - Condition rating + notes + visibility

**Flow Pattern:**
```typescript
// State management
const [step, setStep] = useState(1);
const [images, setImages] = useState<ImageFile[]>([]);
const [clubId, setClubId] = useState<string>('');
const [playerId, setPlayerId] = useState<string>('');
const [seasonId, setSeasonId] = useState<string>('');

// Submit handler
const handleSubmit = async () => {
  // 1. Upload images via API route (/api/v1/jerseys/upload-image)
  // 2. Create jersey via API with metadata FK references
};
```

**Key Observations:**
- Images uploads til Supabase Storage bucket: `jersey_images`
- Form bruger React Hook Form + Zod validation
- Metadata matching sker i Step 3 (PlayerPrintStep) via `useMatchJerseyMetadata` hook
- Billeder gemmes som URL array i `jerseys.images`

**Upload API Route:** `apps/web/app/api/v1/jerseys/upload-image/route.ts`
- Validates file (5MB max, image type only)
- Uploads til `jersey_images/{userId}/{fileName}` ⚠️ **PROBLEM:** jersey_id eksisterer ikke endnu
- Returns public URL

**⚠️ KRITISK PROBLEM: Upload Flow & Storage Struktur**

Nuværende flow har strukturelle problemer, der skal løses før Vision AI implementation:

### Problem 1: Images Uploades Før Jersey Eksisterer

**Nuværende flow:**
```
1. User uploader images → gemmes i `{userId}/{fileName}`
2. Jersey oprettes EFTER upload → jersey.id genereres da
3. Images gemmes som URL array i `jerseys.images`
```

**Issue:** Jersey ID eksisterer ikke når images uploades, så vi kan ikke:
- Organisere images efter jersey
- Linke images direkte til jersey i database
- Gemme metadata pr. image (view_type, embedding, etc.)

### Problem 2: Storage Struktur

**Nuværende:** `jersey_images/{userId}/{fileName}`
- Alle users images i én folder
- Svært at finde alle images for en specifik jersey
- Svært at slette alle images når jersey slettes

**Foreslået:** `jersey_images/{jersey_id}/{fileName}`
- Organiseret per jersey
- Nem cleanup ved jersey deletion
- Klar struktur for Vision analysis

### Problem 3: Database Normalisering

**Nuværende:**
- `jerseys.images TEXT[]` - bare URL array
- Ingen metadata pr. image (view_type, embedding, etc.)
- Ingen relationelle forbindelser

**Foreslået:**
- Opret `jersey_images` tabel
- Hver image har sin egen row med metadata
- FK til jersey_id for cleanup

### Løsningsforslag

**Option 1: Draft Jersey Pattern (ANBEFALET)**
1. Opret jersey som "draft" først (generer jersey_id)
2. Upload images til `{jersey_id}/{fileName}`
3. Run Vision analysis
4. Update jersey med Vision results + finalize

**Fordele:**
- Bedre UX (user kan starte, gemme, fortsætte senere)
- Jersey_id eksisterer fra start
- Klar struktur for cleanup

**⚠️ CLEANUP STRATEGI FOR DRAFT JERSEYS:**

**Problem:** Hvad hvis brugeren fortryder upload? Skal vi slette draft jersey og images?

**Løsning 1: Automatic Cleanup (Cron Job)**
- Scheduled job der sletter draft jerseys > 24 timer gamle
- CASCADE delete fra `jersey_images` sletter automatisk images
- Storage cleanup: slet folder `{jersey_id}/` når jersey slettes

**Løsning 2: Manual Cleanup (Modal Close)**
- Når upload modal lukkes uden submit → slet draft jersey
- Frontend trigger cleanup endpoint
- Immediate deletion, ingen ventetid

**Løsning 3: Hybrid Approach (ANBEFALET)**
- Manual cleanup hvis modal lukkes uden submit (immediate)
- Cron job for abandoned drafts (24 timer)
- User kan også manuelt slette fra "Drafts" sektion

**Implementation:**
```sql
-- Cleanup function (kaldt fra cron job eller manual)
CREATE OR REPLACE FUNCTION cleanup_abandoned_drafts()
RETURNS void AS $$
BEGIN
  -- Slet draft jerseys > 24 timer gamle
  DELETE FROM public.jerseys
  WHERE status = 'draft'
  AND created_at < now() - interval '24 hours';
  
  -- CASCADE delete sletter automatisk jersey_images rows
  -- Storage cleanup kan gøres via Edge Function
END;
$$ LANGUAGE plpgsql;
```

**Edge Function: `cleanup-jersey-storage`**
- Find orphaned Storage folders (jersey_id eksisterer ikke i DB)
- Eller: Slet Storage folder når jersey slettes (via trigger/webhook)

**Anbefaling:** Hybrid approach - immediate cleanup + cron job som backup

---

## Step 2: Database Schema Analysis

### ⚠️ VIGTIGT: Strukturelle Ændringer Påkrævet

**Nuværende problemer:**
1. `jerseys.images` er TEXT[] array - ingen normaliseret struktur
2. Storage struktur er by userId, ikke by jersey_id
3. Ingen `jersey_images` tabel - kan ikke gemme metadata pr. image

### Eksisterende Schema (fra Supabase MCP)

**`public.jerseys` tabel (verificeret):**
```sql
- id UUID PRIMARY KEY (gen_random_uuid())
- owner_id TEXT (Clerk user ID, ikke auth.users FK)
- club TEXT (user text - primary truth)
- season TEXT (user text - primary truth)
- jersey_type TEXT
- player_name TEXT (nullable)
- player_number TEXT (nullable)
- competition_badges TEXT[] (nullable)
- condition_rating INTEGER (nullable, 1-10)
- notes TEXT (nullable)
- visibility TEXT (default: 'public')
- images TEXT[] -- ⚠️ Array of URLs - skal ændres til normaliseret struktur
- created_at TIMESTAMP
- updated_at TIMESTAMP
- club_id TEXT (FK → metadata.clubs.id, nullable)
- player_id TEXT (FK → metadata.players.id, nullable)
- season_id UUID (FK → metadata.seasons.id, nullable)
```

**⚠️ VIGTIGT:** `owner_id` er TEXT (Clerk ID), ikke UUID FK til auth.users!

**`metadata` schema (verificeret):**
- `metadata.clubs` - 124 rows, Transfermarkt klub data
- `metadata.seasons` - 28 rows, Season data
- `metadata.players` - 4107 rows, Spiller data
- `metadata.player_contracts` - 2858 rows, Jersey nummer mapping
- `metadata.club_seasons` - 218 rows, Club/season relationships
- `metadata.competitions` - 6 rows

**Ingen `jersey_images` tabel eksisterer endnu** - skal oprettes

### Nye Schema Requirements (fra PRD + Strukturelle Ændringer)

**1. `jersey_images` tabel (NY - skal oprettes):**
```sql
CREATE TABLE public.jersey_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jersey_id UUID NOT NULL REFERENCES public.jerseys(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- For cleanup: "jersey_id/filename.jpg"
  view_type TEXT, -- 'front', 'back', 'detail', 'other' (fra Vision)
  sort_order INTEGER DEFAULT 0, -- For reordering (første = cover)
  image_embedding vector(3072), -- OpenAI embedding dimension (nullable)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_jersey_images_jersey_id ON public.jersey_images(jersey_id);
CREATE INDEX idx_jersey_images_sort_order ON public.jersey_images(jersey_id, sort_order);
-- Embedding index (kun hvis pgvector enabled)
CREATE INDEX idx_jersey_images_embedding ON public.jersey_images 
  USING ivfflat (image_embedding vector_cosine_ops) 
  WITH (lists = 100) 
  WHERE image_embedding IS NOT NULL;
```

**2. Vision columns til `jerseys` tabel:**
```sql
-- Add Vision metadata columns to existing jerseys table
ALTER TABLE public.jerseys 
ADD COLUMN vision_raw JSONB, -- Full Vision API response
ADD COLUMN vision_confidence FLOAT, -- Overall confidence score (0-100)
ADD COLUMN status TEXT DEFAULT 'draft'; -- 'draft', 'published', 'archived'

-- Index for draft jerseys (for cleanup jobs)
CREATE INDEX idx_jerseys_status ON public.jerseys(status, created_at);
```

**3. Migration Strategy:**

**Deprecate `images` array:**
- Keep `jerseys.images` for backward compatibility (nullable)
- New code uses `jersey_images` tabel
- Eventually migrate existing data og remove column

**3. `kit_templates` tabel (ny):**
```sql
CREATE TABLE metadata.kit_templates (
  id UUID PRIMARY KEY,
  club_id TEXT REFERENCES metadata.clubs(id),
  player_id TEXT REFERENCES metadata.players(id),
  season_id UUID REFERENCES metadata.seasons(id),
  kit_type TEXT, -- 'Home', 'Away', etc.
  image_embedding vector(3072),
  example_jersey_id UUID REFERENCES public.jerseys(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_kit_templates_embedding ON metadata.kit_templates
  USING ivfflat (image_embedding vector_cosine_ops);
```

**Note:** pgvector extension skal være enabled i Supabase.

---

## Step 3: Eksisterende Edge Function Patterns

### Pattern: `match-jersey-metadata`

**Location:** `supabase/functions/match-jersey-metadata/index.ts`

**Pattern Structure:**
```typescript
Deno.serve(async (req) => {
  // 1. CORS handling
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  
  // 2. PostgreSQL connection
  const pgClient = new Client(getPostgresConnectionString());
  await pgClient.connect();
  
  // 3. Request validation
  const body = await req.json();
  // ... validate
  
  // 4. Main logic (try/catch wrapped)
  try {
    // Step-by-step processing
    // Returns structured response
  } catch (error) {
    // Error handling
  } finally {
    await pgClient.end();
  }
});
```

**Key Patterns:**
- ✅ Direct PostgreSQL connection for complex queries
- ✅ Supabase client for storage/auth operations
- ✅ Structured response with confidence scores
- ✅ Error handling with partial results
- ✅ Logging for debugging (`console.log`)

**Environment Variables:**
- `SUPABASE_URL` (auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-set)
- `DB_PASSWORD` (manual - required for PostgreSQL)
- `TRANSFERMARKT_API_URL` (optional)

---

## Step 4: Vision Extraction Requirements

### PRD Vision JSON Schema

```typescript
interface VisionResult {
  club: {
    name: string | null;
    confidence: number;
  };
  kit: {
    type: string | null; // 'Home', 'Away', etc.
    season_guess: string | null;
    confidence: number;
  };
  player: {
    name: string | null;
    number: string | null;
    confidence: number;
  };
  badge: {
    type: string | null;
    confidence: number;
  };
  view_type: string | null; // 'front', 'back', 'detail'
}
```

### Embedding Strategy (fra PRD)

**Flow:**
1. Generate embedding for cover image
2. Compare with `kit_templates` via pgvector (cosine similarity)
3. If similar (>0.85 threshold) → skip Vision, use template metadata
4. Else → run Vision → create new template if unique

**Embedding Model:**
- OpenAI `text-embedding-3-large` (3072 dimensions)
- OR image embedding model (hvis OpenAI har det)

---

## Step 5: Image Processing

### Eksisterende Image Handling

**Upload:** `apps/web/app/api/v1/jerseys/upload-image/route.ts`
- Accepts File object
- Validates (5MB, image type)
- Uploads to Supabase Storage
- No resizing currently

**PRD Requirement:**
- Resize images to 1024px (max dimension) before Vision analysis
- Keep original for storage

**Pattern to Follow:**
- Image processing in Edge Function (server-side)
- Use Deno image libraries or fetch + process
- Consider Sharp library (if available in Deno runtime)

---

## Step 5.5: Storage Struktur & RLS Policies

### Nuværende Storage Policy

**Bucket:** `jersey_images` (public)

**RLS Policies (nuværende):**
```sql
-- Upload policy: Users kan uploade til deres egen userId folder
CREATE POLICY "Users can upload jersey images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'jersey_images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Problem:** Policy checker `auth.uid()` men `jerseys.owner_id` er TEXT (Clerk ID), ikke UUID!

### Nye Storage Policies (jersey_id struktur)

**⚠️ VIGTIGT: Edge Functions vs API Routes**

**Hvorfor Edge Functions i stedet for API Routes?**

**Fordele ved Edge Functions:**
- ✅ **Nærmere til Storage** - Lavere latency, direkte adgang
- ✅ **Bedre isolation** - Heavy image processing blokerer ikke Next.js
- ✅ **Scalability** - Uafhængig scaling, ikke bundet til Next.js
- ✅ **Cost efficiency** - Betaler kun for execution time
- ✅ **Native Supabase integration** - Direkte adgang til Storage, DB

**Nuværende pattern:**
- Upload: API route → service role client
- Bedre: Edge Function → direkte Storage access

**Anbefaling:** Brug Edge Functions for:
1. Image upload (`upload-jersey-image`)
2. Vision analysis (`analyze-jersey-vision`)
3. Storage cleanup (`cleanup-jersey-storage`)

**API Routes kun for:**
- Simple CRUD operations
- Frontend form handling
- Clerk auth integration (hvis nødvendig)

**Option 1: Edge Function Upload (ANBEFALET)**
- Edge Function håndterer upload direkte
- Verificer jersey ownership i Edge Function
- Upload til `{jersey_id}/{fileName}` struktur

**Option 2: RLS med Jersey Check** (ikke anbefalet pga. Clerk ID mismatch)
```sql
-- Problem: owner_id er TEXT (Clerk ID), auth.uid() er UUID
-- Kræver mapping eller service role
```

**Anbefaling:** Edge Function med ownership verification - bedre pattern

### Storage Path Struktur

**Fra:** `jersey_images/{userId}/{fileName}`  
**Til:** `jersey_images/{jersey_id}/{fileName}`

**Fordele:**
- Organiseret per jersey
- Nem cleanup (CASCADE delete fra jersey_images tabel)
- Klar struktur for Vision analysis
- Bedre til migrations/splits

**Migration:** Eksisterende images kan flyttes eller forblive i userId folders (backward compatibility)

---

## Step 6: Integration Points

### A. Edge Function: `analyze-jersey-vision`

**Purpose:** Analyze uploaded jersey images with OpenAI Vision

**Input:**
```typescript
interface AnalyzeVisionRequest {
  imageUrls: string[]; // Array of Supabase Storage URLs
  userId: string;
}
```

**Processing:**
1. Download images from Storage
2. Resize to 1024px (if needed)
3. Generate embedding for cover image
4. Check kit_templates similarity
5. If no match → Run Vision on all images
6. Combine results from multiple images
7. Map to DB IDs via `match-jersey-metadata`
8. Return combined results

**Output:**
```typescript
interface AnalyzeVisionResponse {
  vision: VisionResult;
  matched: {
    clubId: string | null;
    seasonId: string | null;
    playerId: string | null;
  };
  confidence: {
    club: number;
    season: number;
    player: number;
  };
  embedding: number[]; // For storage
}
```

### B. Upload Flow Integration

**Modified Flow:**
1. **Step 1: Upload Images** (no change)
   - User uploads images
   - Images stored in Supabase Storage
   - User selects cover image

2. **NEW: Auto-Analysis Trigger**
   - After Step 1, automatically call `analyze-jersey-vision` Edge Function
   - Show loading state: "Analyzing jersey images..."
   - Store results in component state

3. **Step 2: Jersey Info** (auto-filled)
   - Pre-fill club, season, jersey_type from Vision
   - User can edit/confirm
   - Skip if confidence high (>90%)

4. **Step 3: Player Print** (auto-filled)
   - Pre-fill player name/number from Vision
   - Show badge suggestions from Vision
   - User can edit/confirm
   - Skip if confidence high (>90%)

5. **Step 4: Condition Notes** (no change)
   - User sets condition + notes
   - Submit

### C. Frontend Hook: `useAnalyzeJerseyVision`

**Pattern:** Similar to `useMatchJerseyMetadata`

```typescript
export function useAnalyzeJerseyVision(imageUrls: string[] | null) {
  return useQuery({
    queryKey: ['analyze-vision', imageUrls],
    queryFn: async () => {
      const response = await fetch('/api/v1/jerseys/analyze-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls }),
      });
      return response.json();
    },
    enabled: !!imageUrls && imageUrls.length > 0,
  });
}
```

---

## Step 7: Reusable Components & Services

### A. Existing Services

**`MetadataMatchService`** (`apps/web/lib/services/metadata-match-service.ts`)
- Calls `match-jersey-metadata` Edge Function
- ✅ Can reuse for mapping Vision results to DB IDs

**Pattern:**
```typescript
class MetadataMatchService {
  async matchMetadata(input: MatchJerseyMetadataRequest): Promise<MatchJerseyMetadataResponse>
}
```

### B. New Services Needed

**`VisionAnalysisService`**
- Location: `apps/web/lib/services/vision-analysis-service.ts`
- Wraps `analyze-jersey-vision` Edge Function
- Handles errors, retries

**`EmbeddingService`**
- Location: `apps/web/lib/services/embedding-service.ts`
- Generates embeddings via OpenAI API
- Caches results

### C. UI Components

**Existing:** Loading states, error handling, form pre-filling
- ✅ `Loader2` spinner component
- ✅ Toast notifications
- ✅ Form pre-fill via `form.setValue()`

**New Components:**
- **VisionConfidenceIndicator** - Show confidence scores
- **VisionResultsPreview** - Preview extracted metadata before confirmation

---

## Step 8: Database Migrations

### Migration 1: Enable pgvector

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Migration 2: Create jersey_images table

```sql
CREATE TABLE public.jersey_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jersey_id UUID REFERENCES public.jerseys(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  view_type TEXT, -- 'front', 'back', 'detail', 'other'
  image_embedding vector(3072),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_jersey_images_jersey_id ON public.jersey_images(jersey_id);
CREATE INDEX idx_jersey_images_embedding ON public.jersey_images 
  USING ivfflat (image_embedding vector_cosine_ops) 
  WITH (lists = 100) 
  WHERE image_embedding IS NOT NULL;
```

### Migration 3: Add Vision columns to jerseys

```sql
ALTER TABLE public.jerseys 
ADD COLUMN vision_raw JSONB,
ADD COLUMN vision_confidence FLOAT;

CREATE INDEX idx_jerseys_vision_confidence ON public.jerseys(vision_confidence) 
WHERE vision_confidence IS NOT NULL;
```

### Migration 4: Create kit_templates table

```sql
CREATE TABLE metadata.kit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT REFERENCES metadata.clubs(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES metadata.players(id) ON DELETE SET NULL,
  season_id UUID REFERENCES metadata.seasons(id) ON DELETE SET NULL,
  kit_type TEXT, -- 'Home', 'Away', 'Third', 'GK', etc.
  image_embedding vector(3072) NOT NULL,
  example_jersey_id UUID REFERENCES public.jerseys(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_kit_templates_embedding ON metadata.kit_templates
  USING ivfflat (image_embedding vector_cosine_ops) 
  WITH (lists = 100);

CREATE INDEX idx_kit_templates_club_season ON metadata.kit_templates(club_id, season_id, kit_type);
CREATE INDEX idx_kit_templates_usage_count ON metadata.kit_templates(usage_count DESC);
```

---

## Step 9: Implementation Phases

### ⚠️ PHASE 0: Strukturelle Ændringer (KRITISK - skal gøres først!)

**Mål:** Fix upload flow og database struktur før Vision implementation

**Files:**
- `supabase/migrations/YYYYMMDDHHMMSS_create_jersey_images_table.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_add_vision_columns_to_jerseys.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_add_status_column.sql` (draft status)
- `supabase/migrations/YYYYMMDDHHMMSS_create_cleanup_function.sql` (cleanup abandoned drafts)
- `supabase/functions/upload-jersey-image/index.ts` (ny - Edge Function for upload)
- `supabase/functions/cleanup-jersey-storage/index.ts` (ny - cleanup orphaned images)
- `apps/web/app/api/v1/jerseys/create-draft/route.ts` (ny - opret draft jersey via API)
- `apps/web/app/api/v1/jerseys/cancel-draft/route.ts` (ny - cleanup ved cancel)
- `apps/web/components/jersey/UploadJersey.tsx` (modificer - draft pattern + cleanup)

**Changes:**
1. Create `jersey_images` tabel (normaliseret struktur)
2. Add Vision columns til `jerseys` (vision_raw, vision_confidence, status)
3. Create draft jersey endpoint (generer jersey_id før upload)
4. **Create Edge Function for upload** (`upload-jersey-image`) - bedre end API route
5. Update Storage struktur til `{jersey_id}/{fileName}`
6. Create cleanup function (abandoned drafts + Storage)
7. Update UploadJersey component (draft pattern + cleanup ved cancel)
8. Setup cron job eller manual cleanup trigger

**Cleanup Strategy:**
- Manual cleanup: Når modal lukkes uden submit
- Automatic cleanup: Cron job for drafts > 24 timer gamle
- Storage cleanup: Edge Function sletter folder når jersey slettes

**Complexity:** High (structural changes)  
**Risk:** Medium (breaking changes til upload flow)  
**Time:** 8-10 hours (inkl. cleanup strategi)

**Key Decisions:**
- ✅ Edge Functions for upload (ikke API routes)
- ✅ Draft jersey pattern med cleanup
- ✅ Hybrid cleanup (manual + cron job)

---

### Phase 1: Database & Schema Setup (~100 LOC)
**Files:**
- `supabase/migrations/YYYYMMDDHHMMSS_enable_pgvector.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_add_jersey_images_table.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_add_vision_columns.sql`
- `supabase/migrations/YYYYMMDDHHMMSS_create_kit_templates.sql`

**Complexity:** Low  
**Risk:** Low  
**Time:** 2-3 hours

---

### Phase 2: Vision Edge Function (~400 LOC)
**Files:**
- `supabase/functions/analyze-jersey-vision/index.ts`
- `supabase/functions/analyze-jersey-vision/README.md`

**Features:**
- Image download from Storage
- Image resizing (1024px)
- OpenAI Vision API integration
- Embedding generation
- Template matching (pgvector)
- Metadata mapping via `match-jersey-metadata`
- Error handling

**Complexity:** High  
**Risk:** Medium (API costs, rate limits)  
**Time:** 8-12 hours

---

### Phase 3: Frontend Integration (~200 LOC)
**Files:**
- `apps/web/lib/services/vision-analysis-service.ts`
- `apps/web/hooks/use-analyze-jersey-vision.ts`
- `apps/web/components/jersey/upload-steps/VisionAnalysisStep.tsx` (optional)
- `apps/web/app/api/v1/jerseys/analyze-vision/route.ts`

**Features:**
- Hook for calling Edge Function
- Auto-trigger after Step 1
- Pre-fill form fields
- Show confidence scores
- Allow user confirmation/edit

**Complexity:** Medium  
**Risk:** Low  
**Time:** 4-6 hours

---

### Phase 4: Template System (~150 LOC)
**Files:**
- `supabase/functions/create-kit-template/index.ts` (optional - kan være i analyze function)
- Logic for creating/updating templates

**Features:**
- Create template after Vision if unique
- Update usage_count
- Query similar templates

**Complexity:** Medium  
**Risk:** Low  
**Time:** 3-4 hours

---

## Step 10: Summary & Recommendations

### Key Findings

**✅ What Exists:**
- Metadata matching infrastructure ready
- Upload flow med 4 steps
- Edge Function patterns established
- Database schema with FK references
- Image upload til Storage

**⚠️ What's Missing:**
- OpenAI Vision API integration
- Embedding generation
- pgvector extension setup
- Template matching system
- Vision extraction Edge Function

**📋 Dependencies:**
- OpenAI API key (env variable)
- pgvector extension in Supabase
- Image processing library (Sharp eller native)

---

### Recommended Approach

**Architecture:**
```
User uploads images (Step 1)
  ↓
Trigger analyze-jersey-vision Edge Function
  ↓
1. Generate embedding for cover image
2. Check kit_templates similarity (pgvector)
3. If similar → use template, skip Vision
4. Else → Run Vision on all images
5. Combine results
6. Map to DB IDs (match-jersey-metadata)
  ↓
Pre-fill form (Step 2 & 3)
  ↓
User confirms/edits → Submit (Step 4)
```

**Edge Function Structure:**
```
supabase/functions/analyze-jersey-vision/
├── index.ts              # Main function
├── vision.ts             # OpenAI Vision logic
├── embedding.ts          # Embedding generation
├── template.ts           # Template matching
└── README.md
```

---

### Implementation Phases

**Phase 1: Foundation** (~100 LOC, 2-3 hours)
- Enable pgvector extension
- Create database migrations
- Add Vision columns

**Phase 2: Vision Function** (~400 LOC, 8-12 hours)
- Build Edge Function
- Integrate OpenAI Vision API
- Embedding generation
- Template matching

**Phase 3: Frontend** (~200 LOC, 4-6 hours)
- Service layer
- Hook integration
- Auto-fill form
- UI polish

**Phase 4: Templates** (~150 LOC, 3-4 hours)
- Template creation logic
- Usage tracking

**Total Estimate:** ~1050 LOC, 23-33 hours

**Including Phase 0 (structural changes):**
- Phase 0: Strukturelle ændringer (6-8 timer)
- Phase 1: Database setup (2-3 timer)
- Phase 2: Vision Edge Function (8-12 timer)
- Phase 3: Frontend integration (4-6 timer)
- Phase 4: Template system (3-4 timer)

**Complexity:** High  
**Risk:** Medium (API costs, accuracy)  
**Timeline:** 3-4 days

---

### Files to Create/Modify

**Phase 0 - Strukturelle Ændringer (KRITISK):**
- `supabase/migrations/*_create_jersey_images_table.sql` (new)
- `supabase/migrations/*_add_vision_columns_to_jerseys.sql` (new)
- `supabase/migrations/*_add_status_column.sql` (new)
- `supabase/migrations/*_create_cleanup_function.sql` (new)
- `supabase/functions/upload-jersey-image/index.ts` (new - Edge Function)
- `supabase/functions/upload-jersey-image/README.md` (new)
- `supabase/functions/cleanup-jersey-storage/index.ts` (new)
- `apps/web/app/api/v1/jerseys/create-draft/route.ts` (new)
- `apps/web/app/api/v1/jerseys/cancel-draft/route.ts` (new - cleanup)
- `apps/web/components/jersey/UploadJersey.tsx` (modify - draft + cleanup)

**New Files:**
- `supabase/migrations/*_enable_pgvector.sql`
- `supabase/migrations/*_jersey_images.sql`
- `supabase/migrations/*_vision_columns.sql`
- `supabase/migrations/*_kit_templates.sql`
- `supabase/functions/analyze-jersey-vision/index.ts`
- `supabase/functions/analyze-jersey-vision/README.md`
- `apps/web/lib/services/vision-analysis-service.ts`
- `apps/web/hooks/use-analyze-jersey-vision.ts`
- `apps/web/app/api/v1/jerseys/analyze-vision/route.ts`

**Modified Files:**
- `apps/web/components/jersey/UploadJersey.tsx` - Add Vision trigger
- `apps/web/components/jersey/upload-steps/JerseyInfoStep.tsx` - Auto-fill
- `apps/web/components/jersey/upload-steps/PlayerPrintStep.tsx` - Auto-fill

---

### Risks & Mitigation

**Risk 1: OpenAI API Costs**
- Vision API: ~$0.01-0.03 per image
- Embedding: ~$0.00013 per image
- **Mitigation:** Cache templates aggressively, only run Vision when needed

**Risk 2: Accuracy**
- Vision may misread text/numbers
- **Mitigation:** Always allow user edit, show confidence scores, require confirmation

**Risk 3: Performance**
- Vision analysis can be slow (5-10s)
- **Mitigation:** Show loading state, run async, use templates to skip Vision

**Risk 4: Rate Limits**
- OpenAI has rate limits
- **Mitigation:** Queue requests, add retry logic, monitor usage

---

### Next Steps

1. **Review PRD** - Confirm Vision JSON schema matches needs
2. **Setup OpenAI** - Get API key, test Vision API
3. **Enable pgvector** - Test in Supabase staging
4. **Create Migration 1** - Enable extension
5. **Prototype Vision Function** - Test with sample image
6. **Implement Phase 1** - Database setup
7. **Implement Phase 2** - Edge Function
8. **Implement Phase 3** - Frontend integration
9. **Test & Iterate** - Collect feedback, refine

---

## Kritiske Problemer & Løsninger - Sammenfatning

### ❓ FAQ: Edge Functions vs API Routes

**Spørgsmål:** Hvorfor bruge Edge Functions i stedet for API Routes?

**Svar:** Edge Functions er bedre for:
1. **Image Upload:**
   - Nærmere til Supabase Storage (lavere latency)
   - Direkte adgang uden gennem Next.js server
   - Bedre for store filer (5MB+)

2. **Heavy Processing:**
   - Vision analysis kan tage 5-10 sekunder
   - Blokerer ikke Next.js server
   - Uafhængig scaling

3. **Cost Efficiency:**
   - Betaler kun for execution time
   - Ikke bundet til Next.js server costs
   - Bedre resource isolation

4. **Supabase Integration:**
   - Native Storage access
   - Direkte PostgreSQL connection
   - Bedre error handling

**Anbefaling:** Brug Edge Functions for upload, Vision analysis, og cleanup. Brug API Routes kun for simple CRUD og form handling.

---

### 🗑️ Cleanup Strategi for Draft Jerseys

**Spørgsmål:** Hvad hvis brugeren fortryder upload? Skal vi slette draft jersey og images?

**Svar:** Ja - hybrid cleanup approach:

**1. Manual Cleanup (Immediate):**
```typescript
// Når modal lukkes uden submit
onClose={() => {
  if (draftJerseyId && !isSubmitted) {
    // Trigger cleanup endpoint
    fetch(`/api/v1/jerseys/cancel-draft/${draftJerseyId}`, {
      method: 'DELETE'
    });
  }
  onClose();
}}
```

**2. Automatic Cleanup (Cron Job):**
```sql
-- Cleanup abandoned drafts > 24 timer
SELECT cleanup_abandoned_drafts();
```

**3. Storage Cleanup:**
- Edge Function `cleanup-jersey-storage`
- Kaldt automatisk når jersey slettes (CASCADE trigger)
- Sletter hele `{jersey_id}/` folder

**4. Database Cleanup:**
- `jersey_images` tabel har `ON DELETE CASCADE`
- Når jersey slettes → alle images slettes automatisk
- Ingen orphaned rows

**Implementation:**
- ✅ Cleanup function i database
- ✅ Edge Function for Storage cleanup
- ✅ API endpoint for manual cleanup
- ✅ Cron job setup (via Supabase cron eller pg_cron)

---

### 🔴 Problem 1: Upload Struktur

**Nuværende:**
- Images uploades til `{userId}/` før jersey oprettes
- Jersey ID eksisterer ikke ved upload tidspunkt
- Kan ikke organisere images efter jersey

**Løsning:**
- Opret jersey som "draft" først (generer jersey_id)
- Upload til `{jersey_id}/{fileName}` struktur
- Update Storage policies

### 🔴 Problem 2: Database Normalisering

**Nuværende:**
- `jerseys.images TEXT[]` - bare URL array
- Ingen metadata pr. image
- Ingen relationelle forbindelser

**Løsning:**
- Opret `jersey_images` tabel
- Hver image har sin egen row med metadata (view_type, embedding)
- FK til jersey_id for automatisk cleanup

### 🔴 Problem 3: Owner ID Mismatch

**Nuværende:**
- `jerseys.owner_id` er TEXT (Clerk ID)
- Storage policies checker `auth.uid()` (UUID)
- Mismatch kan forhindre uploads

**Løsning:**
- Brug service role client i API routes (bypass RLS)
- Verificer ownership i application layer
- Eller: Fix RLS policies til at bruge Clerk ID

### 📋 Anbefalet Implementation Rækkefølge

1. **Phase 0:** Strukturelle ændringer (KRITISK - først!)
   - Opret `jersey_images` tabel
   - Draft jersey pattern
   - Update Storage struktur
   
2. **Phase 1:** Database setup
   - Enable pgvector
   - Vision columns
   - Template tabel

3. **Phase 2+:** Vision implementation
   - Edge Function
   - Frontend integration
   - Template system

---

## Ready to Proceed

**Option 1: Create Implementation Plan**
```
/create-implementation-plan AI Vision ved jersey upload
```
Brug denne research til at lave detaljeret plan med phases.

**Option 2: Start Implementation**
Start med Phase 0 (Strukturelle ændringer) - KRITISK først!

**Option 3: More Research**
- Test OpenAI Vision API med sample jersey images
- Research image embedding models
- Evaluate alternative Vision providers


# AI Vision ved Jersey Upload - Implementation Plan

## Overview

Implementerer AI Vision ved jersey upload for automatisk metadata-ekstraktion med OpenAI Vision + Embeddings. Dette lader brugere springe step 2 og 3 over og afslutte ved step 4 hurtigere, ved at automatisk ekstrahere club, season, jersey type, player name/number, og badges fra uploaded billeder.

**Hvorfor:** Brugere skal i øjeblikket manuelt udfylde metadata i 3 steps (Jersey Info, Player Print, Condition Notes), hvilket er tidskrævende. AI Vision kan automatisere denne proces og forbedre UX markant.

**Mål:** Automatiser metadata-ekstraktion, så brugeren kan bekræfte/redigere Vision resultater i stedet for at indtaste alt manuelt.

---

## Linear Issue

**Issue:** [HUD-30](https://linear.app/huddle-world/issue/HUD-30/feature-ai-vision-ved-jersey-upload-automatisk-metadata-ekstraktion)  
**Status:** Backlog  
**Priority:** High (2)  
**Labels:** Feature, Jerseys  
**Team:** Huddle World  
**Branch:** `nicklaseskou95/hud-30-feature-ai-vision-ved-jersey-upload-automatisk-metadata`  
**Created:** 2025-11-30  
**Research:** `.project/research/vision-ai-upload-research.md`

---

## Current State Analysis

### Nuværende Tilstand:

**Upload Flow (`apps/web/components/jersey/UploadJersey.tsx`):**
- ✅ 4-step form: Image Upload → Jersey Info → Player Print → Condition Notes
- ✅ Images uploades via `/api/v1/jerseys/upload-image` (API route)
- ✅ Images gemmes som URL array i `jerseys.images TEXT[]`
- ✅ Metadata matching via `match-jersey-metadata` Edge Function (kun i Step 3)
- ❌ Ingen automatisk metadata-ekstraktion
- ❌ Ingen AI Vision integration

**Database Schema:**
- ✅ `public.jerseys` tabel med `club`, `season`, `player_name`, `player_number` (fritekst)
- ✅ Optional FK'er: `club_id`, `player_id`, `season_id` (linker til `metadata` schema)
- ✅ `metadata` schema eksisterer (clubs, seasons, players, player_contracts)
- ❌ Ingen `jersey_images` tabel (images er bare TEXT[] array)
- ❌ Ingen Vision columns (`vision_raw`, `vision_confidence`)
- ❌ Ingen `status` column (kan ikke holde draft state)

**Storage:**
- ✅ Bucket `jersey_images` eksisterer
- ✅ Images uploades til `{userId}/{fileName}` struktur
- ⚠️ **PROBLEM:** Jersey ID eksisterer ikke når images uploades
- ❌ Svært at organisere images efter jersey
- ❌ Svært at slette alle images når jersey slettes

**Edge Functions:**
- ✅ `match-jersey-metadata` - Matcher text input til metadata IDs
- ✅ `backfill-metadata` - On-demand backfill af historisk data
- ✅ Pattern established (PostgreSQL connection, structured responses)
- ❌ Ingen upload Edge Function (bruger API route)
- ❌ Ingen Vision analysis Edge Function
- ❌ Ingen cleanup Edge Function

**API Routes:**
- ✅ `/api/v1/jerseys/upload-image` - Uploads til Storage (service role client)
- ✅ `/api/v1/jerseys` - CRUD operations
- ❌ Ingen draft jersey endpoint
- ❌ Ingen cancel draft endpoint

### Key Discoveries:

1. **Upload Flow Problem:** Images uploades FØR jersey oprettes → jersey_id eksisterer ikke
2. **Storage Struktur:** Bruger `{userId}/` i stedet for `{jersey_id}/` → svært at organisere
3. **Database Normalisering:** Images er TEXT[] array → ingen metadata pr. image
4. **Draft Pattern Mangler:** Ingen måde at gemme "work in progress" jerseys
5. **Edge Functions Pattern:** Eksisterende Edge Functions bruger PostgreSQL direkte + Supabase client
6. **Metadata Infrastructure:** `match-jersey-metadata` er klar til at blive kaldt fra Vision

---

## Desired End State

### Upload Flow:

**Nyt Flow med Draft Pattern:**
```
1. User klikker "Upload Jersey"
   ↓
2. Opret draft jersey (generer jersey_id)
   ↓
3. Step 1: Upload images → Edge Function `upload-jersey-image` → `{jersey_id}/{fileName}`
   ↓
4. Auto-trigger Vision analysis → Edge Function `analyze-jersey-vision`
   ↓
5. Step 2 & 3: Pre-filled form med Vision results (bruger bekræfter/redigerer)
   ↓
6. Step 4: Condition + Submit → Update jersey status to 'published'
```

**Vision Analysis Flow:**
```
1. Generate embedding for cover image
   ↓
2. Check kit_templates similarity (pgvector cosine similarity)
   ↓
3. If similar (>0.85) → use template metadata, skip Vision
   ↓
4. Else → Run Vision on all images → combine results
   ↓
5. Map to DB IDs via match-jersey-metadata Edge Function
   ↓
6. Return structured results + confidence scores
```

### Database Schema:

**Nye Tabeller:**
- `public.jersey_images` - Normaliseret struktur med metadata pr. image
- `metadata.kit_templates` - Template matching for embeddings

**Nye Columns:**
- `jerseys.status` - 'draft', 'published', 'archived'
- `jerseys.vision_raw` - JSONB med fuld Vision API response
- `jerseys.vision_confidence` - Float (0-100) overall confidence

**Extensions:**
- pgvector enabled for embedding similarity search

### Edge Functions:

**Nye Functions:**
- `upload-jersey-image` - Håndterer image upload til Storage
- `analyze-jersey-vision` - Vision analysis + template matching
- `cleanup-jersey-storage` - Storage cleanup ved jersey deletion

### Frontend:

**Nye Komponenter:**
- Vision analysis hook (`use-analyze-jersey-vision.ts`)
- Vision analysis service
- Auto-fill logic for form fields
- Confidence score display

---

## What We're NOT Doing

**Out of Scope (v1):**
- ❌ **Batch processing** af eksisterende jerseys (kunny upload flow)
- ❌ **Vision for edit flow** (kun upload flow i v1)
- ❌ **Multiple Vision providers** (kun OpenAI)
- ❌ **Real-time progress** updates under Vision analysis (kun loading state)
- ❌ **Vision result caching** i browser (kun server-side templates)
- ❌ **User training** af Vision model (kun OpenAI standard model)
- ❌ **OCR improvements** hvis Vision fejler (kun manual input fallback)
- ❌ **Image quality enhancement** før Vision (bruger original images)
- ❌ **Vision analysis på edit** (kun upload flow)

**Future Extensions:**
- Vision for edit flow (re-analyze existing jerseys)
- Batch processing af eksisterende jerseys
- Alternative Vision providers (Google Vision, AWS Rekognition)
- Image quality enhancement pipeline
- User feedback loop for Vision accuracy

---

## Implementation Approach

**Strategy:**
1. **Phase 0A First (CRITICAL):** Database foundation (migrations, cleanup function, cron job)
2. **Phase 0B (CRITICAL):** Upload flow changes (draft pattern, Edge Functions, frontend)
3. **Phase 1:** Database setup (pgvector + template table)
4. **Phase 2:** Vision Function (Edge Function med OpenAI integration + Sentry)
5. **Phase 3:** Frontend Integration (hook into upload flow, auto-fill form)
6. **Phase 4:** Template System (create/update templates for future matching)

**Key Principles:**
- **Draft Pattern:** Jersey oprettes først → images uploades efter
- **Edge Functions for Heavy Work:** Upload, Vision, cleanup (ikke API routes)
- **Backward Compatible:** Eksisterende `jerseys.images` array beholdes (nullable)
- **User in Control:** Vision pre-fills, men bruger kan altid redigere
- **Template Matching:** Skip Vision hvis jersey allerede set (>85% similarity)
- **Cleanup Strategy:** Manual (immediate) + Cron job (backup)

---

## Phase 0A: Database Foundation (KRITISK - skal gøres først!)

### Overview

Fix database struktur før Vision implementation. Dette er kritisk foundation der skal være på plads før vi kan implementere upload flow ændringer.

**Hvorfor først:** Vision kræver jersey_id til at organisere images. Uden draft pattern kan vi ikke generere jersey_id før upload. Database struktur skal være på plads først.

### Changes Required:

### Changes Required:

#### 1. Create `jersey_images` Table Migration

**File:** `supabase/migrations/20251130_create_jersey_images_table.sql`

**Changes:** Opretter normaliseret struktur for jersey images med metadata support.

```sql
-- Create jersey_images table for normalized image storage
CREATE TABLE public.jersey_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jersey_id UUID NOT NULL REFERENCES public.jerseys(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  storage_path TEXT NOT NULL, -- For cleanup: "jersey_id/filename.jpg"
  view_type TEXT, -- 'front', 'back', 'detail', 'other' (fra Vision)
  sort_order INTEGER DEFAULT 0, -- For reordering (første = cover)
  image_embedding vector(3072), -- OpenAI embedding dimension (nullable initially)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
CREATE INDEX idx_jersey_images_jersey_id ON public.jersey_images(jersey_id);
CREATE INDEX idx_jersey_images_sort_order ON public.jersey_images(jersey_id, sort_order);

-- Comments
COMMENT ON TABLE public.jersey_images IS 'Normalized jersey images with metadata. Replaces jerseys.images TEXT[] array.';
COMMENT ON COLUMN public.jersey_images.view_type IS 'Image view type detected by Vision or user. Values: front, back, detail, other.';
COMMENT ON COLUMN public.jersey_images.image_embedding IS 'OpenAI embedding vector (3072 dimensions) for template matching. Created in Phase 1.';
```

**Rationale:** Normaliseret struktur tillader metadata pr. image (view_type, embedding) og klar cleanup via CASCADE delete.

#### 2. Add Vision Columns to `jerseys` Table

**File:** `supabase/migrations/20251130_add_vision_columns_to_jerseys.sql`

**Changes:** Tilføjer Vision metadata og status columns.

```sql
-- Add Vision metadata columns
ALTER TABLE public.jerseys 
ADD COLUMN vision_raw JSONB, -- Full Vision API response
ADD COLUMN vision_confidence FLOAT, -- Overall confidence score (0-100)
ADD COLUMN status TEXT DEFAULT 'published'; -- 'draft', 'published', 'archived'

-- Indexes
CREATE INDEX idx_jerseys_status ON public.jerseys(status, created_at);
CREATE INDEX idx_jerseys_vision_confidence ON public.jerseys(vision_confidence) 
WHERE vision_confidence IS NOT NULL;

-- Constraints
ALTER TABLE public.jerseys ADD CONSTRAINT jerseys_status_check 
CHECK (status IN ('draft', 'published', 'archived'));

-- Comments
COMMENT ON COLUMN public.jerseys.status IS 'Jersey status: draft (work in progress), published (visible), archived (hidden).';
COMMENT ON COLUMN public.jerseys.vision_raw IS 'Full OpenAI Vision API response stored as JSONB for debugging and future improvements.';
COMMENT ON COLUMN public.jerseys.vision_confidence IS 'Overall confidence score (0-100) for Vision analysis. Null if no Vision analysis performed.';
```

**Rationale:** Vision metadata tillader debugging og fremtidige forbedringer. Status column muliggør draft pattern.

#### 3. Create Cleanup Function

**File:** `supabase/migrations/20251130_create_cleanup_function.sql`

**Changes:** Database function for cleanup af abandoned drafts.

```sql
-- Function to cleanup abandoned draft jerseys
CREATE OR REPLACE FUNCTION cleanup_abandoned_drafts()
RETURNS TABLE(deleted_count INTEGER, jersey_ids UUID[]) AS $$
DECLARE
  deleted_jersey_ids UUID[];
BEGIN
  -- Find and delete draft jerseys > 24 hours old
  WITH deleted AS (
    DELETE FROM public.jerseys
    WHERE status = 'draft'
    AND created_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT array_agg(id), COUNT(*)::INTEGER
  INTO deleted_jersey_ids, deleted_count
  FROM deleted;
  
  RETURN QUERY SELECT deleted_count, deleted_jersey_ids;
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON FUNCTION cleanup_abandoned_drafts() IS 'Deletes draft jerseys older than 24 hours. CASCADE delete automatically removes jersey_images rows. Storage cleanup handled by Edge Function.';
```

**Rationale:** Automatic cleanup af abandoned drafts. CASCADE delete sletter automatisk jersey_images rows.

#### 4. Schedule Cleanup Cron Job

**File:** `supabase/migrations/20251130_schedule_cleanup_cron_job.sql`

**Changes:** Schedule cron job til at køre cleanup function dagligt.

```sql
-- Ensure pg_cron extension is enabled (should already exist from previous migrations)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule cleanup job to run daily at 2 AM UTC
SELECT cron.schedule(
  'cleanup-abandoned-drafts',
  '0 2 * * *', -- Daily at 2 AM UTC (cron expression)
  $$
  SELECT cleanup_abandoned_drafts();
  $$
);

-- Comment
COMMENT ON FUNCTION cleanup_abandoned_drafts() IS 'Scheduled via pg_cron to run daily at 2 AM UTC. Cleans up draft jerseys older than 24 hours. CASCADE delete automatically removes jersey_images rows. Storage cleanup handled by cleanup-jersey-storage Edge Function.';
```

**Rationale:** Automatic cleanup af abandoned drafts hver dag. CASCADE delete sletter automatisk jersey_images rows. Storage cleanup håndteres separat af Edge Function.

### Success Criteria:

#### Automated Verification:
- [ ] Migration runs: `supabase migration up`
- [ ] `jersey_images` table exists with correct schema
- [ ] `jerseys` table has `vision_raw`, `vision_confidence`, and `status` columns
- [ ] Cleanup function exists: `SELECT * FROM pg_proc WHERE proname = 'cleanup_abandoned_drafts';`
- [ ] Cron job scheduled: `SELECT * FROM cron.job WHERE jobname = 'cleanup-abandoned-drafts';`
- [ ] Type check passes: `npm run type-check`

#### Manual Verification:
- [ ] Can insert row into `jersey_images` table
- [ ] Can insert draft jersey with `status='draft'`
- [ ] Draft jersey constraint works (status must be 'draft', 'published', or 'archived')
- [ ] Cleanup function can be called manually: `SELECT * FROM cleanup_abandoned_drafts();`
- [ ] Cron job exists in database (check via Supabase Dashboard or SQL)

**⚠️ PAUSE HERE** - Verify all Phase 0A migrations before proceeding to Phase 0B

**Estimated Time:** 4-5 hours  
**Complexity:** Medium  
**Risk:** Low (database-only changes)

---

## Phase 0B: Upload Flow Changes (KRITISK - efter Phase 0A!)

### Overview

Implementer draft pattern og opdater upload flow til at bruge Edge Functions. Dette bygger på Phase 0A database foundation.

**Hvorfor efter 0A:** Kræver database struktur fra Phase 0A (status column, jersey_images table).

### Changes Required:

#### 1. Create Draft Jersey API Endpoint

**File:** `apps/web/app/api/v1/jerseys/create-draft/route.ts`

**Changes:** Endpoint til at oprette draft jersey før upload.

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireAuth(req);

    const supabase = await createServiceClient();
    
    // Create draft jersey with minimal data
    const { data: jersey, error } = await supabase
      .from("jerseys")
      .insert({
        owner_id: userId,
        status: "draft",
        club: "",
        season: "",
      })
      .select("id, status")
      .single();

    if (error) throw error;

    return successResponse({ 
      jerseyId: jersey.id,
      status: jersey.status 
    });
  } catch (error) {
    return handleApiError(error, req);
  }
}
```

**Rationale:** Genererer jersey_id før upload, så images kan organisere efter jersey.

#### 5. Create Cancel Draft API Endpoint

**File:** `apps/web/app/api/v1/jerseys/cancel-draft/[id]/route.ts`

**Changes:** Endpoint til at slette draft jersey (cleanup ved cancel).

```typescript
import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/api/errors";
import { successResponse } from "@/lib/api/responses";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await requireAuth(req);
    const jerseyId = params.id;

    const supabase = await createServiceClient();
    
    // Verify ownership
    const { data: jersey, error: fetchError } = await supabase
      .from("jerseys")
      .select("id, owner_id, status")
      .eq("id", jerseyId)
      .single();

    if (fetchError || !jersey) {
      return new Response(
        JSON.stringify({ error: "Jersey not found" }),
        { status: 404 }
      );
    }

    if (jersey.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403 }
      );
    }

    if (jersey.status !== "draft") {
      return new Response(
        JSON.stringify({ error: "Can only cancel draft jerseys" }),
        { status: 400 }
      );
    }

    // Delete jersey (CASCADE deletes jersey_images rows)
    const { error: deleteError } = await supabase
      .from("jerseys")
      .delete()
      .eq("id", jerseyId);

    if (deleteError) throw deleteError;

    // Trigger Storage cleanup via Edge Function (async, non-blocking)
    // Note: Storage cleanup handled separately by cleanup-jersey-storage function

    return successResponse({ deleted: true });
  } catch (error) {
    return handleApiError(error, req);
  }
}
```

**Rationale:** Manual cleanup når bruger fortryder upload. CASCADE delete sletter jersey_images automatisk.

#### 6. Create Upload Jersey Image Edge Function

**File:** `supabase/functions/upload-jersey-image/index.ts`

**Changes:** Edge Function for image upload til Storage (bedre end API route). **VIGTIGT:** Bruger FormData til file upload, ikke JSON.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use FormData for file uploads (not JSON)
    const formData = await req.formData()
    const file = formData.get('file') as File
    const jerseyId = formData.get('jerseyId') as string
    const userId = formData.get('userId') as string

    // Validate
    if (!jerseyId || !file || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: jerseyId, file, or userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: `Invalid file type: ${file.type}. Allowed: ${allowedTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      return new Response(
        JSON.stringify({ error: `File too large: ${file.size} bytes. Max: ${maxSize} bytes` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify jersey ownership and draft status
    const { data: jersey, error: jerseyError } = await supabase
      .from('jerseys')
      .select('id, owner_id, status')
      .eq('id', jerseyId)
      .single()

    if (jerseyError || !jersey) {
      return new Response(
        JSON.stringify({ error: 'Jersey not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (jersey.owner_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: You do not own this jersey' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Only allow uploads to draft jerseys (prevent accidental overwrites)
    if (jersey.status !== 'draft') {
      return new Response(
        JSON.stringify({ error: 'Can only upload images to draft jerseys' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Upload to Storage: {jersey_id}/{fileName}
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const storagePath = `${jerseyId}/${fileName}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()

    const { error: uploadError } = await supabase.storage
      .from('jersey_images')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      // Check for specific error types
      if (uploadError.message?.includes('already exists')) {
        return new Response(
          JSON.stringify({ error: 'File already exists. Please try again.' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (uploadError.message?.includes('quota') || uploadError.message?.includes('space')) {
        return new Response(
          JSON.stringify({ error: 'Storage quota exceeded. Please contact support.' }),
          { status: 507, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw uploadError
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('jersey_images')
      .getPublicUrl(storagePath)

    // Create jersey_images row
    const { error: insertError } = await supabase
      .from('jersey_images')
      .insert({
        jersey_id: jerseyId,
        image_url: publicUrl,
        storage_path: storagePath,
        sort_order: 0, // Will be updated later if multiple images
      })

    if (insertError) {
      // Cleanup uploaded file if DB insert fails
      await supabase.storage
        .from('jersey_images')
        .remove([storagePath])
      
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        url: publicUrl,
        storagePath,
        jerseyId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Upload error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Error Handling:**
- File validation: type and size checks before upload
- Ownership verification: ensure user owns the jersey
- Draft status check: only allow uploads to draft jerseys
- Storage errors: handle quota exceeded, file exists, etc.
- Database errors: cleanup uploaded file if DB insert fails
- Network failures: return appropriate error codes

**Rationale:** Edge Function er bedre end API route for upload (nærmere Storage, bedre isolation). FormData pattern er korrekt for file uploads.

#### 7. Create Cleanup Jersey Storage Edge Function

**File:** `supabase/functions/cleanup-jersey-storage/index.ts`

**Changes:** Edge Function til at slette Storage folders når jersey slettes.

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { jerseyId } = await req.json() as { jerseyId: string }

    if (!jerseyId) {
      return new Response(
        JSON.stringify({ error: 'Missing jerseyId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // List all files in jersey folder
    const { data: files, error: listError } = await supabase.storage
      .from('jersey_images')
      .list(jerseyId)

    if (listError) {
      console.error('List error:', listError)
      // Continue anyway - folder might not exist
    }

    if (files && files.length > 0) {
      // Delete all files in folder
      const filePaths = files.map(file => `${jerseyId}/${file.name}`)
      
      const { error: deleteError } = await supabase.storage
        .from('jersey_images')
        .remove(filePaths)

      if (deleteError) {
        console.error('Delete error:', deleteError)
        // Log but don't fail - files might already be deleted
      }
    }

    return new Response(
      JSON.stringify({ success: true, deleted: files?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

**Rationale:** Cleanup Storage folders automatisk når jersey slettes (kaldt fra database trigger eller API).

#### 8. Update UploadJersey Component (Draft Pattern)

**File:** `apps/web/components/jersey/UploadJersey.tsx`

**Changes:** Implementer draft pattern - opret draft før upload, cleanup ved cancel.

**Key Changes:**
1. Opret draft jersey når modal åbnes (hvis ikke allerede oprettet)
2. Upload images til `{jersey_id}/` struktur via Edge Function
3. Cleanup draft når modal lukkes uden submit
4. Update jersey status til 'published' ved submit

**State Changes:**
```typescript
const [draftJerseyId, setDraftJerseyId] = useState<string | null>(null);
const [isDraftCreated, setIsDraftCreated] = useState(false);
```

**New Functions:**
```typescript
// Create draft jersey when modal opens
const createDraftJersey = async () => {
  if (isDraftCreated) return draftJerseyId;
  
  const token = await getToken();
  const response = await fetch('/api/v1/jerseys/create-draft', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  });
  const { jerseyId } = await response.json();
  setDraftJerseyId(jerseyId);
  setIsDraftCreated(true);
  return jerseyId;
};

// Cleanup draft when modal closes without submit
const cleanupDraft = async () => {
  if (!draftJerseyId || isSubmitted) return;
  
  const token = await getToken();
  await fetch(`/api/v1/jerseys/cancel-draft/${draftJerseyId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
};
```

**Modified Upload Flow:**
```typescript
// In handleSubmit:
// 1. Ensure draft exists
const jerseyId = await createDraftJersey();

// 2. Upload images via Edge Function (not API route)
for (const image of images) {
  const formData = new FormData();
  formData.append('file', image.file);
  formData.append('jerseyId', jerseyId);
  formData.append('userId', user.id);
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/upload-jersey-image`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      },
      body: formData
    }
  );
  // ... handle response
}

// 3. Update jersey with form data + status = 'published'
await createJersey.mutateAsync({
  id: jerseyId, // Include draft jersey ID
  ...formValues,
  status: 'published'
});
```

**Cleanup on Modal Close:**
```typescript
useEffect(() => {
  if (!isOpen && draftJerseyId && !isSubmitted) {
    cleanupDraft();
  }
}, [isOpen, draftJerseyId, isSubmitted]);
```

**Rationale:** Draft pattern giver jersey_id før upload, så images kan organisere efter jersey.

### Error Handling & Edge Cases:

#### Error Scenarios to Handle:

1. **Draft Creation Failures:**
   - Network failure → Show error message, allow retry
   - Database error → Log error, show user-friendly message
   - Concurrent creation → Handle duplicate draft creation gracefully

2. **Image Upload Failures:**
   - Invalid file type → Validate before upload, show clear error
   - File too large → Check size limit, show error with max size
   - Storage quota exceeded → Return 507 error, suggest cleanup
   - Network timeout → Implement retry logic with exponential backoff
   - Upload interrupted → Cleanup partial upload, allow retry

3. **Cleanup Failures:**
   - Draft delete fails → Log error, allow manual cleanup
   - Storage cleanup fails → Log error, schedule retry
   - Concurrent cleanup → Use database transaction or lock

4. **Edge Cases:**
   - User uploads same jersey twice → Prevent duplicate drafts (check existing drafts)
   - Network failure mid-upload → Cleanup partial uploads, show error
   - Modal closed during upload → Cancel in-progress uploads, cleanup draft
   - Storage folder exists but jersey deleted → Cleanup orphaned folders via cron job

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run type-check`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] API routes compile without errors
- [ ] Edge Functions deploy: `supabase functions deploy upload-jersey-image cleanup-jersey-storage`
- [ ] Edge Functions return correct response format

#### Manual Verification - Draft Creation:
- [ ] Open upload modal → Verify draft jersey created in DB (query: `SELECT * FROM jerseys WHERE status='draft' AND owner_id='...' ORDER BY created_at DESC LIMIT 1`)
- [ ] Draft jersey has correct `owner_id` matching authenticated user
- [ ] Draft jersey has `status='draft'` 
- [ ] Concurrent modal opens → Only one draft created per session

#### Manual Verification - Image Upload:
- [ ] Upload single image → Verify image in Storage folder `{jersey_id}/{filename}`
- [ ] Upload multiple images → Verify all images in same `{jersey_id}/` folder
- [ ] Verify `jersey_images` row created with correct `jersey_id`, `image_url`, `storage_path`
- [ ] Upload invalid file type → Error message shown, upload rejected
- [ ] Upload file >10MB → Error message shown with size limit
- [ ] Upload to non-draft jersey → Error: "Can only upload images to draft jerseys"

#### Manual Verification - Cleanup:
- [ ] Close modal without submit → Verify draft jersey deleted from DB
- [ ] Verify `jersey_images` rows deleted via CASCADE
- [ ] Verify Storage folder deleted (check Supabase Storage dashboard)
- [ ] Close modal during upload → Verify cleanup still triggers, partial uploads cleaned up
- [ ] Cancel draft manually via API → Verify cleanup works

#### Manual Verification - Status Transitions:
- [ ] Submit jersey with form data → Verify `status='published'`
- [ ] Draft jerseys older than 24h → Verify cleanup cron job deletes them
- [ ] Published jerseys → Verify `status='published'`, visible in listings

**⚠️ PAUSE HERE** - Verify all Phase 0B changes before proceeding to Phase 1

**Estimated Time:** 4-5 hours  
**Complexity:** High  
**Risk:** Medium (breaking changes til upload flow)

---

## Phase 1: Database Setup (pgvector + Template Table)

### Overview

Enable pgvector extension og opret `kit_templates` tabel for template matching. Dette er foundation for embedding-based similarity search.

**⚠️ Implementation Note:** Embedding indexes were NOT created due to pgvector v0.8.0 dimension limit (max 2000, we use 3072). Embedding columns and similarity search functionality work correctly - only performance optimization via indexes was skipped. Sequential scan is acceptable for template matching use case.

### Changes Required:

#### 1. Enable pgvector Extension

**File:** `supabase/migrations/20251130_enable_pgvector.sql`

**Changes:** Enable pgvector extension for embedding similarity search.

```sql
-- Enable pgvector extension for embedding similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify extension
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

-- Comment
COMMENT ON EXTENSION vector IS 'pgvector extension for OpenAI embedding similarity search in kit_templates and jersey_images tables.';
```

**Rationale:** pgvector er påkrævet for cosine similarity search på embeddings.

#### 2. Create Kit Templates Table

**File:** `supabase/migrations/20251130_create_kit_templates_table.sql`

**Changes:** Opretter tabel for template matching med embeddings.

```sql
-- Create kit_templates table for embedding-based template matching
CREATE TABLE metadata.kit_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id TEXT REFERENCES metadata.clubs(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES metadata.players(id) ON DELETE SET NULL,
  season_id UUID REFERENCES metadata.seasons(id) ON DELETE SET NULL,
  kit_type TEXT, -- 'Home', 'Away', 'Third', 'GK', etc.
  image_embedding vector(3072) NOT NULL, -- OpenAI embedding-3-large dimension
  example_jersey_id UUID REFERENCES public.jerseys(id) ON DELETE SET NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes
-- Note: Embedding index skipped due to pgvector dimension limit (3072 > 2000)
-- Similarity search will work but use sequential scan (acceptable for template matching)
-- Can add index later if pgvector version supports >2000 dimensions

CREATE INDEX idx_kit_templates_club_season ON metadata.kit_templates(club_id, season_id, kit_type);
CREATE INDEX idx_kit_templates_usage_count ON metadata.kit_templates(usage_count DESC);

-- Comments
COMMENT ON TABLE metadata.kit_templates IS 'Templates for jersey embeddings to skip Vision analysis if similar jersey already analyzed.';
COMMENT ON COLUMN metadata.kit_templates.image_embedding IS 'OpenAI embedding-3-large vector (3072 dimensions) from cover image of example jersey.';
COMMENT ON COLUMN metadata.kit_templates.usage_count IS 'Number of times this template was used to skip Vision analysis.';
```

**Rationale:** Template matching tillader os at springe Vision over hvis jersey allerede set (sparer API costs).

#### 3. Add Embedding Index to `jersey_images`

**File:** `supabase/migrations/20251130_add_embedding_index_to_jersey_images.sql`

**Changes:** Embedding index dropped due to pgvector dimension limit.

**⚠️ IMPORTANT:** Embedding indexes were NOT created due to pgvector v0.8.0 limitation:
- pgvector supports indexing for vectors up to 2000 dimensions
- We use OpenAI `embedding-3-large` with 3072 dimensions
- **Embedding columns still exist and work** - only indexes were dropped
- Similarity search (`<->` operator) works but uses sequential scan instead of index scan
- Performance is acceptable for template matching (typically few templates)

**Migration file contains:**
```sql
-- Note: Embedding index skipped due to pgvector dimension limit (3072 > 2000)
-- Similarity search will work but use sequential scan (acceptable for template matching)
-- Can add index later if pgvector version supports >2000 dimensions
```

**Rationale:** Embedding columns and similarity search functionality work correctly. Indexes can be added later if pgvector is upgraded or if we switch to a lower-dimensional embedding model.

### Success Criteria:

#### Automated Verification:
- [ ] Migration runs: `supabase migration up`
- [ ] pgvector extension enabled: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- [ ] `kit_templates` table exists
- [ ] Embedding columns exist (indexes NOT created due to dimension limit)
- [ ] Type check passes

#### Manual Verification:
- [ ] Can insert embedding vector: `INSERT INTO metadata.kit_templates (image_embedding) VALUES ('[0.1,0.2,...]'::vector);`
- [ ] Can query similarity: `SELECT * FROM metadata.kit_templates ORDER BY image_embedding <-> $1 LIMIT 1;`
- [ ] Similarity search works (uses sequential scan, not index - expected behavior)
- [ ] Embedding columns exist in both `kit_templates` and `jersey_images` tables

**⚠️ PAUSE HERE** - Verify pgvector works before Phase 2

**Estimated Time:** 2-3 hours  
**Complexity:** Low  
**Risk:** Low

---

## Phase 2: Vision Edge Function

### Overview

Opretter `analyze-jersey-vision` Edge Function der integrerer OpenAI Vision API, genererer embeddings, og matcher til metadata IDs. Dette er core af Vision feature.

### Changes Required:

#### 1. Create Vision Analysis Edge Function

**File:** `supabase/functions/analyze-jersey-vision/index.ts`

**Changes:** Hovedfunktion for Vision analysis med template matching.

**Key Features:**
1. Download images from Storage
2. Generate embedding for cover image
3. Check kit_templates similarity (pgvector)
4. If similar → use template, skip Vision
5. Else → Run Vision on all images
6. Combine results
7. Map to DB IDs via `match-jersey-metadata`
8. Return structured response

**Structure:**
```typescript
interface AnalyzeVisionRequest {
  jerseyId: string
  imageUrls: string[]
  userId: string
}

interface AnalyzeVisionResponse {
  vision: VisionResult | null // Null if template matched
  templateUsed: boolean
  matched: {
    clubId: string | null
    seasonId: string | null
    playerId: string | null
  }
  confidence: {
    club: number
    season: number
    player: number
    overall: number
  }
  embedding: number[] | null
}

// Main function structure follows match-jersey-metadata pattern
```

**Implementation Steps:**
1. Validate request (jerseyId, imageUrls, userId)
2. Verify jersey ownership
3. Download cover image from Storage
4. Generate embedding (OpenAI `text-embedding-3-large`)
5. Check similarity with kit_templates (cosine similarity >0.85)
6. If match → return template metadata
7. Else → Run Vision on all images → combine results
8. Map to DB IDs via `match-jersey-metadata` Edge Function
9. Create/update kit_template if unique
10. Store results in jersey_images rows

**Sentry Instrumentation:**
```typescript
import * as Sentry from "https://deno.land/x/sentry/index.js"

// Initialize Sentry for Edge Function
Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  environment: Deno.env.get("ENVIRONMENT") || "production",
  tracesSampleRate: 0.1, // Sample 10% of transactions
})

// Wrap main function with error capture
try {
  // Vision analysis logic
  const startTime = performance.now()
  
  // ... analysis code ...
  
  const duration = performance.now() - startTime
  Sentry.addBreadcrumb({
    message: "Vision analysis completed",
    level: "info",
    data: {
      jerseyId,
      imageCount: imageUrls.length,
      duration,
      templateUsed: matchedTemplate !== null,
    },
  })
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      function: "analyze-jersey-vision",
      jerseyId,
    },
    extra: {
      userId,
      imageCount: imageUrls?.length || 0,
      errorMessage: error?.message,
    },
    // Never send PII (per 24-observability_sentry.mdc)
    user: { id: userId }, // Only user ID, not email or other PII
  })
  throw error
}
```

**Error Handling:**
- Vision API failures → Capture in Sentry, return user-friendly error
- Embedding generation failures → Log error, fallback to Vision only
- Template matching errors → Log warning, continue with Vision
- Metadata mapping failures → Log error, return partial results
- Timeout handling → Set 30s timeout, return timeout error

**Rationale:** Edge Function pattern følger eksisterende `match-jersey-metadata`, isolerer heavy processing, og giver bedre scalability. Sentry instrumentation giver visibility into errors and performance.

#### 2. Create Vision Analysis README

**File:** `supabase/functions/analyze-jersey-vision/README.md`

**Changes:** Dokumentation for Edge Function.

**Content:**
- Purpose and flow
- Environment variables (OpenAI API key)
- Request/response format
- Error handling
- Performance notes

**Rationale:** Dokumentation gør det nemt at forstå og vedligeholde.

### Success Criteria:

#### Automated Verification:
- [ ] Edge Function deploys: `supabase functions deploy analyze-jersey-vision`
- [ ] Type check passes
- [ ] Can call function with test request
- [ ] Returns structured response

#### Manual Verification:
- [ ] Vision analysis works on test images (club, season, player detected correctly)
- [ ] Template matching skips Vision when similar jersey found (>0.85 similarity)
- [ ] Metadata mapping works (calls match-jersey-metadata correctly, returns DB IDs)
- [ ] Results stored in jersey_images rows (view_type, image_embedding populated)
- [ ] Embeddings generated correctly (3072 dimensions, valid vector)
- [ ] Error handling works (invalid images, API failures, timeouts)
- [ ] **Performance:** Vision analysis completes in <10 seconds for 1-3 images
- [ ] **Performance:** Template matching completes in <1 second
- [ ] **Performance:** End-to-end flow (upload + Vision + metadata mapping) <15 seconds
- [ ] Sentry errors captured correctly (check Sentry dashboard for test errors)
- [ ] Error messages are user-friendly (no technical stack traces exposed)

**⚠️ PAUSE HERE** - Test Vision analysis thoroughly, verify performance targets

**Estimated Time:** 8-12 hours  
**Complexity:** High  
**Risk:** Medium (API costs, accuracy)

---

## Phase 3: Frontend Integration

### Overview

Integrer Vision analysis i upload flow. Auto-trigger efter image upload, pre-fill form fields, og vis confidence scores.

### Changes Required:

#### 1. Create Vision Analysis Service

**File:** `apps/web/lib/services/vision-analysis-service.ts`

**Changes:** Service layer for calling Vision Edge Function.

```typescript
interface AnalyzeVisionParams {
  jerseyId: string
  imageUrls: string[]
}

export async function analyzeJerseyVision(params: AnalyzeVisionParams) {
  // Call Edge Function
  // Return structured response
}
```

**Rationale:** Service layer abstraherer Edge Function call og giver type safety.

#### 2. Create Vision Analysis Hook

**File:** `apps/web/hooks/use-analyze-jersey-vision.ts`

**Changes:** React hook for Vision analysis med loading/error states.

```typescript
export function useAnalyzeJerseyVision() {
  // TanStack Query mutation
  // Loading state
  // Error handling
  // Success callback
}
```

**Rationale:** Hook pattern følger eksisterende hooks (fx `useMatchJerseyMetadata`).

#### 3. Update UploadJersey Component

**File:** `apps/web/components/jersey/UploadJersey.tsx`

**Changes:** Integrer Vision analysis efter image upload.

**Key Changes:**
1. Auto-trigger Vision analysis efter Step 1 (images uploaded)
2. Pre-fill form fields med Vision results
3. Show confidence scores
4. Allow user to edit/confirm

**New State:**
```typescript
const [visionResults, setVisionResults] = useState<VisionResults | null>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [visionError, setVisionError] = useState<string | null>(null);
```

**Auto-trigger Logic:**
```typescript
// After images uploaded in Step 1
useEffect(() => {
  if (step === 1 && images.length > 0 && draftJerseyId) {
    triggerVisionAnalysis();
  }
}, [step, images.length, draftJerseyId]);

const triggerVisionAnalysis = async () => {
  setIsAnalyzing(true);
  try {
    const imageUrls = images.map(img => img.preview); // Or uploaded URLs
    const results = await analyzeJerseyVision({
      jerseyId: draftJerseyId!,
      imageUrls
    });
    setVisionResults(results);
    
    // Pre-fill form
    if (results.matched.clubId) {
      form.setValue('club', results.metadata?.clubName || '');
      setClubId(results.matched.clubId);
    }
    // ... pre-fill other fields
  } catch (error) {
    setVisionError(error.message);
  } finally {
    setIsAnalyzing(false);
  }
};
```

**UI Changes:**
- Show loading state during analysis
- Display confidence scores
- Highlight pre-filled fields
- Allow editing before submit

**Rationale:** Seamless integration gør Vision analysis usynlig for bruger, men giver kontrol via edit.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes
- [ ] Lint passes
- [ ] Build succeeds
- [ ] Hook exports correctly
- [ ] Service function works

#### Manual Verification:
- [ ] Vision analysis auto-triggers efter image upload
- [ ] Form pre-fills med Vision results
- [ ] Confidence scores vises korrekt
- [ ] User kan redigere pre-filled fields
- [ ] Loading state vises under analysis
- [ ] Error handling works (show error message, allow manual input)

**⚠️ PAUSE HERE** - Test frontend integration

**Estimated Time:** 4-6 hours  
**Complexity:** Medium  
**Risk:** Low

---

## Phase 4: Template System

### Overview

Implementerer template creation/update logic i Vision Edge Function. Templates oprettes når unikke jerseys identificeres, og usage_count opdateres.

### Changes Required:

#### 1. Template Creation Logic

**File:** `supabase/functions/analyze-jersey-vision/template.ts`

**Changes:** Helper functions for template management.

**Key Functions:**
```typescript
// Check similarity with existing templates
async function findSimilarTemplate(embedding: number[]): Promise<KitTemplate | null>

// Create new template
async function createTemplate(params: CreateTemplateParams): Promise<KitTemplate>

// Update template usage count
async function incrementTemplateUsage(templateId: string): Promise<void>
```

**Rationale:** Separerer template logic fra Vision analysis for bedre maintainability.

#### 2. Update Vision Function to Use Templates

**File:** `supabase/functions/analyze-jersey-vision/index.ts`

**Changes:** Integrer template creation/update i Vision flow.

**Flow:**
1. After Vision analysis completes
2. Check if template should be created (unique jersey)
3. Create template with embedding
4. Link to jersey_id for reference

**Rationale:** Templates oprettes automatisk når Vision identificerer unikke jerseys.

### Success Criteria:

#### Automated Verification:
- [ ] Template functions work
- [ ] Templates created correctly
- [ ] Usage count increments
- [ ] Similarity search finds templates

#### Manual Verification:
- [ ] Templates oprettes når unikke jerseys analyseres
- [ ] Similarity search finder eksisterende templates
- [ ] Usage count opdateres korrekt
- [ ] Template linking virker (example_jersey_id)

**⚠️ PAUSE HERE** - Verify template system

**Estimated Time:** 3-4 hours  
**Complexity:** Medium  
**Risk:** Low

---

## Testing Strategy

### Unit Tests:

**Location:** Co-located with source files (`.test.ts` or `__tests__/` directory)

1. **Vision Analysis Service:**
   - File: `apps/web/lib/services/__tests__/vision-analysis-service.test.ts`
   - Mock OpenAI API responses
   - Test error handling
   - Test response parsing

2. **Template Similarity Search:**
   - File: `supabase/functions/analyze-jersey-vision/__tests__/template.test.ts`
   - Mock embedding vectors
   - Test cosine similarity calculation
   - Test threshold matching (>0.85)

3. **Form Pre-fill Logic:**
   - File: `apps/web/components/jersey/__tests__/UploadJersey.test.tsx`
   - Test field mapping from Vision results
   - Test validation on pre-filled data

### Integration Tests:

**Location:** `apps/web/__tests__/integration/` or `supabase/functions/__tests__/integration/`

1. **End-to-end Upload Flow:**
   - File: `apps/web/__tests__/integration/jersey-upload-vision.test.ts`
   - Test full flow: draft creation → upload → Vision → metadata mapping → publish
   - Mock Edge Functions for CI/CD

2. **Template Matching Flow:**
   - File: `supabase/functions/__tests__/integration/template-matching.test.ts`
   - Test template creation
   - Test template reuse on similar jerseys

3. **Cleanup Flow:**
   - File: `apps/web/__tests__/integration/draft-cleanup.test.ts`
   - Test manual cleanup (modal close)
   - Test automatic cleanup (cron job simulation)

### Manual Tests:

**Test Checklist:**

1. **Upload Flow with Vision:**
   - [ ] Upload jersey with clear club badge → Vision detects club correctly
   - [ ] Upload jersey with player number → Vision detects player number
   - [ ] Upload jersey with season text → Vision detects season
   - [ ] Verify confidence scores displayed correctly
   - [ ] Verify form pre-filled with Vision results
   - [ ] Edit pre-filled fields → Changes saved correctly

2. **Template Matching:**
   - [ ] Upload same jersey twice → Second upload uses template, skips Vision
   - [ ] Upload similar jersey (different player) → Uses template, shows correct player
   - [ ] Verify template usage count increments

3. **Error Scenarios:**
   - [ ] Invalid image file → Error message shown, upload rejected
   - [ ] Vision API failure → Error message shown, manual input allowed
   - [ ] Network timeout → Retry option shown
   - [ ] Partial upload failure → Cleanup triggered, draft deleted

4. **Cleanup:**
   - [ ] Cancel draft → Draft and images deleted
   - [ ] Abandon draft for 24h → Cron job deletes draft
   - [ ] Verify no orphaned Storage folders

### Performance Tests:

1. **Vision Analysis Speed:**
   - [ ] Single image: <5 seconds
   - [ ] 3 images: <10 seconds
   - [ ] Template match: <1 second

2. **Upload Flow Speed:**
   - [ ] Draft creation: <500ms
   - [ ] Image upload (1 image): <2 seconds
   - [ ] Full upload flow (3 images + Vision): <15 seconds

---

## Dependencies

### Required Setup:

#### 1. OpenAI API Key (Phase 2)
**Where:** Supabase Edge Functions secrets  
**How to Set:**
```bash
# Via Supabase CLI
supabase secrets set OPENAI_API_KEY=sk-...

# Or via Supabase Dashboard:
# Edge Functions → analyze-jersey-vision → Settings → Secrets → Add OPENAI_API_KEY
```
**Security:** Never commit API key. Use Supabase secrets management only.

#### 2. pgvector Extension (Phase 1)
- Extension enabled via migration: `CREATE EXTENSION IF NOT EXISTS vector;`
- Verify: `SELECT * FROM pg_extension WHERE extname = 'vector';`

#### 3. pg_cron Extension (Phase 0A)
- Extension should already exist (from previous migrations)
- Verify: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`

#### 4. Image Processing Libraries
- Deno built-in image libraries for Edge Functions
- No additional dependencies required

### Environment Variables:

#### Edge Functions:
- `SUPABASE_URL` - Auto-set by Supabase (available via `Deno.env.get('SUPABASE_URL')`)
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-set by Supabase (available via `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')`)
- `OPENAI_API_KEY` - **Must be set manually** (see above)

#### Next.js API Routes:
- No new environment variables required
- Uses existing Clerk auth and Supabase setup

---

## Risk Assessment

### Risk 1: OpenAI API Costs
- **Impact:** High - Vision API er dyr (~$0.01-0.03 per image)
- **Mitigation:** Template matching skips Vision hvis similar jersey found, cache aggressively
- **Monitoring:** Track API usage, set budgets

### Risk 2: Accuracy
- **Impact:** Medium - Vision kan misread text/numbers
- **Mitigation:** Always allow user edit, show confidence scores, require confirmation
- **Monitoring:** Track confidence scores, collect user feedback

### Risk 3: Breaking Changes
- **Impact:** High - Upload flow ændringer kan påvirke eksisterende flow
- **Mitigation:** Draft pattern giver backward compatibility, test thoroughly
- **Rollback:** Revert migrations, disable Vision feature flag

### Risk 4: Performance
- **Impact:** Medium - Vision analysis kan tage 5-10 sekunder
- **Mitigation:** Show loading state, run async, use templates to skip Vision
- **Monitoring:** Track analysis time, optimize if needed

### Risk 5: Embedding Index Limitation
- **Impact:** Low - Similarity search uses sequential scan instead of index
- **Current State:** pgvector v0.8.0 doesn't support indexing vectors >2000 dimensions (we use 3072)
- **Mitigation:** Sequential scan acceptable for template matching (typically few templates). Can upgrade pgvector or switch to lower-dimensional embeddings if performance becomes issue
- **Monitoring:** Track similarity query performance, add indexes if pgvector upgraded

---

## Rollback Strategy

### If Phase 0A (Database) Fails:

**Scenario:** Migrations fail or break existing uploads

**Rollback Steps:**
1. **Revert migrations:**
   ```bash
   # Find last working migration
   supabase migration list
   
   # Revert to previous migration
   supabase migration repair --status reverted 20251130_create_jersey_images_table
   supabase migration repair --status reverted 20251130_add_vision_columns_to_jerseys
   supabase migration repair --status reverted 20251130_create_cleanup_function
   supabase migration repair --status reverted 20251130_schedule_cleanup_cron_job
   ```

2. **Manual cleanup if needed:**
   ```sql
   -- If jersey_images table exists but should be removed
   DROP TABLE IF EXISTS public.jersey_images CASCADE;
   
   -- If columns added but should be removed
   ALTER TABLE public.jerseys 
   DROP COLUMN IF EXISTS vision_raw,
   DROP COLUMN IF EXISTS vision_confidence,
   DROP COLUMN IF EXISTS status;
   
   -- If cleanup function exists but should be removed
   DROP FUNCTION IF EXISTS cleanup_abandoned_drafts();
   
   -- If cron job scheduled but should be removed
   SELECT cron.unschedule('cleanup-abandoned-drafts');
   ```

3. **Verify rollback:**
   - Existing upload flow still works
   - No broken database constraints
   - No orphaned data

### If Phase 0B (Upload Flow) Fails:

**Scenario:** Edge Functions or API routes break upload flow

**Rollback Steps:**
1. **Disable new features:**
   - Revert frontend changes (Git revert)
   - Keep existing `/api/v1/jerseys/upload-image` route active

2. **Remove new endpoints:**
   - Delete `apps/web/app/api/v1/jerseys/create-draft/route.ts`
   - Delete `apps/web/app/api/v1/jerseys/cancel-draft/[id]/route.ts`

3. **Remove Edge Functions:**
   ```bash
   supabase functions delete upload-jersey-image
   supabase functions delete cleanup-jersey-storage
   ```

4. **Revert frontend component:**
   - Restore original `UploadJersey.tsx` from Git history
   - Remove draft pattern logic

### If Phase 1 (pgvector) Fails:

**Rollback Steps:**
1. **Disable pgvector extension:**
   ```sql
   -- Note: Cannot fully remove extension if used by tables
   -- Instead, mark as unused and fix queries
   ```

2. **Remove vector columns:**
   ```sql
   -- Remove embedding columns (if not yet populated)
   ALTER TABLE public.jersey_images DROP COLUMN IF EXISTS image_embedding;
   ```

### If Phase 2 (Vision) Fails:

**Rollback Steps:**
1. **Remove Edge Function:**
   ```bash
   supabase functions delete analyze-jersey-vision
   ```

2. **Remove OpenAI API key:**
   ```bash
   supabase secrets unset OPENAI_API_KEY
   ```

3. **Revert frontend:**
   - Remove Vision analysis hooks and services
   - Remove auto-trigger logic from upload flow

### Quick Rollback Checklist:

- [ ] Identify which phase failed
- [ ] Revert migrations for that phase
- [ ] Remove Edge Functions for that phase
- [ ] Revert frontend changes for that phase
- [ ] Verify existing functionality still works
- [ ] Test upload flow end-to-end
- [ ] Document rollback reason in Linear issue

---

## Timeline Estimate

**Total:** ~1050 LOC, 23-33 timer

- **Phase 0A:** 4-5 timer (database foundation - KRITISK)
- **Phase 0B:** 4-5 timer (upload flow changes - KRITISK)
- **Phase 1:** 2-3 timer (database setup - pgvector)
- **Phase 2:** 8-12 timer (Vision Edge Function)
- **Phase 3:** 4-6 timer (frontend integration)
- **Phase 4:** 3-4 timer (template system)

**Complexity:** High  
**Timeline:** 3-4 dage (med pauser mellem phases)  
**Note:** Phase 0A og 0B skal gennemføres før Phase 1 starter

---

## References

- **Research:** `.project/research/vision-ai-upload-research.md`
- **Linear Issue:** [HUD-30](https://linear.app/huddle-world/issue/HUD-30)
- **Edge Function Pattern:** `supabase/functions/match-jersey-metadata/index.ts`
- **Upload Flow:** `apps/web/components/jersey/UploadJersey.tsx`
- **Metadata Matching:** `supabase/functions/match-jersey-metadata/README.md`

---

## Next Steps

1. **Review Plan** - Verify phases og success criteria (especially Phase 0A/0B split)
2. **Setup Environment** - Configure OpenAI API key in Supabase secrets (for Phase 2)
3. **Start Phase 0A** - Database foundation (migrations, cleanup function, cron job)
4. **Verify Phase 0A** - Test migrations thoroughly before proceeding
5. **Start Phase 0B** - Upload flow changes (draft pattern, Edge Functions, frontend)
6. **Verify Phase 0B** - Test upload flow end-to-end
7. **Continue with Phase 1** - Database setup (pgvector)
8. **Test Thoroughly** - Verify each phase before proceeding
9. **Monitor Costs** - Track OpenAI API usage (set budgets/alerts)
10. **Collect Feedback** - User feedback på Vision accuracy


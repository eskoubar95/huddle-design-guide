# Wardrobe Optimization & Complete CRUD - Upload, Edit, Delete Refactoring Implementation Plan

## Overview

Refaktorerer wardrobe-funktionaliteten til at bruge API hooks i stedet for direkte Supabase, migrerer UploadJersey til React Hook Form med shared validation schemas, og tilføjer edit/delete funktionalitet direkte i wardrobe view. Inkluderer også bulk operations og avanceret filtering. Metadata linking (HUD-28) er inkluderet som valgfri feature hvis metadata schema er tilgængelig.

**Hvorfor:** UploadJersey bruger direkte Supabase (~700 LOC), edit/delete er kun på detail page, og design/UX kan optimeres betydeligt. Vi skal have en komplet, optimeret wardrobe experience der gør det nemt at uploade, redigere og slette jerseys direkte fra wardrobe view.

**Mål:** Komplet CRUD funktionalitet i wardrobe med konsistent API-baserede patterns, optimeret UX, og valgfri metadata integration.

---

## Linear Issue

**Issue:** [HUD-27](https://linear.app/huddle-world/issue/HUD-27/feature-wardrobe-optimization-and-complete-crud-upload-edit-delete)  
**Status:** Backlog  
**Priority:** High (2)  
**Labels:** Feature  
**Team:** Huddle World  
**Branch:** `nicklaseskou95/hud-27-feature-wardrobe-optimization-complete-crud-upload-edit`  
**Created:** 2025-11-29  
**Updated:** 2025-11-29

---

## Current State Analysis

### Nuværende Tilstand:

**UploadJersey Component (`apps/web/components/jersey/UploadJersey.tsx`):**
- ✅ ~700 LOC multi-step form med image upload
- ✅ Drag & drop image reordering
- ✅ Progress tracking for uploads
- ❌ Bruger direkte Supabase client i stedet for API hooks
- ❌ Har egen Zod schema (`jerseySchema`) i stedet for shared schema
- ❌ Manual state management i stedet for React Hook Form
- ❌ Image upload håndteres direkte i component

**Wardrobe Page (`apps/web/app/(dashboard)/wardrobe/page.tsx`):**
- ✅ Grid layout med basic filtering (All/Public/Private)
- ✅ Bruger `useJerseys()` hook korrekt
- ✅ Har visibility toggle med `useUpdateJersey()`
- ❌ Mangler edit funktionalitet i grid
- ❌ Mangler delete funktionalitet i grid
- ❌ Mangler avanceret filtering (club, season, condition, jersey_type)
- ❌ Mangler search funktionalitet
- ❌ Mangler bulk operations

**Jersey Detail Page (`apps/web/app/(dashboard)/jersey/[id]/page.tsx`):**
- ✅ Har edit/delete funktionalitet
- ✅ Bruger `useUpdateJersey()` og `useDeleteJersey()` korrekt
- ✅ Delete confirmation dialog med `AlertDialog`
- ⚠️ Edit fungerer, men kun på detail page (ikke optimalt)

**API Infrastructure:**
- ✅ Hooks eksisterer: `useCreateJersey()`, `useUpdateJersey()`, `useDeleteJersey()` i `lib/hooks/use-jerseys.ts`
- ✅ API Routes: `/api/v1/jerseys` (POST), `/api/v1/jerseys/[id]` (PATCH, DELETE)
- ✅ Service Layer: `JerseyService` med validation
- ✅ Validation Schemas: `jerseyCreateSchema`, `jerseyUpdateSchema` i `lib/validation/jersey-schemas.ts`
- ✅ Repository Pattern: `JerseyRepository` i `lib/repositories/jersey-repository.ts`

**Metadata Schema (HUD-28):**
- ✅ Metadata schema eksisterer (`metadata.clubs`, `metadata.players`, `metadata.seasons`)
- ✅ Jersey table har FK columns: `club_id`, `player_id`, `season_id` (nullable)
- ⚠️ Metadata matching service muligvis ikke implementeret endnu
- ⚠️ Transfermarkt API integration muligvis ikke klar

### Key Discoveries:

1. **API Hooks Pattern:** Alle CRUD hooks eksisterer og bruger TanStack Query med cache invalidation
2. **Validation Pattern:** Shared schemas i `lib/validation/jersey-schemas.ts` - skal bruges i stedet for component-local schema
3. **Form Pattern:** `.cursor/rules/12-forms_actions_validation.mdc` specificerer React Hook Form + Zod resolver
4. **Image Upload:** Supabase Storage pattern eksisterer, men skal håndteres via API eller service
5. **Confirmation Dialogs:** `AlertDialog` component eksisterer og bruges i detail page
6. **Metadata Support:** FK columns eksisterer, men metadata matching er valgfri (hvis HUD-28 ikke er færdig)

---

## Desired End State

### Upload Functionality:
- ✅ UploadJersey bruger `useCreateJersey()` hook i stedet for direkte Supabase
- ✅ UploadJersey bruger shared `jerseyCreateSchema` fra `lib/validation/jersey-schemas.ts`
- ✅ React Hook Form + zodResolver integration
- ✅ Image upload håndteres via API route eller service med proper error handling
- ✅ Progress indicator for image uploads
- ✅ Drag & drop image reordering fungerer korrekt
- ✅ Form validation viser tydelige fejlbeskeder
- ✅ Success state med redirect eller modal close
- ⚠️ Valgfri metadata matching (hvis HUD-28 er tilgængelig)

### Edit Functionality:
- ✅ Edit modal/component tilgængelig direkte fra wardrobe grid
- ✅ EditJersey komponent bruger `useUpdateJersey()` hook
- ✅ EditJersey bruger shared `jerseyUpdateSchema` for validation
- ✅ Kan opdatere alle felter (club, season, type, condition, images, etc.)
- ✅ Image replacement/upload i edit mode
- ✅ Optimistic UI updates med TanStack Query
- ✅ Error handling med toast notifications

### Delete Functionality:
- ✅ Delete confirmation dialog i wardrobe (ikke kun på detail page)
- ✅ Delete bruger `useDeleteJersey()` hook
- ✅ Bulk delete funktionalitet (multi-select jerseys)
- ✅ Optimistic UI updates
- ✅ Error handling med rollback hvis delete fejler
- ✅ Confirmation dialog for bulk delete viser antal jerseys

### Wardrobe UI/UX:
- ✅ Design optimering til at matche style guide (HUD-20, HUD-21)
- ✅ Bedre grid layout med responsive breakpoints
- ✅ Avanceret filtering (club, season, condition rating, jersey type, visibility)
- ✅ Search funktionalitet (søg i club, season, player name)
- ✅ Sort options (newest, oldest, condition, club name)
- ✅ Empty states med tydelige CTAs
- ✅ Loading states med skeletons
- ✅ Error states med retry funktionalitet

### Performance & Polish:
- ✅ Image lazy loading i grid
- ✅ Virtual scrolling for store collections (hvis >100 jerseys)
- ✅ Optimistic updates for alle mutations
- ✅ Proper cache invalidation
- ✅ Accessibility (keyboard navigation, ARIA labels, screen reader support)
- ✅ Mobile responsive design
- ✅ Analytics tracking for upload/edit/delete actions

---

## What We're NOT Doing

**Out of Scope (v1):**
- ❌ Full metadata matching implementation (HUD-28) - kun valgfri support hvis metadata er tilgængelig
- ❌ AI vision model integration for jersey recognition
- ❌ Automatic metadata FK attachment uden user confirmation
- ❌ Position normalization (positions tabel)
- ❌ Live match/fixture data integration
- ❌ Full global coverage af alle competitions/clubs
- ❌ Hard validation der tvinger metadata links

**Future Extensions:**
- Full metadata matching integration (når HUD-28 er færdig)
- AI vision model til jersey image analysis
- Advanced analytics baseret på metadata
- Bulk edit funktionalitet (edit multiple jerseys samtidig)

---

## Implementation Approach

**Strategy:**
1. **Refactor Upload First:** Migrer UploadJersey til API hooks + RHF (foundation)
2. **Add Edit in Wardrobe:** Create EditJersey component og integrer i grid
3. **Add Delete & Bulk:** Implementer delete og bulk operations
4. **Enhance UI/UX:** Avanceret filtering, search, sort
5. **Polish & Performance:** Lazy loading, accessibility, analytics

**Key Principles:**
- **API-First:** Alt CRUD via API hooks, ikke direkte Supabase
- **Shared Validation:** Brug shared schemas, ikke component-local
- **React Hook Form:** Standardiser alle forms med RHF + zodResolver
- **Optimistic Updates:** TanStack Query cache invalidation for instant feedback
- **Optional Metadata:** Support metadata FK's hvis tilgængelig, men ikke påkrævet
- **Backward Compatible:** Eksisterende jerseys virker uden ændringer

---

## Phase 1: Upload Functionality Refactoring

### Overview

Refaktorerer UploadJersey komponent til at bruge `useCreateJersey()` hook i stedet for direkte Supabase, migrerer til React Hook Form med shared validation schema, og håndterer image upload via API eller service.

### Changes Required:

#### 1. Update Validation Schema ✅ FIXED

**File:** `apps/web/lib/validation/jersey-schemas.ts`

**Changes:** ✅ Schema er opdateret til at matche UploadJersey's `JERSEY_TYPES` array.

**Updated Schema:**
```typescript
export const jerseyCreateSchema = z.object({
  club: z.string().trim().min(1, "Club name is required").max(100),
  season: z.string().trim().min(1, "Season is required").max(20),
  jerseyType: z.enum([
    "Home",
    "Away",
    "Third",
    "Fourth",
    "Special Edition",
    "GK Home",
    "GK Away",
    "GK Third",
  ]),
  playerName: z.string().trim().max(50).optional(),
  playerNumber: z.string().trim().max(3).optional(),
  badges: z.array(z.string()).max(10).optional(),
  conditionRating: z.number().int().min(1).max(10).optional(),
  notes: z.string().trim().max(1000).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
  images: z.array(z.string().url()).min(1, "At least one image required").max(5),
});
```

**Note:** ✅ Schema enum values matcher nu UploadJersey's `JERSEY_TYPES` array præcist.

**Rationale:** Ensartet validation på tværs af applikationen.

#### 2. Image Upload Strategy ✅ CLARIFIED

**Decision:** Image upload håndteres **client-side** i UploadJersey component.

**Rationale:**
- Supabase Storage bucket permissions er allerede konfigureret
- Eksisterende pattern i UploadJersey fungerer godt
- Simpler implementation (ingen ekstra API route nødvendig)
- Bedre UX med progress tracking direkte i component

**Implementation:**
- Upload images til Supabase Storage i component (behold eksisterende pattern)
- Send image URLs til API via `useCreateJersey()` hook
- Error handling håndteres i component med toast notifications
- Progress tracking vises i component

**Note:** Hvis vi senere vil have server-side upload (fx for image processing/optimization), kan vi tilføje API route senere.

#### 3. Refactor UploadJersey Component

**File:** `apps/web/components/jersey/UploadJersey.tsx`

**Changes:** 
- Erstat direkte Supabase calls med `useCreateJersey()` hook
- Migrer til React Hook Form + zodResolver
- Brug shared `jerseyCreateSchema` i stedet for local schema (✅ schema er nu opdateret)
- **Behold image upload i component** (client-side approach - se Section 2)
- Opdater error handling til at bruge toast notifications
- Behold multi-step form flow
- Behold drag & drop image reordering
- **Remove local `jerseySchema`** - brug shared schema i stedet

**Key Changes:**
```typescript
// Before: Direct Supabase
const supabase = createClient();
await supabase.from("jerseys").insert({...});

// After: API Hook
const createJersey = useCreateJersey();
await createJersey.mutateAsync({
  club: formData.club,
  season: formData.season,
  jerseyType: formData.jerseyType,
  // ... rest of fields
  images: imageUrls, // Uploaded URLs
});
```

**React Hook Form Integration:**
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { jerseyCreateSchema } from "@/lib/validation/jersey-schemas";

const form = useForm({
  resolver: zodResolver(jerseyCreateSchema),
  defaultValues: {
    club: "",
    season: "",
    jerseyType: "Home",
    // ... rest
  },
});
```

**Rationale:** Konsistent API-baseret pattern, bedre error handling, shared validation.

#### 4. Verify JerseyService Handles Image URLs ✅ VERIFIED

**File:** `apps/web/lib/services/jersey-service.ts`

**Status:** ✅ Service accepterer allerede image URLs i `images` array - ingen ændringer nødvendige.

**Note:** Service transformerer `images` array direkte til database uden ændringer, hvilket er korrekt for client-side upload approach.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint` (max-warnings=100)
- [ ] Build passes: `npm run build`
- [ ] UploadJersey bruger `useCreateJersey()` hook (grep verification)
- [ ] UploadJersey bruger shared `jerseyCreateSchema` (grep verification)
- [ ] UploadJersey bruger React Hook Form (grep verification)

#### Manual Verification:
- [ ] Upload jersey fungerer via API hook
- [ ] Form validation viser tydelige fejlbeskeder
- [ ] Image upload progress vises korrekt
- [ ] Drag & drop image reordering fungerer
- [ ] Success state redirecter eller lukker modal
- [ ] Error handling viser toast notifications
- [ ] Multi-step form flow fungerer korrekt

**⚠️ PAUSE HERE** - Manual approval before Phase 2

---

## Phase 2: Edit Functionality in Wardrobe

### Overview

Opretter EditJersey komponent og integrerer den i wardrobe grid, så brugere kan redigere jerseys direkte fra wardrobe view uden at navigere til detail page.

### Changes Required:

#### 1. Create EditJersey Component

**File:** `apps/web/components/jersey/EditJersey.tsx` (NEW)

**Changes:** Opret edit modal component med React Hook Form + zodResolver, brug `useUpdateJersey()` hook, support image replacement.

**Component Structure:**
```typescript
interface EditJerseyProps {
  jersey: Jersey;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditJersey = ({ jersey, isOpen, onClose, onSuccess }: EditJerseyProps) => {
  const form = useForm({
    resolver: zodResolver(jerseyUpdateSchema),
    defaultValues: {
      club: jersey.club,
      season: jersey.season,
      // ... rest of fields
    },
  });

  const updateJersey = useUpdateJersey();

  const onSubmit = async (data: JerseyUpdateInput) => {
    try {
      await updateJersey.mutateAsync({
        id: jersey.id,
        data,
      });
      toast({ title: "Jersey Updated" });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // ... form JSX
};
```

**Features:**
- React Hook Form med shared `jerseyUpdateSchema`
- Image replacement/upload support
- Optimistic UI updates (TanStack Query håndterer dette)
- Error handling med toast notifications
- Loading states

**Rationale:** Genbrugelig edit komponent der kan bruges både i wardrobe og detail page.

#### 2. Integrate EditJersey in Wardrobe Grid

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** 
- Tilføj edit button i jersey card hover actions
- Åbn EditJersey modal ved klik
- Opdater grid efter successful edit (TanStack Query håndterer cache invalidation)

**Grid Integration:**
```typescript
const [editingJersey, setEditingJersey] = useState<Jersey | null>(null);

// In jersey card:
<Button
  onClick={(e) => {
    e.stopPropagation();
    setEditingJersey(jersey);
  }}
>
  Edit
</Button>

// Modal:
{editingJersey && (
  <EditJersey
    jersey={editingJersey}
    isOpen={!!editingJersey}
    onClose={() => setEditingJersey(null)}
    onSuccess={() => {
      // Cache invalidation håndteres automatisk af TanStack Query
      setEditingJersey(null);
    }}
  />
)}
```

**Rationale:** Edit funktionalitet direkte i wardrobe for bedre UX.

#### 3. Update JerseyService for Image Updates (if needed)

**File:** `apps/web/lib/services/jersey-service.ts`

**Changes:** Verificer at `updateJersey` håndterer image updates korrekt. Hvis nødvendigt, tilføj image upload logic.

**Rationale:** Support image replacement i edit mode.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`
- [ ] EditJersey bruger `useUpdateJersey()` hook
- [ ] EditJersey bruger shared `jerseyUpdateSchema`

#### Manual Verification:
- [ ] Edit modal åbner fra wardrobe grid
- [ ] Edit jersey fungerer korrekt
- [ ] Image replacement fungerer
- [ ] Optimistic updates vises korrekt
- [ ] Error handling fungerer
- [ ] Modal lukker efter successful edit
- [ ] Grid opdateres automatisk efter edit

**⚠️ PAUSE HERE** - Manual approval before Phase 3

---

## Phase 3: Delete Functionality & Bulk Operations

### Overview

Tilføjer delete funktionalitet i wardrobe med confirmation dialog, og implementerer bulk operations (multi-select + bulk delete).

### Changes Required:

#### 1. Create DeleteJerseyDialog Component

**File:** `apps/web/components/jersey/DeleteJerseyDialog.tsx` (NEW)

**Changes:** Opret delete confirmation dialog component der bruger `useDeleteJersey()` hook.

**Component Structure:**
```typescript
interface DeleteJerseyDialogProps {
  jersey: Jersey;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const DeleteJerseyDialog = ({ jersey, isOpen, onClose, onSuccess }: DeleteJerseyDialogProps) => {
  const deleteJersey = useDeleteJersey();

  const handleDelete = async () => {
    try {
      await deleteJersey.mutateAsync(jersey.id);
      toast({ title: "Jersey Deleted" });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Jersey?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete "{jersey.club} {jersey.season}" from your collection.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
```

**Rationale:** Genbrugelig delete confirmation dialog.

#### 2. Create BulkDeleteDialog Component

**File:** `apps/web/components/jersey/BulkDeleteDialog.tsx` (NEW)

**Changes:** Opret bulk delete confirmation dialog der viser antal jerseys og bruger `useDeleteJersey()` hook for hver jersey.

**Component Structure:**
```typescript
interface BulkDeleteDialogProps {
  jerseyIds: string[];
  jerseys: Jersey[]; // For displaying jersey names in errors
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const BulkDeleteDialog = ({ jerseyIds, jerseys, isOpen, onClose, onSuccess }: BulkDeleteDialogProps) => {
  const deleteJersey = useDeleteJersey();
  const [deleting, setDeleting] = useState(false);
  const [deletedCount, setDeletedCount] = useState(0);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const handleBulkDelete = async () => {
    setDeleting(true);
    setDeletedCount(0);
    setFailedIds([]);
    setErrors(new Map());

    for (const id of jerseyIds) {
      try {
        await deleteJersey.mutateAsync(id);
        setDeletedCount((prev) => prev + 1);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        setFailedIds((prev) => [...prev, id]);
        setErrors((prev) => new Map(prev).set(id, errorMessage));
      }
    }

    setDeleting(false);
    
    if (failedIds.length === 0) {
      toast({ 
        title: "Success", 
        description: `Deleted ${jerseyIds.length} jerseys successfully` 
      });
      onSuccess?.();
      onClose();
    } else {
      // Show detailed error message
      const failedJerseys = jerseys
        .filter((j) => failedIds.includes(j.id))
        .map((j) => `${j.club} ${j.season}`)
        .join(", ");
      
      toast({ 
        title: `Partial Success`,
        description: `Deleted ${deletedCount} of ${jerseyIds.length} jerseys. Failed: ${failedJerseys}`,
        variant: "destructive",
        duration: 10000, // Longer duration for error details
      });
      
      // Don't close dialog - let user see errors and retry if needed
    }
  };

  // ... dialog JSX with error details display
};
```

**Error Handling Improvements:**
- ✅ Tracks specific errors per jersey ID
- ✅ Shows jersey names in error toast (not just IDs)
- ✅ Longer toast duration for error details
- ✅ Dialog stays open on partial failure for retry option
- ✅ Clear success/failure messaging

**Rationale:** Bulk delete med proper error handling og progress tracking.

#### 3. Add Multi-Select to Wardrobe

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** 
- Tilføj select mode toggle
- Tilføj checkboxes til jersey cards i select mode
- Tilføj bulk actions toolbar (delete, etc.)
- Integrer BulkDeleteDialog

**Multi-Select State:**
```typescript
const [selectMode, setSelectMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

const toggleSelect = (id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    return next;
  });
};

const selectAll = () => {
  setSelectedIds(new Set(jerseys.map((j) => j.id)));
};

const clearSelection = () => {
  setSelectedIds(new Set());
  setSelectMode(false);
};
```

**Bulk Actions Toolbar:**
```typescript
{selectMode && selectedIds.size > 0 && (
  <div className="fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-40">
    <div className="flex gap-2 bg-background border rounded-lg p-2 shadow-lg">
      <span className="text-sm self-center px-2">
        {selectedIds.size} selected
      </span>
      <Button
        variant="destructive"
        onClick={() => setShowBulkDeleteDialog(true)}
      >
        Delete ({selectedIds.size})
      </Button>
      <Button variant="outline" onClick={clearSelection}>
        Cancel
      </Button>
    </div>
  </div>
)}
```

**Rationale:** Multi-select pattern for bulk operations.

#### 4. Integrate Delete in Wardrobe Grid

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** 
- Tilføj delete button i jersey card hover actions
- Integrer DeleteJerseyDialog
- Opdater grid efter successful delete

**Rationale:** Delete funktionalitet direkte i wardrobe.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`
- [ ] DeleteJerseyDialog bruger `useDeleteJersey()` hook
- [ ] BulkDeleteDialog håndterer errors korrekt

#### Manual Verification:
- [ ] Delete confirmation dialog vises korrekt
- [ ] Single delete fungerer fra wardrobe
- [ ] Multi-select mode fungerer
- [ ] Bulk delete fungerer korrekt
- [ ] Bulk delete viser antal jerseys
- [ ] Bulk delete viser jersey names i error messages (ikke kun IDs)
- [ ] Partial failure håndteres korrekt (vis hvilke jerseys fejlede)
- [ ] Error handling fungerer med detaljerede fejlbeskeder
- [ ] Grid opdateres automatisk efter successful deletes
- [ ] Optimistic updates fungerer
- [ ] Retry funktionalitet fungerer ved partial failure

**⚠️ PAUSE HERE** - Manual approval before Phase 4

---

## Phase 4: Wardrobe UI/UX Optimization

### Overview

Optimerer wardrobe UI/UX med avanceret filtering, search, sort, og design polish til at matche style guide (HUD-20, HUD-21).

### Changes Required:

#### 1. Create WardrobeFilters Component

**File:** `apps/web/app/(dashboard)/wardrobe/components/WardrobeFilters.tsx` (NEW)

**Changes:** Opret avanceret filtering UI med dropdowns for club, season, jersey type, condition rating, og visibility.

**Component Structure:**
```typescript
interface WardrobeFiltersProps {
  filters: WardrobeFilterState;
  onFiltersChange: (filters: WardrobeFilterState) => void;
  jerseys: Jersey[];
}

interface WardrobeFilterState {
  visibility: "all" | "public" | "private";
  club?: string;
  season?: string;
  jerseyType?: string;
  conditionRating?: number;
}

export const WardrobeFilters = ({ filters, onFiltersChange, jerseys }: WardrobeFiltersProps) => {
  // Extract unique values from jerseys for dropdowns
  const uniqueClubs = useMemo(() => [...new Set(jerseys.map((j) => j.club))], [jerseys]);
  const uniqueSeasons = useMemo(() => [...new Set(jerseys.map((j) => j.season))], [jerseys]);
  const uniqueTypes = useMemo(() => [...new Set(jerseys.map((j) => j.jersey_type))], [jerseys]);

  return (
    <div className="space-y-4">
      {/* Visibility filter */}
      <Select
        value={filters.visibility}
        onValueChange={(value) => onFiltersChange({ ...filters, visibility: value })}
      >
        {/* ... */}
      </Select>

      {/* Club filter */}
      <Select
        value={filters.club || "all"}
        onValueChange={(value) => onFiltersChange({ ...filters, club: value === "all" ? undefined : value })}
      >
        {/* ... */}
      </Select>

      {/* Season filter */}
      {/* ... */}

      {/* Jersey type filter */}
      {/* ... */}

      {/* Condition rating filter (slider) */}
      {/* ... */}
    </div>
  );
};
```

**Rationale:** Avanceret filtering for bedre UX.

#### 2. Create WardrobeSearch Component

**File:** `apps/web/app/(dashboard)/wardrobe/components/WardrobeSearch.tsx` (NEW)

**Changes:** Opret search component med debounced input der søger i club, season, og player name.

**Component Structure:**
```typescript
import { useDebounce } from "@/lib/hooks/use-debounce"; // ✅ Hook er oprettet

interface WardrobeSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const WardrobeSearch = ({ searchQuery, onSearchChange }: WardrobeSearchProps) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const debouncedQuery = useDebounce(localQuery, 300); // ✅ Hook eksisterer nu

  useEffect(() => {
    onSearchChange(debouncedQuery);
  }, [debouncedQuery, onSearchChange]);

  return (
    <Input
      placeholder="Search by club, season, or player..."
      value={localQuery}
      onChange={(e) => setLocalQuery(e.target.value)}
    />
  );
};
```

**Note:** ✅ `useDebounce` hook er oprettet i `apps/web/lib/hooks/use-debounce.ts` med 300ms default delay.

**Rationale:** Search funktionalitet med debounce for performance.

#### 3. Add Sort Options

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** Tilføj sort dropdown med options: newest, oldest, condition (high to low), club name (A-Z).

**Sort Implementation:**
```typescript
type SortOption = "newest" | "oldest" | "condition" | "club";

const [sortBy, setSortBy] = useState<SortOption>("newest");

const sortedJerseys = useMemo(() => {
  const sorted = [...filteredJerseys];
  
  switch (sortBy) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case "condition":
      return sorted.sort((a, b) => (b.condition_rating || 0) - (a.condition_rating || 0));
    case "club":
      return sorted.sort((a, b) => a.club.localeCompare(b.club));
    default:
      return sorted;
  }
}, [filteredJerseys, sortBy]);
```

**Rationale:** Sort funktionalitet for bedre navigation.

#### 4. Add Empty/Loading/Error States

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** 
- Tilføj empty state med CTA til upload
- Tilføj loading skeletons
- Tilføj error state med retry funktionalitet

**Empty State:**
```typescript
{!loading && jerseys.length === 0 && (
  <div className="text-center py-12">
    <h3 className="text-lg font-semibold mb-2">No jerseys yet</h3>
    <p className="text-muted-foreground mb-4">Start building your collection</p>
    <Button onClick={() => setUploadOpen(true)}>
      <Plus className="w-4 h-4 mr-2" />
      Upload Your First Jersey
    </Button>
  </div>
)}
```

**Loading State:**
```typescript
import { Skeleton } from "@/components/ui/skeleton"; // ✅ Component eksisterer

{loading && (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
    {Array.from({ length: 10 }).map((_, i) => (
      <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
    ))}
  </div>
)}
```

**Note:** ✅ `Skeleton` component eksisterer i `apps/web/components/ui/skeleton.tsx` (shadcn/ui standard).

**Error State:**
```typescript
{jerseysError && (
  <div className="text-center py-12">
    <h3 className="text-lg font-semibold mb-2">Failed to load jerseys</h3>
    <p className="text-muted-foreground mb-4">{jerseysError.message}</p>
    <Button onClick={() => refetchJerseys()}>Retry</Button>
  </div>
)}
```

**Rationale:** Bedre UX med tydelige states.

#### 5. Design Polish (Style Guide Compliance)

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** 
- Opdater grid layout til at matche style guide (HUD-20, HUD-21)
- Opdater spacing og colors
- Opdater card hover states
- Opdater button styles

**Rationale:** Konsistent design på tværs af applikationen.

#### 6. Mobile Responsive Design

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** 
- Opdater grid breakpoints for mobile
- Opdater filter UI for mobile (drawer eller bottom sheet)
- Opdater bulk actions for mobile

**Rationale:** Mobile-first design.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`
- [ ] Responsive breakpoints fungerer korrekt

#### Manual Verification:
- [ ] Avanceret filtering fungerer korrekt
- [ ] Search fungerer med debounce
- [ ] Sort options fungerer korrekt
- [ ] Empty state vises korrekt
- [ ] Loading skeletons vises korrekt
- [ ] Error state med retry fungerer
- [ ] Design matcher style guide
- [ ] Mobile responsive design fungerer
- [ ] Alle states er tydelige og brugervenlige

**⚠️ PAUSE HERE** - Manual approval before Phase 5

---

## Phase 5: Performance & Polish

### Overview

Tilføjer performance optimeringer (lazy loading, virtual scrolling), accessibility improvements, og analytics tracking.

### Changes Required:

#### 1. Image Lazy Loading

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx`

**Changes:** Tilføj lazy loading til jersey images i grid.

**Implementation:**
```typescript
<img
  src={jersey.images[0] || "/placeholder.svg"}
  alt={`${jersey.club} ${jersey.season}`}
  loading="lazy"
  className="w-full h-full object-cover transition-all group-hover:scale-105"
/>
```

**Rationale:** Bedre performance ved initial page load.

#### 2. Virtual Scrolling (Optional)

**File:** `apps/web/app/(dashboard)/wardrobe/components/VirtualizedJerseyGrid.tsx` (NEW, optional)

**Changes:** Hvis >100 jerseys, overvej virtual scrolling med `react-window` eller `react-virtuoso`.

**Rationale:** Bedre performance ved store collections.

#### 3. Optimistic Updates Enhancement

**File:** `apps/web/lib/hooks/use-jerseys.ts`

**Changes:** Verificer at optimistic updates fungerer korrekt. Hvis nødvendigt, tilføj optimistic update logic.

**Current Pattern:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ["jerseys"] });
}
```

**Rationale:** Instant feedback for bedre UX.

#### 4. Accessibility Improvements

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx` og komponenter

**Changes:** 
- Tilføj ARIA labels til alle interactive elements
- Tilføj keyboard navigation support
- Tilføj screen reader support
- Tilføj focus management i modals

**Examples:**
```typescript
<Button
  aria-label={`Edit ${jersey.club} ${jersey.season}`}
  onClick={handleEdit}
>
  Edit
</Button>

<div role="grid" aria-label="Jersey collection">
  {/* ... */}
</div>
```

**Rationale:** Accessibility compliance (WCAG 2.1 AA).

#### 5. Analytics Tracking

**File:** `apps/web/app/(dashboard)/wardrobe/page.tsx` og komponenter

**Changes:** Tilføj analytics tracking for upload/edit/delete actions.

**Implementation:**
```typescript
import * as Sentry from "@sentry/nextjs";

const handleUpload = async () => {
  try {
    await createJersey.mutateAsync(data);
    Sentry.addBreadcrumb({
      category: "jersey",
      message: "Jersey uploaded",
      level: "info",
    });
  } catch (error) {
    Sentry.captureException(error);
  }
};
```

**Rationale:** Tracking for product insights.

#### 6. Cache Invalidation Optimization

**File:** `apps/web/lib/hooks/use-jerseys.ts`

**Changes:** Verificer at cache invalidation er optimal. Hvis nødvendigt, tilføj selective invalidation.

**Rationale:** Bedre performance ved cache management.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`
- [ ] Lighthouse performance score > 90 (hvis muligt)

#### Manual Verification:
- [ ] Image lazy loading fungerer korrekt
- [ ] Virtual scrolling fungerer (hvis implementeret)
- [ ] Optimistic updates fungerer korrekt
- [ ] Keyboard navigation fungerer
- [ ] Screen reader support fungerer
- [ ] Analytics tracking fungerer
- [ ] Cache invalidation er optimal
- [ ] Performance er acceptabel (< 2 sec page load)

**⚠️ PAUSE HERE** - Final manual approval

---

## Optional: Metadata Integration (HUD-28)

### Overview

Hvis HUD-28 metadata schema er tilgængelig, tilføj valgfri metadata matching i upload/edit flows.

### Changes Required:

#### 1. Add Metadata Fields to Validation Schema

**File:** `apps/web/lib/validation/jersey-schemas.ts`

**Changes:** Tilføj valgfrie metadata FK fields til schema.

```typescript
export const jerseyCreateSchema = z.object({
  // ... existing fields
  clubId: z.string().optional(), // FK to metadata.clubs.id (database: club_id)
  playerId: z.string().optional(), // FK to metadata.players.id (database: player_id)
  seasonId: z.string().uuid().optional(), // FK to metadata.seasons.id (database: season_id)
});
```

**Note:** ✅ JerseyService transformerer automatisk camelCase (`clubId`) til snake_case (`club_id`) i database, så schema kan bruge camelCase for konsistens med resten af API.

**Rationale:** Support metadata linking hvis tilgængelig.

#### 2. Update JerseyService for Metadata

**File:** `apps/web/lib/services/jersey-service.ts`

**Changes:** Opdater `createJersey` og `updateJersey` til at håndtere metadata FK's.

**Rationale:** Support metadata linking i service layer.

#### 3. Add Metadata Matching UI (if service available)

**File:** `apps/web/components/jersey/UploadJersey.tsx` og `EditJersey.tsx`

**Changes:** Hvis metadata matching service er tilgængelig, tilføj autofill UI med club/player dropdowns.

**Rationale:** Smart autofill baseret på metadata.

### Success Criteria:

#### Automated Verification:
- [ ] Type check passes: `npm run typecheck`
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run build`

#### Manual Verification:
- [ ] Metadata FK's gemmes korrekt (hvis tilgængelig)
- [ ] Metadata matching fungerer (hvis service tilgængelig)
- [ ] User kan acceptere eller redigere metadata forslag

**Note:** Denne fase er valgfri og afhænger af HUD-28 implementation status.

---

## Testing Strategy

### Unit Tests:
- [ ] Validation schema tests (`jersey-schemas.test.ts`)
- [ ] Service layer tests (`jersey-service.test.ts`)
- [ ] Hook tests (`use-jerseys.test.ts`)

### Integration Tests:
- [ ] API route tests (`/api/v1/jerseys/route.test.ts`)
- [ ] End-to-end upload flow test
- [ ] End-to-end edit flow test
- [ ] End-to-end delete flow test

### Manual Tests:
- [ ] Upload jersey med alle felter
- [ ] Upload jersey med kun required felter
- [ ] Edit jersey fra wardrobe
- [ ] Edit jersey fra detail page
- [ ] Delete jersey fra wardrobe
- [ ] Bulk delete jerseys
- [ ] Filter jerseys efter alle kriterier
- [ ] Search jerseys
- [ ] Sort jerseys
- [ ] Mobile responsive design
- [ ] Keyboard navigation
- [ ] Screen reader support

---

## References

- **Linear:** [HUD-27](https://linear.app/huddle-world/issue/HUD-27/feature-wardrobe-optimization-and-complete-crud-upload-edit-delete)
- **Related Issues:** HUD-20 (Color Palette), HUD-21 (Layout Optimization), HUD-28 (Metadata Layer)
- **Form Patterns:** `.cursor/rules/12-forms_actions_validation.mdc`
- **API Patterns:** `.cursor/rules/21-api_design.mdc`
- **Database Schema:** `supabase/migrations/`
- **Existing Components:**
  - `apps/web/components/jersey/UploadJersey.tsx` (refactor)
  - `apps/web/app/(dashboard)/wardrobe/page.tsx` (enhance)
  - `apps/web/app/(dashboard)/jersey/[id]/page.tsx` (reference)
- **API Hooks:** `apps/web/lib/hooks/use-jerseys.ts`
- **Validation:** `apps/web/lib/validation/jersey-schemas.ts` (✅ opdateret med korrekt jersey type enum)
- **Service:** `apps/web/lib/services/jersey-service.ts`
- **Utilities:** `apps/web/lib/hooks/use-debounce.ts` (✅ oprettet)
- **UI Components:** `apps/web/components/ui/skeleton.tsx` (✅ verificeret eksisterer)

---

## Estimated Timeline

- **Phase 1:** 4-5 hours (~400 LOC)
- **Phase 2:** 3-4 hours (~300 LOC)
- **Phase 3:** 3-4 hours (~350 LOC)
- **Phase 4:** 4-5 hours (~400 LOC)
- **Phase 5:** 2-3 hours (~150 LOC)
- **Optional Metadata:** 2-3 hours (~200 LOC, hvis HUD-28 er tilgængelig)

**Total:** 16-21 hours (~1600 LOC)

---

## Risk Assessment

**Low Risk:**
- API hooks eksisterer allerede
- Validation schemas eksisterer
- Service layer eksisterer

**Medium Risk:**
- Refactoring af eksisterende UploadJersey komponent (~700 LOC)
- Image upload håndtering (kan være kompleks)
- Bulk operations (ny funktionalitet)

**Mitigation:**
- Test hver phase grundigt før næste
- Behold eksisterende funktionalitet under refactoring
- Incremental changes med pause points

---

## Success Metrics

- ✅ UploadJersey bruger API hooks (100% migration)
- ✅ Edit/delete fungerer i wardrobe (100% coverage)
- ✅ Bulk operations fungerer korrekt
- ✅ Avanceret filtering og search fungerer
- ✅ Performance < 2 sec page load
- ✅ Accessibility compliance (WCAG 2.1 AA)
- ✅ Mobile responsive design

---

**Plan Created:** 2025-11-29  
**Last Updated:** 2025-11-29  
**Status:** ✅ Ready for Implementation (Critical Issues Fixed)

---

## Changelog

### 2025-11-29 - Validation Fixes

**Critical Fixes:**
- ✅ **Jersey Type Enum:** Opdateret `jerseyCreateSchema` enum til at matche UploadJersey's `JERSEY_TYPES` array
- ✅ **useDebounce Hook:** Oprettet `apps/web/lib/hooks/use-debounce.ts` med 300ms default delay

**Warnings Addressed:**
- ✅ **Image Upload Strategy:** Klarificeret at image upload håndteres client-side i component
- ✅ **Bulk Delete Error Handling:** Forbedret med detaljerede error messages, jersey names i errors, og retry funktionalitet
- ✅ **Metadata Field Names:** Verificeret at JerseyService transformerer camelCase til snake_case korrekt
- ✅ **Skeleton Component:** Verificeret at component eksisterer i `apps/web/components/ui/skeleton.tsx`

**Plan Improvements:**
- Tilføjet specifikke success criteria for bulk delete error handling
- Klarificeret image upload approach i Phase 1
- Opdateret references med nye hooks og verificerede komponenter


# Fase 3.1: Migrer UI Komponenter (shadcn/ui) - Implementation Plan

## Overview

Migrer alle shadcn/ui komponenter fra `src/components/ui/` til `apps/web/components/ui/` som første skridt i komponent migration. Alle 49 UI komponenter er stateless og bør migrere nemt til Next.js app.

**Mål:** Alle UI komponenter er tilgængelige i Next.js app, fungerer identisk med eksisterende frontend, og kan bruges i nye Next.js pages.

---

## Linear Issue

**Issue:** HUD-7  
**Title:** Fase 3.1: Migrer UI komponenter (shadcn/ui)  
**Status:** Todo  
**Labels:** Migration, Frontend, Feature  
**Project:** Frontend Migration  
**URL:** https://linear.app/huddle-world/issue/HUD-7/fase-31-migrer-ui-komponenter-shadcnui  
**Git Branch:** `nicklaseskou95/hud-7-fase-31-migrer-ui-komponenter-shadcnui`

---

## Current State Analysis

### Eksisterende Struktur:
```
huddle-design-guide/
├── apps/
│   └── web/              # Next.js app (oprettet i HUD-6)
│       ├── app/
│       ├── components/   # TOM - ingen komponenter endnu
│       ├── lib/          # TOM - ingen utilities endnu
│       └── tsconfig.json # Path alias: "@/*": ["./*"]
├── src/                  # Eksisterende Vite + React SPA
│   ├── components/
│   │   └── ui/          # 49 UI komponenter (shadcn/ui)
│   ├── lib/
│   │   └── utils.ts     # cn() utility funktion
│   └── index.css        # CSS variables og styling
└── components.json       # shadcn/ui config (root level)
```

### Key Discoveries:

1. **UI Komponenter:** 49 komponenter i `src/components/ui/` der alle bruger:
   - `@/lib/utils` import til `cn()` utility funktion
   - CSS variables fra `src/index.css` (som allerede er synkroniseret i `apps/web/app/globals.css` fra HUD-6)
   - Path alias `@/` som peger på `src/` i legacy app, men skal pege på `apps/web/` i Next.js app

2. **Path Aliases:**
   - Legacy app (`tsconfig.app.json`): `"@/*": ["./src/*"]`
   - Next.js app (`apps/web/tsconfig.json`): `"@/*": ["./*"]` ✅ Allerede konfigureret korrekt

3. **Dependencies:** Alle komponenter bruger Radix UI primitives og `class-variance-authority` - disse skal være installeret i Next.js app (allerede checket i HUD-6)

4. **lib/utils.ts:** Komponenter afhænger af `cn()` utility funktion fra `@/lib/utils` - skal eksistere i Next.js app

5. **CSS Variables:** `apps/web/app/globals.css` indeholder allerede alle CSS variables fra `src/index.css` (synkroniseret i HUD-6)

6. **components.json:** Eksisterer i root og er konfigureret for legacy app. Vi behøver ikke opdatere denne, da komponenterne allerede er installerede.

### Komponent Liste (49 filer):
```
accordion.tsx, alert-dialog.tsx, alert.tsx, aspect-ratio.tsx, avatar.tsx,
badge.tsx, breadcrumb.tsx, button.tsx, calendar.tsx, card.tsx, carousel.tsx,
chart.tsx, checkbox.tsx, collapsible.tsx, command.tsx, context-menu.tsx,
dialog.tsx, drawer.tsx, dropdown-menu.tsx, form.tsx, hover-card.tsx,
input-otp.tsx, input.tsx, label.tsx, menubar.tsx, navigation-menu.tsx,
pagination.tsx, popover.tsx, progress.tsx, radio-group.tsx, resizable.tsx,
scroll-area.tsx, select.tsx, separator.tsx, sheet.tsx, sidebar.tsx,
skeleton.tsx, slider.tsx, sonner.tsx, switch.tsx, table.tsx, tabs.tsx,
textarea.tsx, toast.tsx, toaster.tsx, toggle-group.tsx, toggle.tsx,
tooltip.tsx, use-toast.ts
```

### Constraints:

- **KRITISK:** Eksisterende frontend skal fortsat kunne køre på `localhost:8080`
- Komponenter skal fungere identisk i Next.js app som i legacy app
- Imports skal bruge Next.js path aliases (`@/components/ui/...`)
- Ingen komponenter skal modificeres - kun kopieret

---

## Desired End State

### Målstruktur:
```
huddle-design-guide/
├── apps/
│   └── web/              # Next.js app
│       ├── app/
│       │   └── test-ui/
│       │       └── page.tsx  # Test page for alle komponenter
│       ├── components/
│       │   └── ui/          # 49 UI komponenter (kopieret)
│       ├── lib/
│       │   └── utils.ts     # cn() utility funktion
│       └── tsconfig.json    # Path alias: "@/*": ["./*"]
├── src/                  # EKSISTERENDE FRONTEND (uændret)
│   ├── components/
│   │   └── ui/          # 49 UI komponenter (original)
│   └── lib/
│       └── utils.ts     # cn() utility funktion (original)
```

### Verification Criteria:

- ✅ Alle 49 UI komponenter er kopieret til `apps/web/components/ui/`
- ✅ `apps/web/lib/utils.ts` eksisterer og indeholder `cn()` funktion
- ✅ Path aliases fungerer korrekt (`@/components/ui/...`, `@/lib/utils`)
- ✅ Test page eksisterer og demonstrerer alle komponenter fungerer
- ✅ Ingen console errors eller warnings i Next.js app
- ✅ Komponenter fungerer identisk med eksisterende frontend
- ✅ Tailwind classes fungerer korrekt
- ✅ Responsive design fungerer
- ✅ Eksisterende frontend kører stadig uden problemer

---

## What We're NOT Doing

- ❌ **Ingen domain komponenter** - det er Fase 3.2 (JerseyCard, Sidebar, etc.)
- ❌ **Ingen page migration** - det er Fase 3.3
- ❌ **Ingen modificeringer af komponenter** - kun kopiering
- ❌ **Ingen opdatering af legacy imports** - legacy app forbliver uændret
- ❌ **Ingen API integration** - det er Fase 4
- ❌ **Ingen Clerk integration** - det er senere fase
- ❌ **Ingen opdatering af components.json** - ikke nødvendigt

---

## Implementation Approach

**Strategi:** Gradvist, inkrementelt migration med pause points efter hver phase. Hver phase kan testes isoleret.

**Phase Sequence:** 
1. **Phase 0:** Installer alle dependencies (KRITISK - skal være først)
2. **Phase 1:** Opret foundation (lib/utils.ts)
3. **Phase 2:** Kopier UI komponenter
4. **Phase 3:** Opret test page
5. **Phase 4:** Verificer styling og funktionalitet

**Komponent karakteristika:** Alle komponenter er stateless UI komponenter baseret på Radix UI primitives. De er selvstændige og har ingen afhængigheder til business logic eller domain models.

**Path aliases:** Next.js app allerede har korrekt path alias konfiguration (`@/*` peger på `./*`), så imports fungerer automatisk når komponenter er på plads.

**Dependencies:** Phase 0 sikrer alle 40 nødvendige packages er installeret før komponent migration starter. Dette forhindrer build errors.

---

## Phase 0: Installer Dependencies (KRITISK)

### Overview

Installer alle nødvendige dependencies i Next.js app før komponent migration. Dette er kritisk da komponenter kræver specifikke Radix UI pakker og utility libraries for at fungere.

**Hvorfor først:** Hvis dependencies mangler, vil build fejle når komponenter kopieres. Dette phase sikrer alle dependencies er på plads.

### Changes Required:

#### 1. Installer Radix UI primitives (24 packages)
**File:** `apps/web/package.json` (opdateres automatisk)  
**Changes:** Installer alle Radix UI packages der bruges af UI komponenter

**Rationale:** Alle shadcn/ui komponenter bygger på Radix UI primitives. Uden disse pakker vil komponenter ikke virke.

**Kommando:**
```bash
cd apps/web
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip
```

#### 2. Installer utility libraries
**File:** `apps/web/package.json` (opdateres automatisk)  
**Changes:** Installer core utility libraries

**Rationale:** Komponenter kræver disse libraries for styling og variants.

**Kommando:**
```bash
cd apps/web
npm install clsx tailwind-merge class-variance-authority lucide-react
```

#### 3. Installer komponent-specifikke dependencies
**File:** `apps/web/package.json` (opdateres automatisk)  
**Changes:** Installer dependencies for specifikke komponenter

**Rationale:** Nogle komponenter bruger specifikke libraries (Calendar, Carousel, Chart, etc.).

**Kommando:**
```bash
cd apps/web
npm install cmdk date-fns embla-carousel-react input-otp react-day-picker react-resizable-panels recharts sonner vaul tailwindcss-animate
```

**Component-to-Dependency Mapping:**
- `calendar.tsx` → `date-fns`, `react-day-picker`
- `carousel.tsx` → `embla-carousel-react`
- `chart.tsx` → `recharts`
- `command.tsx` → `cmdk`
- `drawer.tsx` → `vaul`
- `input-otp.tsx` → `input-otp`
- `resizable.tsx` → `react-resizable-panels`
- `sonner.tsx` → `sonner`
- Alle komponenter → `tailwindcss-animate` (for animations)

### Dependency Checklist:

Verificer alle følgende dependencies er installeret:

#### Radix UI Primitives (27 packages):
- [ ] `@radix-ui/react-accordion`
- [ ] `@radix-ui/react-alert-dialog`
- [ ] `@radix-ui/react-aspect-ratio`
- [ ] `@radix-ui/react-avatar`
- [ ] `@radix-ui/react-checkbox`
- [ ] `@radix-ui/react-collapsible`
- [ ] `@radix-ui/react-context-menu`
- [ ] `@radix-ui/react-dialog`
- [ ] `@radix-ui/react-dropdown-menu`
- [ ] `@radix-ui/react-hover-card`
- [ ] `@radix-ui/react-label`
- [ ] `@radix-ui/react-menubar`
- [ ] `@radix-ui/react-navigation-menu`
- [ ] `@radix-ui/react-popover`
- [ ] `@radix-ui/react-progress`
- [ ] `@radix-ui/react-radio-group`
- [ ] `@radix-ui/react-scroll-area`
- [ ] `@radix-ui/react-select`
- [ ] `@radix-ui/react-separator`
- [ ] `@radix-ui/react-slider`
- [ ] `@radix-ui/react-slot`
- [ ] `@radix-ui/react-switch`
- [ ] `@radix-ui/react-tabs`
- [ ] `@radix-ui/react-toast`
- [ ] `@radix-ui/react-toggle`
- [ ] `@radix-ui/react-toggle-group`
- [ ] `@radix-ui/react-tooltip`

#### Utility Libraries (4 packages):
- [ ] `clsx`
- [ ] `tailwind-merge`
- [ ] `class-variance-authority`
- [ ] `lucide-react`

#### Component-Specific Dependencies (9 packages):
- [ ] `cmdk` (Command component)
- [ ] `date-fns` (Calendar component)
- [ ] `embla-carousel-react` (Carousel component)
- [ ] `input-otp` (Input OTP component)
- [ ] `react-day-picker` (Calendar component)
- [ ] `react-resizable-panels` (Resizable component)
- [ ] `recharts` (Chart component)
- [ ] `sonner` (Sonner toast component)
- [ ] `vaul` (Drawer component)
- [ ] `tailwindcss-animate` (Animations for all components)

**Total: 40 packages**

### Success Criteria:

#### Automated Verification:
- [ ] Alle 40 packages er installeret i `apps/web/package.json`
- [ ] `node_modules` opdateret med alle dependencies
- [ ] Verificer med: `cd apps/web && npm list | grep -E "@radix-ui|clsx|tailwind-merge|class-variance-authority|lucide-react|cmdk|date-fns|embla-carousel-react|input-otp|react-day-picker|react-resizable-panels|recharts|sonner|vaul|tailwindcss-animate"`
- [ ] Ingen installation errors

#### Manual Verification:
- [ ] `apps/web/package.json` indeholder alle dependencies
- [ ] Dependency versions matcher eller er kompatible med legacy app versions
- [ ] Ingen package conflicts eller warnings

**Verificer alle dependencies:**
```bash
cd apps/web
npm list --depth=0 | grep -E "@radix-ui|clsx|tailwind-merge|class-variance-authority|lucide-react|cmdk|date-fns|embla-carousel-react|input-otp|react-day-picker|react-resizable-panels|recharts|sonner|vaul|tailwindcss-animate"
```

**⚠️ PAUSE HERE** - Verificer ALLE dependencies er installeret før Phase 1

---

## Phase 1: Opret Foundation (lib/utils.ts)

### Overview

Opret `apps/web/lib/utils.ts` så UI komponenter har adgang til `cn()` utility funktion.

### Changes Required:

#### 1. Opret lib directory og utils.ts
**File:** `apps/web/lib/utils.ts` (ny fil)  
**Changes:** Kopier `cn()` utility funktion fra `src/lib/utils.ts`

**Rationale:** Alle UI komponenter bruger `cn()` til at merge Tailwind classes. Dette er kritisk dependency.

**Kopier direkte fra `src/lib/utils.ts`:**
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Note:** Dependencies (`clsx` og `tailwind-merge`) skulle være installeret i Phase 0. Verificer at de eksisterer i `apps/web/package.json`.

**Hvis dependencies mangler (skulle ikke ske efter Phase 0):**
```bash
cd apps/web
npm install clsx tailwind-merge
```

### Success Criteria:

#### Automated Verification:
- [ ] `apps/web/lib/utils.ts` eksisterer
- [ ] Fil indeholder `cn()` funktion
- [ ] TypeScript kompilerer uden errors: `cd apps/web && npm run build`
- [ ] `clsx` og `tailwind-merge` er installeret i `apps/web/package.json`

#### Manual Verification:
- [ ] `cn()` funktion kan importeres: `import { cn } from "@/lib/utils"`
- [ ] Ingen TypeScript errors i IDE

**⚠️ PAUSE HERE** - Verificer foundation før Phase 2

---

## Phase 2: Kopier UI Komponenter

### Overview

Kopier alle 49 UI komponenter fra `src/components/ui/` til `apps/web/components/ui/`.

### Changes Required:

#### 1. Opret components/ui directory
**File:** `apps/web/components/ui/` (ny directory)  
**Changes:** Opret directory struktur

**Rationale:** UI komponenter skal ligge i `apps/web/components/ui/` for at matche Next.js path alias `@/components/ui/...`

#### 2. Kopier alle UI komponenter
**File:** `apps/web/components/ui/*.tsx` (49 nye filer)  
**Changes:** Kopier alle filer fra `src/components/ui/` til `apps/web/components/ui/`

**Rationale:** Alle komponenter er stateless og kan kopieres direkte uden modificering.

**Kommando til kopiering:**
```bash
# Fra projekt root
cp -r src/components/ui/* apps/web/components/ui/
```

**Verificer kopiering:**
```bash
# Tæl filer i source
ls -1 src/components/ui/ | wc -l  # Skal være 49

# Tæl filer i destination
ls -1 apps/web/components/ui/ | wc -l  # Skal være 49
```

**Komponent liste til verificering:**
```
accordion.tsx
alert-dialog.tsx
alert.tsx
aspect-ratio.tsx
avatar.tsx
badge.tsx
breadcrumb.tsx
button.tsx
calendar.tsx
card.tsx
carousel.tsx
chart.tsx
checkbox.tsx
collapsible.tsx
command.tsx
context-menu.tsx
dialog.tsx
drawer.tsx
dropdown-menu.tsx
form.tsx
hover-card.tsx
input-otp.tsx
input.tsx
label.tsx
menubar.tsx
navigation-menu.tsx
pagination.tsx
popover.tsx
progress.tsx
radio-group.tsx
resizable.tsx
scroll-area.tsx
select.tsx
separator.tsx
sheet.tsx
sidebar.tsx
skeleton.tsx
slider.tsx
sonner.tsx
switch.tsx
table.tsx
tabs.tsx
textarea.tsx
toast.tsx
toaster.tsx
toggle-group.tsx
toggle.tsx
tooltip.tsx
use-toast.ts
```

#### 3. Verificer imports i komponenter
**File:** Alle filer i `apps/web/components/ui/`  
**Changes:** Verificer at imports bruger korrekt path alias

**Rationale:** Komponenter bruger `@/lib/utils` - dette skal fungere med Next.js path alias.

**Eksempel verificering:**
```typescript
// apps/web/components/ui/button.tsx skal have:
import { cn } from "@/lib/utils";
```

**Automatiseret verificering:**
```bash
# Check at alle komponenter kan importere utils
cd apps/web
grep -r "@/lib/utils" components/ui/ | wc -l
# Skal matche antal komponenter der bruger cn()
```

### Success Criteria:

#### Automated Verification:
- [ ] `apps/web/components/ui/` directory eksisterer
- [ ] 49 filer er kopieret (verificer med `ls -1 apps/web/components/ui/ | wc -l`)
- [ ] Alle filer har `.tsx` eller `.ts` extension
- [ ] TypeScript kompilerer: `cd apps/web && npm run build`
- [ ] Ingen import errors i TypeScript

#### Manual Verification:
- [ ] Alle 49 komponenter er til stede i `apps/web/components/ui/`
- [ ] Imports i komponenter bruger `@/lib/utils` (korrekt path alias)
- [ ] Ingen console errors ved build

**⚠️ PAUSE HERE** - Verificer komponenter er kopieret korrekt før Phase 3

---

## Phase 3: Opret Test Page

### Overview

Opret test page i Next.js app der demonstrerer alle UI komponenter fungerer korrekt.

### Changes Required:

#### 1. Opret test-ui page
**File:** `apps/web/app/test-ui/page.tsx` (ny fil)  
**Changes:** Opret test page der importerer og viser alle UI komponenter

**Rationale:** Test page gør det nemt at verificere alle komponenter fungerer korrekt og visuelt matcher legacy app.

**Test page struktur:**
```typescript
// apps/web/app/test-ui/page.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// ... importer alle komponenter

export default function TestUIPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-4xl font-bold mb-8">UI Components Test Page</h1>
      
      {/* Test alle komponenter systematisk */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Buttons</h2>
        <div className="flex gap-4">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </section>

      {/* Fortsæt med alle andre komponenter... */}
    </div>
  );
}
```

**Komponenter der skal testes:**
- Button (alle variants)
- Card (alle sub-komponenter)
- Dialog (open/close)
- Form components (Input, Textarea, Select, Checkbox, Radio, Switch)
- Dropdown menus
- Tabs
- Toast/Toaster
- Table
- Accordion
- Alert
- Badge
- Avatar
- Calendar
- Skeleton
- Progress
- Slider
- Tooltip
- Popover
- Sheet
- Drawer
- Command
- Navigation menu
- Breadcrumb
- Pagination
- Separator
- Hover card
- Context menu
- Menubar
- Resizable
- Scroll area
- Aspect ratio
- Collapsible
- Toggle
- Toggle group
- Alert dialog
- Sonner (toast alternative)

**Note:** Du behøver ikke teste ALLE komponenter i en enkelt page - du kan gruppere dem logisk eller oprette flere test pages.

**Simplificeret test page (fokus på vigtigste komponenter):**
```typescript
// apps/web/app/test-ui/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useState } from "react";

export default function TestUIPage() {
  const [open, setOpen] = useState(false);

  return (
    <div className="container mx-auto p-8 space-y-12 max-w-4xl">
      <div>
        <h1 className="text-4xl font-bold mb-2">UI Components Test Page</h1>
        <p className="text-muted-foreground">
          Verificer alle shadcn/ui komponenter fungerer korrekt i Next.js app
        </p>
      </div>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Alle button variants</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </CardContent>
      </Card>

      {/* Form Components */}
      <Card>
        <CardHeader>
          <CardTitle>Form Components</CardTitle>
          <CardDescription>Input, Textarea, Select, Checkbox, Switch</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="input">Input</Label>
            <Input id="input" placeholder="Type something..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="textarea">Textarea</Label>
            <Textarea id="textarea" placeholder="Type something..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="select">Select</Label>
            <Select>
              <SelectTrigger id="select">
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="checkbox" />
            <Label htmlFor="checkbox">Checkbox</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch id="switch" />
            <Label htmlFor="switch">Switch</Label>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Card>
        <CardHeader>
          <CardTitle>Dialog</CardTitle>
          <CardDescription>Modal dialog component</CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Open Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog Title</DialogTitle>
                <DialogDescription>
                  This is a dialog component test.
                </DialogDescription>
              </DialogHeader>
              <p>Dialog content goes here.</p>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
          <CardDescription>Tabbed interface</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tab1" className="w-full">
            <TabsList>
              <TabsTrigger value="tab1">Tab 1</TabsTrigger>
              <TabsTrigger value="tab2">Tab 2</TabsTrigger>
              <TabsTrigger value="tab3">Tab 3</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">Content for tab 1</TabsContent>
            <TabsContent value="tab2">Content for tab 2</TabsContent>
            <TabsContent value="tab3">Content for tab 3</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Badge & Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Badge & Avatar</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 items-center">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback>CN</AvatarFallback>
          </Avatar>
        </CardContent>
      </Card>

      {/* Alert */}
      <Alert>
        <AlertTitle>Alert Title</AlertTitle>
        <AlertDescription>
          This is an alert component test.
        </AlertDescription>
      </Alert>

      {/* Success Message */}
      <Card className="border-green-500/50 bg-green-500/10">
        <CardContent className="pt-6">
          <p className="text-green-500 font-semibold">
            ✅ Alle komponenter er migreret og fungerer!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Success Criteria:

#### Automated Verification:
- [ ] `apps/web/app/test-ui/page.tsx` eksisterer
- [ ] TypeScript kompilerer: `cd apps/web && npm run build`
- [ ] Ingen import errors
- [ ] Next.js dev server starter: `cd apps/web && npm run dev`

#### Manual Verification:
- [ ] Test page er tilgængelig på `http://localhost:3000/test-ui`
- [ ] Alle komponenter vises korrekt
- [ ] Ingen console errors eller warnings
- [ ] Komponenter fungerer interaktivt (dialogs åbner, tabs skifter, etc.)
- [ ] Styling matcher legacy app

**⚠️ PAUSE HERE** - Verificer test page fungerer før Phase 4

---

## Phase 4: Verificer Styling og Funktionalitet

### Overview

Verificer at alle komponenter fungerer korrekt med Tailwind classes, dark mode (hvis relevant), og responsive design.

### Changes Required:

#### 1. Verificer Tailwind classes
**File:** Alle komponenter i `apps/web/components/ui/`  
**Changes:** Verificer Tailwind classes fungerer korrekt

**Rationale:** Komponenter bruger Tailwind utility classes - disse skal virke i Next.js app.

**Verificer:**
- [ ] Test page loader uden styling errors
- [ ] Alle komponenter har korrekt styling
- [ ] Hover states fungerer
- [ ] Focus states fungerer
- [ ] Disabled states fungerer

#### 2. Verificer dark mode (hvis relevant)
**File:** Test page og komponenter  
**Changes:** Test dark mode toggle (hvis projektet bruger dark mode)

**Rationale:** CSS variables er allerede defineret i `globals.css`, men vi skal verificere dark mode fungerer.

**Note:** Projektet bruger "Stadium Nights Theme - Dark by default", så dark mode er standard. Verificer at komponenter bruger CSS variables korrekt.

#### 3. Verificer responsive design
**File:** Test page  
**Changes:** Test komponenter på forskellige skærmstørrelser

**Rationale:** Komponenter skal være responsive og fungere på mobile/tablet/desktop.

**Verificer:**
- [ ] Test page fungerer på mobile (resize browser til ~375px width)
- [ ] Test page fungerer på tablet (resize browser til ~768px width)
- [ ] Test page fungerer på desktop (full width)
- [ ] Komponenter adapterer korrekt til skærmstørrelse

#### 4. Verificer ingen console errors
**File:** Browser console  
**Changes:** Tjek for errors og warnings

**Rationale:** Migration skal ikke introducere nye errors.

**Verificer:**
- [ ] Ingen console errors
- [ ] Ingen console warnings
- [ ] React DevTools viser ingen warnings
- [ ] Network tab viser ingen failed requests

#### 5. Sammenlign med legacy app
**File:** Visual comparison  
**Changes:** Sammenlign test page med tilsvarende komponenter i legacy app

**Rationale:** Komponenter skal se identiske ud.

**Verificer:**
- [ ] Button styling matcher
- [ ] Card styling matcher
- [ ] Form components styling matcher
- [ ] Dialog styling matcher
- [ ] Alle andre komponenter matcher

### Success Criteria:

#### Automated Verification:
- [ ] Next.js build succesfuld: `cd apps/web && npm run build`
- [ ] Ingen TypeScript errors: `cd apps/web && npx tsc --noEmit`
- [ ] Ingen ESLint errors: `cd apps/web && npm run lint`

#### Manual Verification:
- [ ] Alle Tailwind classes fungerer korrekt
- [ ] Dark mode fungerer (hvis relevant)
- [ ] Responsive design fungerer på alle skærmstørrelser
- [ ] Ingen console errors eller warnings
- [ ] Komponenter matcher legacy app visuelt
- [ ] Alle interaktive features fungerer (dialogs, dropdowns, tabs, etc.)
- [ ] Eksisterende frontend kører stadig uden problemer

**⚠️ PAUSE HERE** - Verificer alt fungerer før afslutning

---

## Testing Strategy

### Unit Testing
Ikke påkrævet i denne fase - komponenter er stateless UI komponenter der testes via visual/manual verification.

### Integration Testing
Test page fungerer som integration test - alle komponenter testes sammen i Next.js app kontekst.

### Manual Testing Checklist
- [ ] Test page loader korrekt
- [ ] Alle komponenter vises
- [ ] Interaktive komponenter fungerer (dialogs, dropdowns, etc.)
- [ ] Styling matcher legacy app
- [ ] Responsive design fungerer
- [ ] Ingen console errors
- [ ] Build succesfuld
- [ ] Legacy app kører stadig

---

## Rollback Strategy

Hvis noget går galt:

1. **Delete migrated files:**
   ```bash
   rm -rf apps/web/components/ui
   rm apps/web/lib/utils.ts
   rm -rf apps/web/app/test-ui
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

**⚠️ KRITISK:** Alle dependencies skal være installeret i Phase 0 FØR Phase 1 starter. Se Phase 0 for komplet installation guide.

### Required Dependencies (40 packages total):

#### Radix UI Primitives (27 packages):
Alle `@radix-ui/react-*` pakker der bruges af shadcn/ui komponenter. Se Phase 0 for komplet liste.

#### Utility Libraries (4 packages):
- `clsx` - for `cn()` utility function
- `tailwind-merge` - for `cn()` utility function
- `class-variance-authority` - for komponent variants (Button, Badge, etc.)
- `lucide-react` - for ikoner i komponenter

#### Component-Specific Dependencies (9 packages):
- `cmdk` - Command component (command palette)
- `date-fns` - Calendar component (date utilities)
- `embla-carousel-react` - Carousel component
- `input-otp` - Input OTP component
- `react-day-picker` - Calendar component (date picker)
- `react-resizable-panels` - Resizable component
- `recharts` - Chart component
- `sonner` - Sonner toast component
- `vaul` - Drawer component
- `tailwindcss-animate` - Animations for all components

#### Already Installed (from HUD-6):
- `tailwindcss` - for styling (allerede installeret)
- `next` - Next.js framework (allerede installeret)
- `react` - React library (allerede installeret)

### Dependency Installation Status:

**Verificer at Phase 0 er gennemført:**
```bash
cd apps/web
npm list --depth=0 | grep -E "@radix-ui|clsx|tailwind-merge|class-variance-authority|lucide-react|cmdk|date-fns|embla-carousel-react|input-otp|react-day-picker|react-resizable-panels|recharts|sonner|vaul|tailwindcss-animate" | wc -l
# Skal returnere 40 (eller flere hvis sub-dependencies er inkluderet)
```

**Hvis dependencies mangler:**
- Gå tilbage til Phase 0
- Følg installation instruktioner i Phase 0
- Verificer alle 40 packages er installeret
- Fortsæt derefter til Phase 1

---

## References

- **Linear Issue:** [HUD-7](https://linear.app/huddle-world/issue/HUD-7/fase-31-migrer-ui-komponenter-shadcnui)
- **Migration Plan:** `.project/08-Migration_Plan.md` - Fase 3.2 (næste step)
- **Frontend Guide:** `.project/07-Frontend_Guide.md` - UI komponenter
- **Previous Phase:** `.project/plans/HUD-6/implementation-plan-2025-11-25-HUD-6.md`
- **Source Components:** `src/components/ui/` (49 filer)
- **Source Utils:** `src/lib/utils.ts`
- **Next.js App:** `apps/web/`
- **Path Aliases:** `apps/web/tsconfig.json` (already configured)

---

## Notes

- **UI komponenter er stateless** - ingen business logic eller state management
- **Dette er foundation** for domain komponent migration i Fase 3.2
- **Alle komponenter skal migreres** - ingen springes over
- **Legacy app forbliver uændret** - migration er non-breaking
- **Test page kan fjernes senere** - eller bruges til ongoing testing

---

## Timeline Estimate

- **Phase 0:** 15-20 min (installer 40 dependencies)
- **Phase 1:** 15 min (opret lib/utils.ts)
- **Phase 2:** 30 min (kopier 49 komponenter)
- **Phase 3:** 1-2 timer (opret test page med alle komponenter)
- **Phase 4:** 30 min (verificer styling og funktionalitet)

**Total:** ~3.5-4.5 timer (inkl. dependency installation)

---

## Success Metrics

- ✅ Alle 49 UI komponenter migreret
- ✅ Test page demonstrerer alle komponenter fungerer
- ✅ Ingen breaking changes til legacy app
- ✅ Next.js app kan bruge alle UI komponenter
- ✅ Ready for Fase 3.2 (domain komponent migration)

---

**Plan oprettet:** 2025-11-25  
**Status:** Ready for Implementation  
**Next Step:** Start Phase 0 - Installer Dependencies


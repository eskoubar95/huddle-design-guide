# Huddle Color Palette & Design System

This document defines the complete color system for Huddle, engineered for a "Dark Mode Default" aesthetic inspired by OneFootball and Sorare.

## 1. Core Colors (The Foundation)

### Primary: Lime Flash
The brand signifier. High energy, used sparingly.
- **Base:** `#80FF00` (Lime Flash) - *Primary Actions, Active States*
- **Hover:** `#66CC00` (Lime Deep) - *Button Hover*
- **Text:** `#4D9900` (Lime Dark) - *Text on White*
- **Glow:** `#80FF00` (with opacity) - *Shadows, Neons*

### Background: Onyx Scale
We avoid pure black (`#000000`) to prevent eye strain and "smearing" on OLED screens. We use the **Onyx Scale**.
- **App Bg:** `#141414` (Onyx) - *Main Background*
- **Surface:** `#1E1E1E` (Soft Onyx) - *Cards, Sidebars*
- **Elevated:** `#262626` (Light Onyx) - *Dropdowns, Modals, Hover States*

### Neutrals: Smoke Scale
High contrast text without the harshness of pure white.
- **Primary Text:** `#F5F5F5` (White Smoke) - *Headings, Body*
- **Secondary Text:** `#A3A3A3` (Neutral Gray) - *Metadata, Labels*
- **Disabled:** `#525252` (Dark Gray) - *Disabled states*

## 2. Hype Colors (The Energy)
Used for "Live", "Trending", and specialized content types.

| Color Name | Hex | Tailwind Class | Usage |
|------------|-----|----------------|-------|
| **Electric Blue** | `#00F0FF` | `hype-blue` | Tech, Futures, Stats |
| **Hot Pink** | `#FF00CC` | `hype-pink` | Trending, Hot, Exclusive |
| **Cyber Yellow** | `#FFFF00` | `hype-yellow` | Alerts, High Contrast |

## 3. Border System & Nuances

Borders in dark mode should be subtle. We use a mix of **Solid Grays** and **Opacity Variants**.

### Solid Borders (Structural)
Used for permanent structure (dividers, cards).
- **Default Border:** `#333333` (Dark Gray) - *Card outlines, Dividers*
- **Active Border:** `#4D4D4D` (Mid Gray) - *Input focus (default)*

### Opacity Borders (The "Glass" Look)
Preferred for overlays and modern UI components to blend with backgrounds.
- **Subtle:** `border-white/10` (`rgba(255,255,255,0.1)`) - *Subtle separation*
- **Medium:** `border-white/20` (`rgba(255,255,255,0.2)`) - *Card borders*
- **Strong:** `border-white/40` (`rgba(255,255,255,0.4)`) - *Hover states*

### Hype Borders (Glow Effect)
- **Neon Border:** `border-primary/50` - *Active items*
- **Hype Border:** `border-hype-blue/50` - *Feature items*

## 4. Opacity Patterns (Surface & Depth)

Don't use solid gray backgrounds for everything. Use white with low opacity to create depth that adapts to the background.

| Token | Value | Usage |
|-------|-------|-------|
| `bg-white/5` | 5% White | *Secondary Buttons, Subtle Cards* |
| `bg-white/10` | 10% White | *Input Fields, Hover States* |
| `bg-black/20` | 20% Black | *Darken headers/footers (Overlay)* |
| `bg-black/40` | 40% Black | *Modal Backdrops* |
| `bg-primary/10` | 10% Lime | *Active Nav Item Background* |
| `bg-hype-blue/10` | 10% Blue | *Info Badge Background* |

## 5. Gradients (Atmosphere)

- **Lime Fade:** `linear-gradient(180deg, rgba(128, 255, 0, 0.15) 0%, rgba(128, 255, 0, 0) 100%)`
- **Dark Fade:** `linear-gradient(180deg, rgba(20, 20, 20, 0) 0%, #141414 100%)` (For image text protection)

## Implementation Guide

When building components:
1. Start with `bg-[#141414]` (Onyx).
2. Use `border-white/10` for structure.
3. Use `text-[#F5F5F5]` for main text.
4. Use `text-[#A3A3A3]` for secondary text.
5. Apply `primary` ONLY for the main call-to-action.

# Plan: Shared Momence-Style Header for Features Page

## Changes

### 1. Extract shared header into `src/components/landing/shared.tsx`

Create a reusable `SiteHeader` component that accepts an `activePath` prop to highlight the current nav item. It replicates the Momence-style header from `Index.tsx` with:

- Sticky positioning (`sticky top-0`) with backdrop blur
- "Features" link gets a selected state (e.g. `text-foreground font-semibold` or underline) when `activePath="/features"`
- Mobile hamburger menu included

### 2. Update `src/pages/Features.tsx`

- Replace the current simple header (lines 233-248) with `<SiteHeader activePath="/features" />`
- Remove the `login` button from the hero section (lines 279-286) since the header now has "Start free trial"

### 3. Update `src/pages/Index.tsx`

- Replace the inline header (lines 526-574) with `<SiteHeader activePath="/" />`
- Remove `Menu`, `Sheet*` imports that are no longer needed locally

### Technical Detail

The `SiteHeader` component highlights the active link by comparing `activePath` to each link's `to` prop, applying `text-foreground` for active vs `text-foreground/70` for inactive. The header uses `sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md`.
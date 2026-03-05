

# Plan: Dedicated /pricing Page

## What We're Building
A public marketing-style pricing page at `/pricing` with two side-by-side tier comparison cards (Standard $99/mo vs Pro Engine $169/mo), a feature comparison table, and a bottom CTA. Standard links to `/auth`, Pro has a "Book a Demo" or "Contact Us" action.

## Changes

### 1. Create `src/pages/Pricing.tsx`
- Uses `SiteHeader` with `activePath="/pricing"`
- Hero: headline "Simple, transparent pricing" + subtitle
- Two `GlassCard` comparison cards side-by-side (responsive: stacked on mobile)
  - **Standard ($99/mo):** feature list from existing `PLANS` data, CTA → "Start Your Free Trial" linking to `/auth`
  - **Pro Engine ($169/mo):** "Recommended" badge, extended feature list, CTA → "Book a Demo" (mailto or Calendly link placeholder)
- Optional: detailed feature comparison grid below (checkmarks per tier)
- Footer CTA section with `<SignupCTA align="center" />`
- Framer Motion animations consistent with Features page (`fadeUp`, `stagger`)

### 2. Update `src/App.tsx`
- Add route: `<Route path="/pricing" element={<Pricing />} />`

### 3. Update `src/components/landing/shared.tsx`
- Change the "Pricing" nav link `to` from `/features` to `/pricing`


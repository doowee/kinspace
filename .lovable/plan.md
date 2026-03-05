

# Plan: SEO-Optimized Site Footer

## What We're Building
A shared dark-background footer component used across all marketing pages (Index, Features, Pricing, Switch). Includes navigation links, SEO-relevant content, and copyright info.

## Component: `src/components/landing/SiteFooter.tsx`

**Layout** (3-column on desktop, stacked on mobile):
- **Column 1**: Logo + `BrandName` + one-line tagline ("Studio management software for boutique fitness")
- **Column 2 — "Product"**: Links to /features, /pricing, /switch, /auth (Login)
- **Column 3 — "Company"**: Support link, Privacy Policy (#), Terms (#) — placeholder hrefs for now

**Bottom bar**: Copyright line with current year + BrandName

**SEO details**:
- Semantic `<footer>` with `role="contentinfo"`
- `<nav aria-label="Footer">` wrapping link groups
- Heading tags (`<h3>`) for link group titles
- Competitor-relevant keywords in tagline text

**Styling**: `bg-foreground text-background` (dark bg, light text) with muted links using `text-background/60 hover:text-background`

## Changes to Existing Pages

Replace the inline `<footer>` in each marketing page with `<SiteFooter />`:
- `src/pages/Index.tsx` — replace lines 656–661
- `src/pages/Pricing.tsx` — replace lines 249–254
- `src/pages/Switch.tsx` — already has no standalone footer (just a CTA section)
- `src/pages/Features.tsx` — check and add if missing

Also export from `src/components/landing/shared.tsx` or keep as separate file (separate file preferred to keep shared.tsx lean).

## Files

| File | Action |
|------|--------|
| `src/components/landing/SiteFooter.tsx` | **Create** — shared footer component |
| `src/pages/Index.tsx` | Replace inline footer with `<SiteFooter />` |
| `src/pages/Pricing.tsx` | Replace inline footer with `<SiteFooter />` |
| `src/pages/Switch.tsx` | Add `<SiteFooter />` after footer CTA section |
| `src/pages/Features.tsx` | Add `<SiteFooter />` if not present |


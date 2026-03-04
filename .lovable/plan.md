

# Plan: Momence-Style Navigation Header

## What Changes
Replace the current minimal 2-button header on the landing page with a full-width navigation bar similar to Momence's design:

**Left:** Logo + BrandName  
**Center:** Features · Pricing · Switch to Kinspace · Support (text links, no button styling)  
**Right:** Log in (text link) · "Start free trial" (outlined/pill button)

## Implementation

### File: `src/pages/Index.tsx` (lines 524–540)

Replace the current `<header>` block with:
- A horizontally centered nav with four links: `Features` (`/features`), `Pricing` (`/features#pricing` or `/pricing` — we can scroll-to or link to a section), `Switch to Kinspace` (`/auth`), `Support` (mailto or anchor)
- Right side: "Log in" as a ghost text link to `/auth`, "Start free trial" as a prominent outlined pill button to `/auth`
- Clean, minimal styling — no glass blur backgrounds on nav items, just text with hover underline/color, matching the Momence reference
- Sticky/fixed positioning at top with a subtle background blur on scroll (optional enhancement)

### Notes
- "Pricing" and "Support" don't have dedicated pages yet — Pricing can link to `/features` (which could later get a pricing section), Support can be a placeholder `#` or mailto
- Mobile: collapse center links into a hamburger menu (can be a fast follow)


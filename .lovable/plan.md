

# Plan: Update CTAs Across Features and Index Pages

## Changes

### 1. `src/components/landing/shared.tsx` — Remove Sign In button from `SignupCTA`
- Remove the outline "Sign In" button, keep only the primary button
- Center-align the remaining button (change flex container)

### 2. `src/pages/Features.tsx` — Add SignupCTA back to hero, update footer CTA
- Add `<SignupCTA />` back into the hero section (after the subtitle, around line 264)
- Footer CTA (line 357): Change button text to "Start Your Free Trial" — the Sign In button disappears automatically from the shared component fix

### 3. `src/pages/Index.tsx` — Update hero and footer CTAs
- Hero (line 546): Already uses SignupCTA — Sign In button removal happens automatically
- Footer CTA (line 650): Change button text to "Start Your Free Trial"

### Summary of visible changes
- **Sign In button removed** from all `SignupCTA` instances (hero banners + footer CTA cards)
- **Features hero** gets a CTA button back: "Start Your Free Trial"
- **Footer CTA cards** on both pages show a single centered "Start Your Free Trial" button instead of two buttons


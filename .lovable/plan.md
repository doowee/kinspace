

# Plan: "Switch to Kinspace" Competitor Comparison Page

## Research Summary
Top competitors by search ranking:
- **Mindbody** — starts at $99/mo, opaque tiered pricing ("Let's talk"), per-booking transaction fees, dated UX
- **Momence** — "custom pricing" (no public prices), free basic tier with limited features, standard processing fees
- **WellnessLiving** — starts at $69/mo (Starter), goes up to $349/mo (Enterprise), add-on costs pile up
- **Glofox (ABC Glofox)** — no public pricing ("Get a demo"), enterprise-focused, limited SMS/AI

## Page Structure (`src/pages/Switch.tsx`)

### 1. SEO Hero
- H1: "Switch to Kinspace.Studio" with competitor names in subtitle for search targeting
- Pain-point subtitle: "Tired of hidden fees, opaque pricing, and software that wasn't built for boutique studios?"
- Left-aligned `<SignupCTA />`

### 2. "Why Studios Switch" — 4 Pain-Point Cards
Using `GlassCard`, each with icon + specific competitor callout:
- **Hidden & escalating fees** — Mindbody charges per-booking transaction fees on top of monthly plans; WellnessLiving stacks add-on costs
- **"Call for pricing" games** — Momence and Glofox hide pricing; Kinspace is $99 or $169, period
- **No native SMS commerce** — None offer 1-tap SMS flash drops or AI-powered refill prompts
- **AI bolted on, not built in** — Competitors sell AI as expensive add-ons; Kinspace Pro includes AI Revenue Agent, SmartCover, and BI

### 3. Head-to-Head Comparison Table
5-column table: Feature | Kinspace | Mindbody | Momence | WellnessLiving

Rows (specific, not generic):
- Starting price: $99/mo | $99/mo* | "Custom" | $69/mo
- Transparent public pricing: Yes | No (tiers hidden) | No | Partial
- Per-booking transaction fees: None | Yes | Yes | Yes
- White-label booking page: Yes | Widget only | Yes | Yes
- 1-Tap SMS Flash Drops: Yes (Pro) | No | No | No
- AI Revenue Agent: Yes (Pro) | No | No | No
- SmartCover™ sub requests: Yes (Pro) | No | No | No
- Multi-location: Included | Premium tier | Add-on | Premium tier
- Stripe direct payouts: Yes | No (proprietary) | Yes | No
- Branded client wallet: Yes | No | No | No
- Setup time: Same day | Weeks | Days | Days
- Contract required: No | Yes (annual) | No | Varies

Kinspace column highlighted with ring/accent.

### 4. Migration FAQ Accordion
SEO-targeted Q&A (6-8 questions):
- "How do I migrate from Mindbody to Kinspace?"
- "Does Kinspace charge per-booking or transaction fees?"
- "Can I keep my custom domain and branding?"
- "How long does setup take compared to Mindbody?"
- "What happens to my existing client data?"
- "Is there a contract or cancellation fee?"
- "How does Kinspace compare to Momence for yoga studios?"

### 5. Footer CTA
Center-aligned `<SignupCTA align="center" />`

## File Changes

| File | Change |
|------|--------|
| `src/pages/Switch.tsx` | **Create** — full page with SiteHeader, hero, pain cards, comparison table, FAQ accordion, footer CTA |
| `src/App.tsx` | Add `<Route path="/switch" element={<Switch />} />` |
| `src/components/landing/shared.tsx` | Change "Switch to Kinspace" nav link from `/auth` to `/switch` |

## Technical Notes
- Uses existing shared components: `SiteHeader`, `GlassCard`, `DotGrid`, `AmbientGlow`, `SignupCTA`, `fadeUp`, `stagger`
- FAQ uses existing `Accordion` from `@radix-ui/react-accordion`
- Competitor comparison table uses existing `Table` components
- Semantic H1/H2/H3 with competitor names in headings for SEO
- Asterisks and footnotes on competitor pricing where data is approximate or "contact sales"


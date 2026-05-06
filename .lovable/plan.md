
# Demo-Ready Checklist (No Live Switch)

Goal: get the app polished enough to **demo and show off** to prospects/investors. Keep Stripe + Twilio in **test/sandbox** mode. Nothing here flips production switches.

## 1. Public-facing polish (15 min)
- Replace `<meta name="author">` (currently "Lovable") with "Kinspace".
- Confirm `<title>` and meta description reflect the demo brand.
- Replace default OG/Twitter preview image with a branded card.
- Add favicon + apple-touch-icon.

## 2. SEO + per-route titles (15 min)
- One H1 per marketing page (`Index.tsx`, `Features.tsx`, `Pricing.tsx`).
- Per-route `<title>` + meta description (small helper or react-helmet).
- Alt text on hero images.

## 3. Demo data hygiene (15 min)
- Confirm `seed-demo-data` runs cleanly and produces a believable studio (instructors, classes, students, transactions).
- Add a one-click "Reset demo data" affordance for owners (or document the steps so you can re-seed before each pitch).
- Make sure canonical demo personas (Jessica M., instructor PINs) are present and current.

## 4. Demo flow walkthrough (30 min — manual QA)
Run through the story you'll tell on stage and fix anything ugly:
- Sign up → onboarding → create studio → branded portal loads.
- Owner dashboard → Students → Bulk SMS preview (excluded count + STOP drawer + audit row).
- Schedule → book a class → waitlist promotion.
- Kiosk PIN login → live roster.
- Finance → revenue chart + manual transaction.
- AI Marketing Agent (Pro tier) flash drop demo.

Note any 3-second-or-longer pauses, broken empty states, or mismatched brand colors.

## 5. Empty / loading / error states (20 min)
- Every list view has a friendly empty state ("No students yet — invite one").
- Skeleton loaders or spinners on slow queries.
- `NotFound.tsx` reachable + has a "Back to dashboard" CTA.
- Add a global error boundary if missing.

## 6. Auth + access gates (15 min)
- Confirm protected routes redirect unauthenticated users to `/auth`.
- Confirm Auth Email branding (Coastal Minimalism) renders in the test inbox.
- Email confirmation + leaked-password protection enabled in test env.

## 7. Console + visible jank (10 min)
- Remove leftover `console.log`s on hot paths.
- Strip TODO comments visible in DevTools.
- No 404s in the network tab on the main demo flow.

## 8. Stripe — keep in TEST mode (5 min)
- Verify Stripe is on **test keys** in the published env.
- Run one test checkout with `4242 4242 4242 4242` to confirm the happy path renders.
- Do NOT swap to live keys.

## 9. Twilio — keep in sandbox (5 min)
- Keep Twilio on the existing test/dev number.
- Send one test SMS to your own phone to confirm Bulk SMS + audit log work.
- Skip SMS Pumping Protection / Geo Permissions tightening until go-live.

## 10. Footer, legal stubs, and disclaimers (10 min)
- Footer with Terms / Privacy stubs (can be one-paragraph placeholders for now).
- Small "Demo environment — no live charges" badge in the dashboard header (toggle via env flag so you can hide it later).

## 11. Publish + share preview (5 min)
- Publish to `kinspace.lovable.app` (and `kinspace.studio` if already pointing).
- Set publish visibility to **public** so anyone with the link can view.
- Confirm the published site loads cleanly in an incognito window.

## 12. Demo logistics (5 min)
- Bookmark the live tabs you'll need on stage: dashboard, schedule, kiosk, students, finance.
- Pre-create a "demo owner" account with everything pre-seeded so you don't sign up live.
- Have a backup screen-recording of the happy path in case wifi dies.

---

## Suggested order
1. Items 1, 2, 5, 7, 10 → batch frontend polish.
2. Items 3, 4 → demo content + manual walkthrough.
3. Items 6, 8, 9 → light hardening on test infra.
4. Items 11, 12 → publish + dry-run.

## Explicitly NOT doing
- No live Stripe keys.
- No production Twilio number / Geo Permissions changes.
- No DNS / domain swaps beyond what's already set up.
- No new features.

Want me to start by knocking out items 1, 2, 5, 7, 10 in one polish pass?

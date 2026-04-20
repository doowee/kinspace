

## Track B — Wire booking flow to the new fulfillment hierarchy

The DB already does the right thing: `handle_class_booking` (1) checks for an active subscription with matching `access_scope`, (2) falls back to consuming a `class_points` credit, (3) raises `INSUFFICIENT_ACCESS` if neither is available. The waitlist trigger uses the same logic.

`BookingPage.tsx` already calls this RPC. The remaining work is making the UX around it correct and branded, plus making sure `BookClass.tsx` can't be reached as a dead-end.

### Changes

**1. `src/pages/BookingPage.tsx` — branded routing in modals**

- "Buy Credits" CTA in the No-Credits modal: route to `/s/${studio_slug}/credits` (currently `/credits`).
- Remove the second "View All Packages" button — it points to a legacy `/book/:slug/packages` route that no longer fits the model. One clear CTA is better.
- Header "My Dashboard" button and Success modal "Go to My Dashboard" button: route to `/s/${studio_slug}/dashboard` (currently `/dashboard`).
- Improve the No-Credits modal copy to reflect the hierarchy: "You need an active membership or class credits to book…"

**2. `src/pages/BookingPage.tsx` — sharper error handling**

- The current check `rpcError.message?.includes("INSUFFICIENT_ACCESS")` works, but Postgres error shape varies. Also inspect `rpcError.code`/`details` and treat any message containing the sentinel as the credits prompt. Anything else → toast with a generic "Booking failed" message (don't leak raw DB text).
- Catch the `Class not found` and `Not authenticated` raises distinctly — show a friendly toast and (for unauth) open the AuthModal instead of showing a destructive error.

**3. `src/pages/BookClass.tsx` — redirect to branded booking**

- Today this page lists studios the user belongs to and links to `/book/:slug`. With the branded student portal, the canonical entry is `/s/:slug`. Update the "View Schedule" link to `/s/${slug}` so users land on the branded booking surface (which already calls the RPC).
- If the user belongs to exactly one studio, auto-redirect to `/s/${slug}` so this page isn't a needless interstitial.

**4. Wallet / dashboard refresh after booking**

- After a successful confirmed/waitlist booking, the cached `class_points` on the dashboard becomes stale. In `BookingPage.handleBook`, after a successful RPC call, dispatch a lightweight refresh signal: re-fetch `profiles.class_points` for the current user (used in some surfaces) is out of scope here, but emit a `window.dispatchEvent(new Event('wallet:refresh'))` and have `StudentDashboard` listen for it to refetch wallet + bookings. Small, isolated, no schema change.

### Out of scope

- No DB migrations — `handle_class_booking` and `auto_promote_waitlist` already implement the hierarchy correctly.
- No changes to the owner CRM, kiosk, or instructor flows.
- No edge function — RPC is sufficient and atomic (row locks + SECURITY DEFINER already in place).

### Files touched

- `src/pages/BookingPage.tsx` — branded routes, modal copy, tighter error handling, wallet refresh dispatch.
- `src/pages/BookClass.tsx` — link to `/s/:slug`, single-studio auto-redirect.
- `src/components/dashboard/StudentDashboard.tsx` — listen for `wallet:refresh` to refetch wallet + bookings.

### Verification (after implementation)

1. As `studenta@gmail.com` on `/s/downtown-pilates`, book a class with available points → confirm toast shows "Success", point count drops by 1 on dashboard.
2. Drain points to zero, attempt to book → No-Credits modal opens, "Buy Credits" routes to `/s/downtown-pilates/credits`.
3. As a user with an active subscription on that studio, book → confirms without deducting points.
4. Book into a full class → confirms as "Waitlisted", shows amber badge with waitlist position on dashboard.


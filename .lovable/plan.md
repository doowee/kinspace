

## Next Tasks To Tackle Today

Based on what we just shipped (branded student portal, wallet/access cards, waitlist position, grouped schedules), here are the highest-value next tasks — grouped so you can pick what to ship today.

### Track A — Close the loop on the student experience (recommended first)

These are small, finish-what-we-started items so the new student dashboard actually feels production-ready.

1. **Brand the `/credits` page under `/s/:slug/credits`**
   - Today `Credits.tsx` shows *all* active products across every studio (no `studio_id` filter).
   - Filter products by the current studio's `studio_id` so a student on `/s/kinspace/credits` only sees Kinspace packs/subscriptions.
   - Wrap the route in `StudioBrandedLandingWrapper` so brand colors apply.
   - Make the "Buy More" button in the wallet card route to `/s/:slug/credits` (already wired) — verify it works.

2. **Past Classes section — apply the same date grouping + prominent time block**
   - Mirror the styling we used in `StudentPortal` "My Schedule" so upcoming and past feel consistent.

3. **Empty / edge states on the student dashboard**
   - "No active access" card when user has 0 points AND no active subscription → CTA to `/s/:slug/credits`.
   - "No upcoming classes" card → CTA to `/s/:slug` (Book).
   - Expired subscription handling: `current_period_end < now()` should not render as active.

### Track B — Booking fulfillment hierarchy (the missing backend piece)

Right now the wallet shows subscription + points, but the booking flow doesn't yet *consume* them in the right order.

4. **Subscription-first, then points fulfillment on booking**
   - When a student books, check in order:
     1. Active `user_subscriptions` whose product has `access_scope = 'all_studios'` OR (`'single_studio'` AND matches `studio_id`) → book free, no point deduction.
     2. Else if `class_points >= 1` → decrement `class_points`, insert a `transactions` row of type `class_pack` for audit.
     3. Else → block booking and prompt user to `/s/:slug/credits`.
   - Implement as an edge function `book-class` (or RPC) so logic is server-side and atomic.
   - Update `BookClass.tsx` and the `BookingPage` to call it.

### Track C — Owner visibility into the new schema

5. **Owner Students CRM — show membership status column**
   - In the existing `/students` table, add a "Membership" column that reads from `user_subscriptions` (active product name) with a fallback to `class_points` balance.
   - Read-only addition; does not modify CRM behavior.

### Recommendation

If you only have time for one thing today, do **Track A (#1 + #3)** — it's user-visible, low-risk, and finishes the story we started. Track B is the most impactful but is a bigger lift (edge function + booking refactor + testing) and probably deserves its own focused session.

### Technical notes

- `Credits.tsx` filter: `.eq("studio_id", studioId)` — pull `studioId` from `useStudio()` or the route param.
- Subscription expiry check: `.gt("current_period_end", new Date().toISOString())` in the user_subscriptions query.
- Fulfillment edge function should use the service-role key for atomic point decrement to avoid race conditions on popular classes.


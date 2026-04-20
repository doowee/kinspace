

## Track C — Membership column on /students

Good news: the Students CRM at `/students` already has an "Access Status" column with the exact 3-tier priority the plan calls for:

- 🏆 Gold pill — active subscription name (e.g. "Unlimited Monthly")
- 🪙 Blue pill — `class_points` balance
- Gray pill — "No Active Access"

It's rendered by `AccessStatusBadge` in `src/pages/Students.tsx` and is backed by a parallel fetch of `user_subscriptions` (status='active' joined to `products`) plus `profiles.class_points`. The detail sheet also surfaces it.

So Track C as written is essentially shipped. To honor the spirit of the plan ("Membership column") and tighten a couple of edges, here's the small polish pass:

### Changes

**1. `src/pages/Students.tsx` — rename + clearer copy**
- Column header: `Access Status` → `Membership`.
- Empty-state badge: `No Active Access` → `No Access` (matches plan copy).
- Keep the existing 3-tier logic and the `AccessStatusBadge` component (also used inside the detail sheet, so renames carry through).

**2. Subscription expiry guard (data correctness)**
- Current query filters only `status='active'`. Add `.gt("current_period_end", new Date().toISOString())` (with a null-safe OR for legacy rows where `current_period_end` is NULL → treat as active) so an `active` row whose period has lapsed doesn't show a gold badge in stale data. Same fix mirrors the BookClass plan note.

**3. Sortable / filterable (small, opt-in)**
- Add a lightweight filter chip row above the table: "All / Members / Points / No Access" that filters `filtered` by membership tier. No new state machine — just a single `tierFilter` string.

**4. Detail sheet wording**
- In the detail sheet's quick-stats area, mirror the new "Membership" label so the badge isn't called "Access Status" in one place and "Membership" in another.

### Out of scope

- No DB changes. `user_subscriptions`, `products.name`, and `profiles.class_points` already provide everything.
- No changes to student-facing surfaces (already done in Tracks A/B).
- No changes to instructor or kiosk views.

### Files touched

- `src/pages/Students.tsx` — column rename, copy tweak, expiry guard on `user_subscriptions` query, optional tier filter chips, sheet label mirror.

### Verification

1. As an owner on `/students`, confirm the column header reads "Membership".
2. A student with an active subscription shows a gold badge with the product name.
3. A student with 0 subs and ≥1 points shows a blue points badge.
4. A student with neither shows a gray "No Access" badge.
5. Filter chips toggle the visible rows correctly.
6. A student whose `current_period_end` is in the past no longer shows gold.


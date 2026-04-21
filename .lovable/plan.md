

## Plan — Ship all 4 follow-ups

Four small, additive changes. No DB migrations. Marketing-style email is removed to comply with transactional-only policy; SMS remains the channel for re-engagement and renewals.

---

### 1. Seed exercise data (so chips light up)

Extend `supabase/functions/seed-demo-data/index.ts` to produce a small slice of edge-case students against the Downtown studio (`11111111-1111-1111-1111-111111111111`):

- **3 inactive students**: bookings whose latest `created_at` is 65–90 days ago, no recent activity. Surfaces in **Inactive (60d+)**.
- **2 expiring-soon members**: one active row in `user_subscriptions` with `current_period_end` between `now + 1d` and `now + 6d`. Surfaces in **Expiring soon** with the amber "Expires in Nd" badge.
- **1 already-lapsed member**: `current_period_end` 5 days in the past — verifies the gold badge correctly drops off.

Idempotent: tagged via deterministic emails (`demo-inactive-1@kinspace.test`, `demo-expiring-1@kinspace.test`, etc.) and upserted on each run, so re-seeding doesn't multiply rows.

Trigger: existing **⚡ Seed Demo Studio** item in `DemoTriggers` — no UI change.

---

### 2. Refactor Re-engage to SMS-only

`src/pages/Students.tsx`:

- Drop the **Channel** toggle and **Subject** field from the Re-engage dialog.
- Remove all `send-transactional-email` invocations from the bulk send loop.
- Keep only the SMS path (`send-twilio-sms`), the editable body textarea, recipient count + name list, and the "Send to N students" confirm.
- Add a one-line muted note under the body: *"SMS only. Marketing email is handled by your dedicated marketing provider."*
- Header copy: **"Re-engage via SMS"**.

Also remove the now-orphaned `winback-reengage.tsx` template and its registry entry (cleanup; transactional infra stays in place for future legitimate transactional sends).

---

### 3. Renewal nudge (SMS-only) on Expiring soon chip

Mirror the Re-engage composer for the **Expiring soon** filter:

- New toolbar button **"Renew (N)"** appears only when `tierFilter === "expiring"` AND filtered count > 0.
- Reuses the same dialog component with a different default body:
  > *"Hi {first_name}, your {studio_name} membership renews in {days_left} days. Tap below to keep your spot — see you on the mat. {booking_url}"*
- Token replacement extended to support `{days_left}` (computed per-recipient from `subscription_period_end`).
- Same Twilio loop, same toast summary.

Implementation: refactor the existing dialog into a single `BulkSmsDialog` component (props: `mode: "reengage" | "renew"`, `recipients`, `defaultBody`) so both buttons share one code path.

---

### 4. "Send test to me" button inside the SMS composer

Inside `BulkSmsDialog` footer, add a secondary **"Send test to me"** button next to the primary confirm:

- Sends a single SMS to the logged-in owner's `profiles.phone` using the current draft body.
- Token replacement uses the owner's first name + their studio name + a placeholder `2` for `{days_left}` so previews are realistic.
- Disabled with tooltip "Add a phone number to your profile" if owner has no phone.
- Toast on success/failure; does not close the dialog so the owner can iterate.

---

### Files touched

- `supabase/functions/seed-demo-data/index.ts` — add edge-case student/subscription rows (Track 1).
- `src/pages/Students.tsx` — refactor Re-engage to SMS-only, add Renew button, integrate shared dialog (Tracks 2, 3, 4).
- `src/components/students/BulkSmsDialog.tsx` — new shared composer with test-send (Tracks 2, 3, 4).
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — drop `winback-reengage` entry (Track 2 cleanup).
- `supabase/functions/_shared/transactional-email-templates/winback-reengage.tsx` — delete (Track 2 cleanup).

### Out of scope

- No DB schema or RLS changes.
- No new edge functions (reuse `send-twilio-sms` and `seed-demo-data`).
- No campaign history table — deferred; can revisit once SMS volume warrants it.
- No changes to the existing transactional email infrastructure beyond removing the one marketing template.

### Execution order

1. Track 1 (seed) — unblocks visual verification of Tracks 3 & 4.
2. Track 2 (SMS-only refactor) — sets the shared dialog foundation.
3. Track 3 (Renew button) — wires the second entry point into the shared dialog.
4. Track 4 (Test send) — small addition inside the shared dialog.


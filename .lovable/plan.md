

## Multi-track plan — Students CRM polish

Four self-contained tracks, each shippable independently. All changes confined to `src/pages/Students.tsx` unless noted.

---

### Track 1 — Re-engage bulk action (Inactive view)

When the **Inactive (60d+)** chip is active, surface a **Re-engage** action that opens a composer pre-populated with a win-back template and sends to all currently filtered students via SMS (Twilio) and/or Email.

**UI**
- New "Re-engage (N)" button appears in the toolbar only when `tierFilter === "inactive"` AND filtered count > 0.
- Opens a `Dialog` with:
  - Channel toggle: SMS / Email / Both (defaults to Both)
  - Editable subject (Email only) + body textarea, pre-filled with: *"Hi {first_name}, we miss you at {studio_name}! Come back this week — your spot is waiting. Book here: {booking_url}"*
  - Recipient count + small expandable list of names
  - Cost/limit hint: "SMS rate-limited to 20/hr per sender"
  - Confirm button → "Send to N students"

**Wiring**
- SMS: loop filtered students with a phone, call existing `send-twilio-sms` edge function (already auth/rate-limited).
- Email: invoke `send-transactional-email` per recipient with a new `winback-reengage` template (idempotency key `reengage-${studentId}-${YYYYMMDD}`) and `templateData: { firstName, studioName, bookingUrl }`.
- Token replacement happens server-side for email (template props) and client-side for SMS body before invoke.
- Show toast with sent/failed counts; log to console for diagnostics.

**Prereqs**
- Verify email domain status; if unconfigured, surface the email setup dialog before enabling the Email channel (SMS still works).
- New transactional template registered in `_shared/transactional-email-templates/registry.ts`.

---

### Track 2 — Persist CRM view state to localStorage

Remember the owner's last view across sessions: search query, tier filter chip, sort key, sort direction.

**Implementation**
- Storage key: `students-crm-view-v1` (versioned for safe future migrations).
- Single object: `{ q, tierFilter, sortKey, sortDir }`.
- Read once on mount via lazy `useState` initializer (guard with try/catch + schema sniff).
- Write via single `useEffect` debounced 300ms watching the four values.
- Per-owner scoping not needed (localStorage is per-browser); skip persisting `selectedStudent` (sheet open state) — always start closed.

---

### Track 3 — CSV export of filtered + sorted list

Add an **Export CSV** button to the toolbar that downloads exactly what's currently visible (respects search, tier filter, and sort order).

**Columns**
`Name, Email, Phone, Membership Tier, Subscription, Points, Total Bookings, Last Visit, Inactive`

**Implementation**
- Pure client-side generation — no backend.
- Build rows from the existing `filtered` memo (already sorted/filtered).
- CSV-escape via small helper (`"` doubled, fields with `,`/`"`/`\n` quoted).
- Filename: `students-{studio-slug}-{YYYY-MM-DD}.csv`.
- Trigger via `Blob` + temporary `<a download>`.
- Disabled when `filtered.length === 0`.

---

### Track 4 — Expiring memberships chip + amber badge

Surface students whose `current_period_end` falls within the next 7 days so owners can nudge renewals.

**Data**
- Existing `user_subscriptions` query already returns `current_period_end`. Extend the in-memory `StudentRow` to carry it (`subscription_period_end: string | null`).
- New helper `isExpiringSoon(s)`: returns true when student has an active subscription AND `current_period_end` is within `now + 7d`.

**UI**
- New filter chip: **"Expiring soon (N)"** alongside existing chips. Adds `"expiring"` to `TierFilter` union.
- New amber `Badge` rendered next to the gold Membership badge: "Expires in Nd" (compute days remaining, "tomorrow" if 1, "today" if 0).
- Sort behavior: when `sortKey === "membership"`, expiring-soon members tie-break ahead of other members (subtle nudge, no new sort key needed).

**Note**
- The existing expiry guard (`current_period_end > now`) keeps lapsed rows from showing gold, so "Expiring soon" only ever flags genuinely-active subs in their final week.

---

### Suggested execution order

1. **Track 2** (persist view) — pure infra, no risk, immediately useful.
2. **Track 3** (CSV export) — additive, no new dependencies.
3. **Track 4** (Expiring soon chip) — small data + UI tweak, complements existing badges.
4. **Track 1** (Re-engage bulk action) — largest scope; depends on email domain prereq + new template + edge function loop, so ship last.

### Files touched

- `src/pages/Students.tsx` — all four tracks (UI, state, helpers, dialog).
- `supabase/functions/_shared/transactional-email-templates/winback-reengage.tsx` — new (Track 1, email channel only).
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — register new template (Track 1).

### Out of scope

- No DB schema changes.
- No changes to instructor / kiosk / student-facing surfaces.
- No new edge functions — Track 1 reuses `send-twilio-sms` and `send-transactional-email`.
- No analytics/open-tracking on the win-back send (existing `email_send_log` already records each attempt).


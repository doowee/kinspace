

# Implementation Plan: Smart Refund, Auto-Promote & UI Cleanup

## 1. Database Migration (single SQL file)

### A. Replace `cancel_booking_logic` RPC

Updated function checks `user_subscriptions` before refunding:
- On **early cancel**: query `user_subscriptions` joined with `products` for active sub matching the studio
  - If subscription found → cancel booking, NO point refund, return "Booking cancelled. No credit to refund (subscription access)."
  - If no subscription → cancel booking, refund 1 point, return "Booking cancelled. Credit refunded."
- On **late cancel**: set `late_cancelled`, no refund regardless (same as today)

### B. Create `auto_promote_waitlist` trigger function

Loops through waitlisted students (ordered by `created_at ASC`, `FOR UPDATE SKIP LOCKED`):

1. Check if student has an active subscription (same join as booking RPC)
   - If subscription is **active** → promote to `confirmed`, RETURN
   - If subscription has **expired/cancelled** → skip this student, set their booking to `cancelled` (staff review), continue to next
2. If no subscription found, student is a pack user — points were already deducted at waitlist time → promote to `confirmed`, RETURN
3. If student has no profile at all (edge case) → skip and cancel their booking

### C. Create trigger

```sql
CREATE TRIGGER trg_auto_promote_waitlist
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status IN ('cancelled','late_cancelled') AND OLD.status IN ('confirmed','checked_in'))
  EXECUTE FUNCTION auto_promote_waitlist();
```

## 2. StudentDashboard.tsx — Waitlist Position Badge

**Changes to `src/components/dashboard/StudentDashboard.tsx`:**

- Add `created_at` to the bookings query select: `"id, class_id, status, created_at, classes(name, start_time)"`
- Add `created_at` to the `Booking` interface
- After fetching bookings, for each waitlisted booking, compute position:
  - Filter all bookings with same `class_id`, status `waitlist`, and `created_at` earlier than current → position = count + 1
  - Since we only fetch the current user's bookings, we need a separate query for position. Query: for each waitlisted class_id, count bookings with `status = 'waitlist'` and `created_at < thisBooking.created_at`
  - Store positions in a `Map<string, number>` (booking id → position)
- Replace the "Waitlisted" badge text with `Waitlist #${position}`

## 3. ViewStudentsDialog.tsx — Remove Chain Reaction

**Remove from `src/components/schedule/ViewStudentsDialog.tsx`:**

- Remove imports: `useDemoPhone`, `toast`, `Zap`
- Remove state: `chainRunning`
- Remove: `triggerWaitlistPromotion`, `onWaitlistPromoted` destructuring and the `useEffect` that registers `onWaitlistPromoted.current`
- Remove: `handleChainReaction` function (lines 106-145)
- Remove: `showChainButton` variable
- Remove: the chain reaction `<Button>` JSX block (lines 215-226)
- Keep: `fetchBookings`, `onBookingsChanged` prop, all other roster UI

## Files Summary

| File | Action |
|------|--------|
| SQL migration | **Create** — smart `cancel_booking_logic` + `auto_promote_waitlist` trigger |
| `src/components/dashboard/StudentDashboard.tsx` | **Edit** — add waitlist position query + badge |
| `src/components/schedule/ViewStudentsDialog.tsx` | **Edit** — remove chain reaction simulation |


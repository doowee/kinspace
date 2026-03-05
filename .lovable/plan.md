

# Upgrade Booking Logic: Subscription-First "VIP Bouncer"

## Part 1: Database — New RPC `handle_class_booking`

Create a new SECURITY DEFINER RPC that replaces `book_class_with_credit` with subscription-first logic:

```
1. Get auth.uid(), fail if null
2. Check user_subscriptions for active sub:
   - JOIN products to get access_scope
   - If access_scope = 'all_studios' → AUTHORIZED (no point deduction)
   - If access_scope = 'single_studio' AND user_subscriptions.studio_id = p_studio_id → AUTHORIZED
3. If AUTHORIZED via subscription:
   - Check capacity, insert booking as confirmed/waitlist
   - RETURN 'Booked successfully' or 'Waitlisted — subscription access'
4. If no subscription, fall back to class_points check:
   - Lock profile, check class_points >= 1
   - Deduct 1 point, insert booking
   - RETURN 'Booked successfully' or 'Waitlisted — credit held'
5. If neither: RAISE EXCEPTION 'INSUFFICIENT_ACCESS'
```

This will be a SQL migration creating the function. The existing `book_class_with_credit` stays for backward compat but the UI will switch to calling `handle_class_booking`.

## Part 2: UI — BookingPage.tsx Updates

Two changes in `src/pages/BookingPage.tsx`:

1. **`handleBook` function (lines 153-193)**: Switch RPC call from `book_class_with_credit` to `handle_class_booking`. Update error check from `"Insufficient credits"` to `"INSUFFICIENT_ACCESS"`.

2. **No Credits Dialog (lines 567-599)**: Update the description text to: "You need a class pack or an active membership to book this session."

3. **Success toast (lines 174-179)**: Keep existing logic — the RPC return string already distinguishes waitlist vs confirmed. Update credit-specific descriptions to be access-type-agnostic (e.g., remove "1 credit deducted" since subscription bookings don't deduct).

## Files Summary

| File | Action |
|------|--------|
| SQL migration | **Create** — `handle_class_booking` RPC |
| `src/pages/BookingPage.tsx` | **Edit** — switch RPC, update error handling & dialog text |


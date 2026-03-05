

# Money Engine: Credit Gate + Stripe Checkout

## Overview

Build a transactionally safe credit-based booking system and a student-facing credit purchase flow via Stripe Checkout.

## Discrepancies Resolved

| Requested | Actual | Resolution |
|-----------|--------|------------|
| `class_credits` column | `class_points` exists (int, default 0) | **Use `class_points`** — no schema change |
| `/pricing` for students | `/pricing` = SaaS landing page | **New `/credits` route** |
| `cancel_booking_logic` refunds to `student_passes` | Table was dropped | **Fix to refund `class_points`** |
| `create-credit-checkout` with `verify_jwt = false` | Security risk | **Keep `verify_jwt = false` in config** (required for signing-keys), **validate auth in code** via `getClaims()` |

## Security Model

- **`create-credit-checkout`**: `verify_jwt = false` in config, auth validated in code via `supabase.auth.getClaims(token)` — user identity extracted server-side, never trusted from body
- **`stripe-credit-webhook`**: `verify_jwt = false`, validates `Stripe-Signature` header via `stripe.webhooks.constructEventAsync()`

---

## Part 1: Database Migrations

### Migration A: `book_class_with_credit` RPC

```sql
CREATE OR REPLACE FUNCTION public.book_class_with_credit(p_class_id UUID, p_studio_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _user_id UUID; _credits INTEGER; _capacity INTEGER; _confirmed INTEGER; _status booking_status;
BEGIN
  _user_id := auth.uid();
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT class_points INTO _credits FROM profiles WHERE id = _user_id FOR UPDATE;
  IF _credits < 1 THEN RAISE EXCEPTION 'Insufficient credits'; END IF;

  SELECT capacity_total INTO _capacity FROM classes WHERE id = p_class_id FOR UPDATE;
  SELECT COUNT(*) INTO _confirmed FROM bookings WHERE class_id = p_class_id AND status = 'confirmed';

  _status := CASE WHEN _confirmed >= _capacity THEN 'waitlist'::booking_status ELSE 'confirmed'::booking_status END;

  UPDATE profiles SET class_points = class_points - 1 WHERE id = _user_id;
  INSERT INTO bookings (user_id, class_id, studio_id, status) VALUES (_user_id, p_class_id, p_studio_id, _status);

  RETURN CASE WHEN _status = 'waitlist' THEN 'Waitlisted — credit held' ELSE 'Booked successfully' END;
END; $$;
```

### Migration B: Fix `cancel_booking_logic`

Replace the `student_passes` refund block with:
```sql
UPDATE profiles SET class_points = class_points + 1 WHERE id = _user_id;
```

---

## Part 2: Edge Functions

### `create-credit-checkout/index.ts`
- Auth: Extract token from `Authorization` header → `supabase.auth.getClaims(token)` → get `userId` and `email`
- Accept `{ pack: "drop_in" | "5_pack" | "10_pack" }` from body
- Map to hardcoded prices: Drop-In $25/1cr, 5-Pack $100/5cr, 10-Pack $175/10cr
- Create Stripe Checkout session (`mode: "payment"`) with `credits` + `user_id` in metadata
- Return checkout URL
- Success/cancel URLs → `/credits?payment=success` / `/credits?payment=cancelled`

### `stripe-credit-webhook/index.ts`
- Validate `Stripe-Signature` via `stripe.webhooks.constructEventAsync()`
- On `checkout.session.completed`: read `credits` + `user_id` from metadata
- Increment `profiles.class_points` via service role client
- Insert audit row into `transactions` table

---

## Part 3: UI Changes

### New: `src/pages/Credits.tsx`
- Show current `class_points` balance at top
- Three pricing cards (Drop-In, 5-Pack, 10-Pack) with Buy buttons
- Buy button calls `supabase.functions.invoke("create-credit-checkout")` → redirects to Stripe
- Success banner when `?payment=success` in URL
- Loading spinner during redirect

### Edit: `src/pages/BookingPage.tsx`
- Replace direct `bookings.insert()` in `handleBook` (lines 153-195) with `supabase.rpc("book_class_with_credit", { p_class_id, p_studio_id })`
- Catch `"Insufficient credits"` error → open `noCreditsOpen` dialog
- Update no-credits dialog to link to `/credits` instead of hardcoded $199 pack

### Edit: `src/pages/Wallet.tsx`
- Add "Buy Credits" CTA button linking to `/credits`

### Edit: `src/App.tsx`
- Add `/credits` route inside the `StudentAuthGate` block alongside `/book-class`

---

## Part 4: Config

Add to `supabase/config.toml`:
```toml
[functions.create-credit-checkout]
  verify_jwt = false
[functions.stripe-credit-webhook]
  verify_jwt = false
```

---

## Files Summary

| File | Action |
|------|--------|
| 2 SQL migrations | **Create** — `book_class_with_credit` RPC + fix `cancel_booking_logic` |
| `supabase/functions/create-credit-checkout/index.ts` | **Create** |
| `supabase/functions/stripe-credit-webhook/index.ts` | **Create** |
| `src/pages/Credits.tsx` | **Create** |
| `src/pages/BookingPage.tsx` | **Edit** — wire RPC + update no-credits dialog |
| `src/pages/Wallet.tsx` | **Edit** — add Buy Credits CTA |
| `src/App.tsx` | **Edit** — add `/credits` route |


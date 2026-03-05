

# Analysis: Existing Infrastructure Already Covers This

After reviewing the codebase, **most of what you're requesting already exists**:

| Requested | Current Status |
|-----------|---------------|
| `create-checkout-session` edge function | **Already exists** as `create-credit-checkout` — handles pack checkout with Stripe |
| `stripe-webhook` for fulfillment | **Already exists** as `stripe-credit-webhook` — increments `class_points`, logs transactions |
| UI checkout trigger on `/credits` | **Already exists** — Buy buttons with loading spinners, redirect to Stripe, success banner |
| `transactions` audit table | **Already exists** — webhook already inserts into `transactions` |

## What's Missing / Needs Upgrading

The current system only handles **packs** (one-time `mode: "payment"`). It does NOT handle **subscriptions**. Here's the gap:

### 1. `create-credit-checkout` → Upgrade to unified `create-checkout-session`

- Currently uses hardcoded `PACKS` map with `price_data` (inline prices)
- Needs to: accept a `productId`, fetch from `products` table, determine `mode` from `product_type`
- Use `stripe_price_id` from the `products` table instead of inline `price_data`

### 2. `stripe-credit-webhook` → Upgrade to handle subscriptions

- Currently only handles packs (increments `class_points`)
- Needs to: also handle `product_type === 'subscription'` by inserting into `user_subscriptions`
- Should also listen for `customer.subscription.updated` and `customer.subscription.deleted` to keep `user_subscriptions` status in sync

### 3. `/credits` UI → Fetch products from DB instead of hardcoded array

- Currently uses hardcoded `PACKS` array
- Should fetch active products from `products` table for the user's home studio
- Display both packs and subscriptions with appropriate labeling

### 4. Config: Add webhook to `config.toml`

- `stripe-credit-webhook` needs `verify_jwt = false` (it's a Stripe webhook, not user-authenticated)
- New unified function needs registration too

---

## Plan

### Step 1: Create `create-checkout-session` edge function

Replace `create-credit-checkout` with a new unified function:

- Accepts `{ productId }` in body
- Authenticates user via JWT claims
- Fetches product from `products` table using service role client
- If `product_type === 'subscription'` → `mode: "subscription"`, use `stripe_price_id`
- If `product_type === 'pack'` → `mode: "payment"`, use `stripe_price_id`
- Includes `user_id`, `product_id`, `product_type`, `point_value` in session metadata
- Returns checkout URL

### Step 2: Create `stripe-webhook` edge function

Replace `stripe-credit-webhook` with a unified webhook:

- Verifies Stripe signature using `STRIPE_WEBHOOK_SECRET` secret
- Handles `checkout.session.completed`:
  - Reads `product_type` from metadata
  - **Pack**: increment `class_points` via RPC, insert transaction
  - **Subscription**: insert into `user_subscriptions` with product_id, studio_id, status='active', current_period_end from Stripe subscription
- Handles `customer.subscription.updated`: update `user_subscriptions` status and period end
- Handles `customer.subscription.deleted`: set `user_subscriptions` status to 'cancelled'

### Step 3: Update `/credits` UI

- Fetch products from `products` table (where `is_active = true` and studio matches user's home studio)
- Render packs and subscriptions dynamically
- Wire "Buy" buttons to call `create-checkout-session` with `productId`
- Keep existing loading/spinner/success banner logic

### Step 4: Config updates

- Add `verify_jwt = false` for `stripe-webhook` and `create-checkout-session` entries in `config.toml`
- Note: `create-checkout-session` validates JWT manually in code

### Step 5: Secret requirement

- A `STRIPE_WEBHOOK_SECRET` secret is needed for the webhook. Will use `add_secret` tool to request it.

---

## Files

| File | Action |
|------|--------|
| `supabase/functions/create-checkout-session/index.ts` | **Create** |
| `supabase/functions/stripe-webhook/index.ts` | **Create** |
| `src/pages/Credits.tsx` | **Edit** — fetch products from DB, call new function |
| `supabase/config.toml` | **Edit** — add new function entries |

No database migration needed — `products`, `user_subscriptions`, and `transactions` tables already exist with correct schemas.


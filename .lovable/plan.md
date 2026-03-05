

# Plan: Wire Seed to Downtown-Only + Fix Production

## Problem
1. The current `seed-demo-data` function seeds **all sibling studios** in the org when given a studio ID — it should only seed the Downtown studio (`11111111-1111-1111-1111-111111111111`).
2. The "Seed Demo Studio" button passes `activeStudio.id` (whatever studio is selected), but should always target Downtown.
3. Production: the function exists but needs to be invoked there after publishing.

## Changes

### 1. Edge Function: `supabase/functions/seed-demo-data/index.ts`
- **Remove sibling studio expansion** (lines 112-119): When a `studio_id` is passed, only seed that one studio — don't fetch and seed siblings.
- Change lines 101-129 to simply use the provided `customStudioId` without expanding to org siblings.

### 2. Client: `src/components/demo/DemoTriggers.tsx`
- Hardcode the Downtown studio ID (`11111111-1111-1111-1111-111111111111`) in the seed call instead of using `activeStudio.id`, ensuring the seed always targets Downtown regardless of which studio is selected.

### 3. Deploy & Invoke on Both Environments
- Deploy the updated edge function
- Invoke on test to verify
- User publishes to push to production
- Invoke on production

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/seed-demo-data/index.ts` | Remove sibling studio expansion logic |
| `src/components/demo/DemoTriggers.tsx` | Hardcode Downtown studio ID in seed call |


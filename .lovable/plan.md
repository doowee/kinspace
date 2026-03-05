

# Plan: AI Marketing Agent — Fixes

## Issues to Fix

1. **Duplicate icons**: Line 146 has both `<Sparkles>` icon and `🪄` emoji — remove the emoji, keep only `✨` (Sparkles icon) per brand guidelines
2. **Rename**: "AI Class Filler" → "AI Marketing Agent" everywhere (header, locked state, toast messages)
3. **Collapsible**: Wrap the segment/steps content in a `Collapsible` from shadcn — clicking the header row toggles it open/closed, starts collapsed
4. **Remove "Bring a Friend Pass"**: Not viable due to strict machine limits — replace with "Priority Waitlist Bump" or simply remove it
5. **50% off, no code**: Change "Last-Minute 10% Discount" to "Last-Minute 50% Off" and remove the promo code reference from the mock content ("Use code LASTSPOT")

## Changes — Single File

**`src/components/schedule/AIClassFiller.tsx`**

| Area | Change |
|------|--------|
| Line 128, 146 | Remove `🪄` emoji, keep `Sparkles` icon only. Rename label to "✨ AI Marketing Agent" |
| Lines 7, 140-150 | Import `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`, wrap header as trigger + steps as content, default closed |
| Line 28 | Replace `"Bring a Friend Pass"` with e.g. `"Priority Waitlist Bump"` |
| Line 27 | Change `"Last-Minute 10% Discount"` → `"Last-Minute 50% Off"` |
| Lines 42-43 | Update mock content: remove "Use code LASTSPOT", change 10% → 50%, update friend-pass copy to match new option |
| Line 47 | Update email subject from "10% off" to "50% off" |
| Locked state (128) | Same rename to "AI Marketing Agent" |


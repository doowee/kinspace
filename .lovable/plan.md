

# Plan: Premium AI Class Filler in ViewStudentsDialog

## Overview
Add a 4-step "AI Class Filler" section to `ViewStudentsDialog` — the modal that opens when an owner clicks the student count button on a class card. The feature is gated by the existing `useSubscriptionTier` hook (`isPro`).

## Where It Lives
`src/components/schedule/AIClassFiller.tsx` — new standalone component rendered inside `ViewStudentsDialog.tsx`.

## Component: AIClassFiller

**Props**: `classId`, `className`, `capacity`, `bookedCount`, `classStartTime`, `isPro`

**Visibility condition**: `bookedCount < capacity` AND class is within next 48 hours.

**Accent theme**: Soft purple/violet — `violet-500` for borders, badges, buttons.

### If NOT Pro (locked state)
- Grayed-out card with padlock icon and blurred content
- Click triggers a toast: "Upgrade to Premium to let our AI automatically fill your empty reformer beds."
- Reuses pattern from existing `ProUpgradeOverlay` but inline

### If Pro (unlocked state)
4-step interactive flow inside a Card with violet accent border:

1. **Step 1 — Select Target Segment**: Three selectable cards (radio-style) with icons:
   - "The Fan Club" — previous students of this instructor/class
   - "Slipping Away" — active package, no bookings in 14 days  
   - "Drop-ins" — past visitors with no active package

2. **Step 2 — Select Offer/Tone**: `Select` dropdown with three options:
   - "Friendly Reminder"
   - "Last-Minute 10% Discount"
   - "Bring a Friend Pass"

3. **Step 3 — Generate & Preview**: "Generate Campaign" button → 2s skeleton loader → mocked email + SMS preview in a bordered card. Content varies by segment + tone selection.

4. **Step 4 — Deploy**: Primary violet button "🚀 Deploy to [X] Students" → confetti animation (CSS keyframes) + success toast "AI Agent deployed! Watch the bookings roll in."

## Changes

| File | Action |
|------|--------|
| `src/components/schedule/AIClassFiller.tsx` | **Create** — self-contained AI filler component |
| `src/components/schedule/ViewStudentsDialog.tsx` | **Edit** — import and render AIClassFiller below roster, pass props including isPro from `useSubscriptionTier` |

## Technical Notes
- Mock student count for deploy button: random 4–12 based on segment
- Confetti: lightweight CSS animation (absolute positioned dots) — no external library
- All data is mocked/simulated — no backend calls for generation
- Uses existing shadcn components: Card, Select, Button, Badge, Skeleton
- `useSubscriptionTier` already exists and returns `isPro`


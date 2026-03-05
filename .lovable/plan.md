

# Plan: Kiosk Instructor Schedule Dashboard

## Problem
After PIN login, the kiosk jumps directly to a single class's live roster. There's no way to browse the day's full schedule or navigate to other dates.

## Solution
Add a new intermediate page (`KioskSchedule`) between PIN login and the live roster. The login flow changes from:
- **Before**: PIN → Live Roster (single class)
- **After**: PIN → Schedule Dashboard (browse days, see all classes) → tap "Open Roster" → Live Roster

## Changes

### 1. New Page: `src/pages/KioskSchedule.tsx`

**Props via URL params**: `instructor` (id), `name` (instructor name), `studioId`

**State**: `selectedDate` (defaults to today)

**Section A — Header & Date Navigation**:
- Prominent date display ("Today, Mar 5" or "Thursday, Mar 6")
- `<` / `>` buttons to go prev/next day
- Calendar icon opens a `Popover` + `Calendar` (shadcn DatePicker) for jumping to any date
- Instructor name + logout button

**Section B — "Up Next" Hero Card** (conditional):
- Only shows when `selectedDate === today` AND there's a future class today
- Larger card with accent border, class name, time, bold "Open Roster" button
- Links to `/kiosk/live/:classId`

**Section C — Daily Itinerary**:
- Fetches all classes for this instructor on `selectedDate` from the `classes` table
- Each row: time, class name, capacity badge ("X/Y Booked"), "View Roster" button
- Past classes get dimmed text + "Completed" badge
- Empty state: "No classes scheduled for this day. Enjoy the rest!"

**Data fetching**: Query `classes` table filtered by `instructor_id`, `studio_id`, and date range (`startOfDay` to `endOfDay` of `selectedDate`). Join bookings count via a separate query.

### 2. Edit: `src/pages/KioskLogin.tsx`

After successful PIN login, navigate to the new schedule page instead of directly to a class roster:
```
navigate(`/kiosk/schedule?instructor=${id}&name=${name}&studioId=${studioId}`)
```
Remove the "No upcoming classes found" dead-end — the schedule page handles empty days gracefully.

### 3. Edit: `src/App.tsx`

Add route: `/kiosk/schedule` → `KioskSchedule` (wrapped in AuthGate + StudioProvider, same as other kiosk routes).

### 4. Edge Function: `kiosk-pin-login/index.ts`

Keep returning `next_class` (used by the schedule page to highlight "Up Next"), but the navigation decision moves to the client. Add `studio_id` to the response so the schedule page can query classes.

| File | Action |
|------|--------|
| `src/pages/KioskSchedule.tsx` | **Create** — full schedule dashboard |
| `src/pages/KioskLogin.tsx` | **Edit** — navigate to `/kiosk/schedule` instead of `/kiosk/live/:classId` |
| `src/App.tsx` | **Edit** — add `/kiosk/schedule` route |


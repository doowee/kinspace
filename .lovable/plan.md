

# Plan: Student Detail CRM Sheet

## Overview
Add a clickable row → side drawer (Sheet) pattern to the Students page. The Sheet shows full student profile with editable fields and notes, with a sticky save footer.

## Changes — Single File: `src/pages/Students.tsx`

### 1. Expand Data Model
- Update `StudentRow` interface to include `injury_notes`, `staff_notes`, `phone`, `created_at`
- Update the profiles fetch query to select these additional columns
- Map them into the rows

### 2. Make Rows Clickable
- Add `cursor-pointer` and `onClick` to each `<TableRow>` to open the detail sheet
- Set a `selectedStudent` state variable

### 3. Student Detail Sheet
Add a `<Sheet>` that opens when `selectedStudent` is set, containing:

**Section A — Header & Quick Stats**
- Full name + email displayed prominently
- Badge indicators: 🔰 (total_bookings ≤ 3), 🏆 (total_bookings ≥ 50), ⚠️ (injury_notes not null)
- Read-only stats row: Total Classes, Join Date (`created_at`), Membership Tier

**Section B — Editable Demographics**
- `<Input>` fields for: First Name, Last Name, Phone, Email (read-only since it's auth-bound)
- Local state for editable fields, pre-filled on open

**Section C — Notes Engine**
- `<Textarea>` for `injury_notes` with amber warning helper text about kiosk flag
- `<Textarea>` for `staff_notes` with helper text

**Sticky Footer**
- "Cancel" (closes sheet) + "Save Profile" button
- Save executes `supabase.from("profiles").update({ first_name, last_name, phone, injury_notes, staff_notes }).eq("id", student.user_id)`
- On success: optimistic update of local `students` state, close sheet, success toast
- On error: error toast

### 4. Imports to Add
- `Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription` from shadcn
- `Textarea` from shadcn
- `Label` from shadcn
- `AlertTriangle, Award, Star` icons from lucide (for badges)
- `toast` from sonner

### No Database Changes Needed
All columns (`injury_notes`, `staff_notes`, `phone`, `first_name`, `last_name`) already exist on `profiles`. The existing RLS policies ("Users can update their own profile" + "Staff can update student staff_notes") cover updates. The "Staff can update student staff_notes" policy allows owners/instructors to update — but it doesn't restrict columns, so it covers all fields being updated here.

| File | Action |
|------|--------|
| `src/pages/Students.tsx` | **Edit** — add Sheet, editable fields, save logic |


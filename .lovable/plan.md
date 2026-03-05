

# Plan: Instructor Notes Modal on Kiosk Roster

## Problem
Instructors can see injury badges but have no way to read injury details in full or write internal observations about students from the roster view.

## Database Change
Add a `staff_notes` column to the `profiles` table:
```sql
ALTER TABLE public.profiles ADD COLUMN staff_notes text;
```
No RLS changes needed — instructors can already update profiles via the existing co-members SELECT policy, and the `profiles` UPDATE policy is user-only, so we need a new RLS policy allowing studio staff (owners/instructors) to update `staff_notes`.

Actually, looking at the existing RLS: only users can update their own profile. We need a new UPDATE policy for staff:
```sql
CREATE POLICY "Staff can update student staff_notes"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM studio_members sm1
    JOIN studio_members sm2 ON sm1.studio_id = sm2.studio_id
    WHERE sm1.user_id = auth.uid()
      AND sm2.user_id = profiles.id
      AND sm1.role IN ('owner', 'instructor')
  )
);
```

## UI Changes — Single File: `src/pages/KioskLiveRoster.tsx`

1. **Add `staff_notes` to data model**: Update `RosterStudent` interface, fetch query, and mapping to include `staff_notes` from profiles.

2. **Add 📝 Notes button** on each student card (top-left or bottom-right), with `e.stopPropagation()` to prevent triggering check-in.

3. **Sheet (side drawer)** opens when tapped, containing:
   - **Section 1 — Injury & Modification Notes (Read-Only)**: Amber/red background block showing `injury_notes` or "No reported injuries."
   - **Section 2 — Internal Staff Notes (Editable)**: `<Textarea>` bound to local state, pre-filled with existing `staff_notes`.
   - **Save Notes button**: Calls `supabase.from("profiles").update({ staff_notes }).eq("id", student.user_id)`. On success: optimistic roster update, close sheet, success toast.

4. **Imports to add**: `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` from shadcn, `Textarea`, `FileText` or `StickyNote` icon from lucide.

## No changes to existing badge logic.


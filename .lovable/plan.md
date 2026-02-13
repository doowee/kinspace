

## Student Portal

This plan adds a role-aware experience so students see their own dashboard and a simplified navbar, while owners/instructors keep the current admin view.

### What Changes

**1. New Component: `src/components/dashboard/StudentDashboard.tsx`**

A dedicated student view with:
- **Greeting**: "Welcome back, [First Name]" -- fetched from the `profiles` table
- **Top Cards** (2-column grid):
  - **Next Class**: Queries `bookings` joined with `classes` where `user_id = me`, `status = 'confirmed'`, and `start_time > now()`, ordered ascending, limit 1. Shows the class name, date, and time, or "No upcoming classes" if empty.
  - **Wallet**: Sums `credits_remaining` from `student_passes` where `user_id = me`, `studio_id = active studio`, credits > 0, and not expired. Shows the total with a color indicator.
- **My Schedule List**: All confirmed bookings for the user, ordered by `start_time` ascending (upcoming first). Each row shows class name, date/time, and a "Cancel" button.
- **Cancel Logic**: Updates the booking status to `'cancelled'`, then finds the earliest-expiring active `student_pass` for the user/studio and increments `credits_remaining` by 1. Shows a success toast and refreshes the list.

**2. Update: `src/pages/Dashboard.tsx`**

- Read `activeRole` from `useStudio()`
- If `activeRole === 'student'`, render `<StudentDashboard />`
- Otherwise, render the existing owner/admin stats view

**3. Update: `src/components/AppLayout.tsx`**

- Read `activeRole` from `useStudio()` (already imported)
- Conditionally render nav links based on role:
  - **Students** see: Dashboard, Schedule, and a "Book a Class" link (points to `/book/{activeStudio.slug}`)
  - **Owners/Instructors** see: the full nav (Dashboard, Schedule, Finance, Organization, Settings)
- The CreditsBadge and user avatar dropdown remain for all roles

### Technical Details

```text
Role Check Flow
===============
activeRole (from StudioContext)
  |
  +-- "owner" or "instructor" --> Full navbar + Owner Dashboard
  |
  +-- "student" --> Simplified navbar + StudentDashboard component
```

**Database queries used (no schema changes needed):**
- `profiles` table: `SELECT first_name FROM profiles WHERE id = user.id`
- `bookings` + `classes` join: Fetch upcoming confirmed bookings
- `student_passes`: Sum credits for wallet card
- Booking cancellation: `UPDATE bookings SET status = 'cancelled'` + `UPDATE student_passes SET credits_remaining = credits_remaining + 1`

**Files to create:**
- `src/components/dashboard/StudentDashboard.tsx`

**Files to modify:**
- `src/pages/Dashboard.tsx` -- add role conditional
- `src/components/AppLayout.tsx` -- conditional nav links + "Book a Class" button

No database migrations required. All tables and RLS policies already support these queries.

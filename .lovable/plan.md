

# Students CRM: Access Status & Billing Upgrade

## Overview
Replace the static "Tier" column with live access data from `user_subscriptions` + `profiles.class_points`, add a Billing & Access section to the detail sheet, and enable manual point adjustments.

## 1. Data Fetching Changes

In `fetchStudents`, add two new queries:

- **Subscriptions**: Fetch `user_subscriptions` (status = 'active') joined with `products` (for `name`) for all student `userIds`. Build a map: `userId → { productName, status, currentPeriodEnd }`.
- **Class Points**: Already available — add `class_points` to the profiles select.

Update the `StudentRow` interface:
- Remove `membership_tier`
- Add `class_points: number`, `subscription_name: string | null`, `subscription_status: string | null`, `subscription_period_end: string | null`

## 2. Table Column: "Tier" → "Access Status"

Replace the current Tier column header and cell:

- **If `subscription_name`**: Gold badge (`bg-yellow-500/15 text-yellow-700 border-yellow-300`) with `🏆 {subscription_name}`
- **Else if `class_points >= 1`**: Blue badge (`bg-blue-500/15 text-blue-700 border-blue-300`) with `{class_points} Points`
- **Else**: Gray badge (`bg-muted text-muted-foreground`) with `No Active Access`

## 3. Student Detail Sheet: "Billing & Access" Section

Insert a new section between the badges/stats and Demographics:

### Access Card
- Show subscription details if active: Plan name, renewal date (`format(currentPeriodEnd, "MMM d, yyyy")`), status badge
- Show point balance with an inline `+` button for manual adjustments

### Add Points Dialog
- Small `+` icon button next to points display
- On click, show an inline input (number) + "Add" button
- Calls `supabase.rpc('increment_class_points', { _user_id, _amount })` (RPC already exists)
- Optimistically updates the student row and shows a success toast

### Transaction History
- A collapsible section or expandable area
- Fetches from `transactions` table where `user_id = selectedStudent.user_id` and `studio_id IN studioIds`
- Displays: date, description, amount, payment method, status
- Also fetches recent bookings (last 10) for that user to show class history

## 4. Files Changed

| File | Action |
|------|--------|
| `src/pages/Students.tsx` | **Edit** — all changes in this single file |

No database migrations needed — all tables and RPCs already exist.

## 5. Key Implementation Details

- The `increment_class_points` RPC is `SECURITY DEFINER` and already exists, so staff can add points without needing direct profile update access
- Subscriptions are fetched via the owner's RLS policy on `user_subscriptions` (`Owners can manage studio subscriptions`)
- Transactions are fetched via the owner/instructor SELECT policy on `transactions`
- The `class_points` field on profiles is already in the SELECT via `Co-members can view limited profile info` policy


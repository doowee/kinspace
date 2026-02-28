
# Plan: Fix Instructor Scoping, Data, and Rename Org Route

## 1. Rename route from `/org-revenue` to `/org-admin`

**Files to update:**
- `src/App.tsx` — change route path from `/org-revenue` to `/org-admin`
- `src/components/AppLayout.tsx` — change the navigation link href from `/org-revenue` to `/org-admin`

## 2. Scope instructors to active organization only

**Problem:** `InstructorsAdmin.tsx` fetches instructors for all studios the user's active studio belongs to via `organization_id`. However, the user may also be a member of studios in OTHER organizations. The current code correctly scopes by org, but the `orgStudios` dropdown (line 91) uses `memberships` which includes ALL the user's studios across all orgs.

**Fix in `src/pages/InstructorsAdmin.tsx`:**
- Update the `orgStudios` fetch (lines 89-97) to filter by the active studio's `organization_id` instead of just using all membership studio IDs. This ensures the studio list and instructor list only show data from the current organization.

**Current (broken):**
```typescript
const studioIds = memberships.map((m) => m.studio_id);
const { data } = await supabase.from("studios").select("id, name, location").in("id", studioIds);
```

**Fixed:**
```typescript
// First get active studio's org_id, then fetch only studios in that org
const { data: studioRow } = await supabase
  .from("studios").select("organization_id").eq("id", activeStudio.id).single();
if (studioRow?.organization_id) {
  const { data } = await supabase.from("studios")
    .select("id, name, location")
    .eq("organization_id", studioRow.organization_id);
  setOrgStudios((data ?? []) as StudioOption[]);
}
```

## 3. Clean up test data — remove "To the moon" instructors

**Data cleanup:** Delete the 4 instructor records belonging to the "To the moon" studio (`studio_id = 7810d3ee-...`) since they are test/duplicate data that shouldn't exist.

## 4. Regarding instructors without email accounts

Instructors without emails are valid — they are placeholder records created before an instructor account is provisioned. The "Add" flow provisions a real user account with an email. Existing placeholders (Jordan Lee, Marco Rivera, Priya Sharma) were likely created by the demo seed script.

**Options (will ask the user):**
- Leave them as-is (they serve as roster placeholders)
- Delete them if they are just test data
- Require email for all new instructor records going forward

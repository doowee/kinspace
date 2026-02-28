

# Plan: Instructor Contact Info and Messaging

## Overview
Three changes: (1) generate emails and provision accounts for the 3 instructors without emails, (2) add a phone field to instructors, and (3) add a "Message" button on each instructor row to open the existing DirectMessageDrawer.

---

## 1. Add `phone` column to `instructors` table

Run a migration to add a nullable `phone` text column:
```sql
ALTER TABLE public.instructors ADD COLUMN phone text;
```

## 2. Generate emails and link accounts for unlinked instructors

For the 3 instructors without accounts (Marco Rivera, Priya Sharma, Jordan Lee in studio `11111111-...`), call the `provision-instructor` edge function for each one with generated emails based on their names (e.g., `marco.rivera@mypilatesempire.studio`, `priya.sharma@mypilatesempire.studio`, `jordan.lee@mypilatesempire.studio`). Since these are placeholder accounts, we can use a simple naming convention. Alternatively, I can generate random emails at a placeholder domain -- I'll ask you to confirm the email pattern.

Actually, since these instructors need real auth accounts and the provision flow sends invite emails, I'll generate realistic placeholder emails and provision them. The edge function will create auth users and link them.

## 3. Update the UI

### InstructorsAdmin.tsx (main instructors page)
- **Fetch phone**: Add `phone` to the instructor select query
- **Display phone column**: Add a "Phone" column in the table next to Email
- **Add phone to Add form**: Add a phone input field in the provision dialog
- **Add phone to Edit form**: Add a phone input field in the edit dialog
- **Save phone**: Include phone in the update/provision calls
- **Message button**: Add a `MessageCircle` icon button in the Actions column that opens `DirectMessageDrawer` with the instructor's name and email

### InstructorsTab.tsx (settings tab)
- Mirror the same phone field additions in the add/edit dialogs
- Add phone display in the instructor list
- Add message button

### provision-instructor edge function
- Accept an optional `phone` field and save it to the instructor record

## 4. Wire up DirectMessageDrawer
- Import `DirectMessageDrawer` into `InstructorsAdmin.tsx`
- Add state for `dmOpen` and `dmTarget` (instructor name + email)
- The existing drawer already supports owner vs instructor role-based messaging

---

## Technical Details

**Migration:**
```sql
ALTER TABLE public.instructors ADD COLUMN phone text;
```

**Files to modify:**
- `src/pages/InstructorsAdmin.tsx` -- add phone column, message button, DM drawer
- `src/components/settings/InstructorsTab.tsx` -- add phone field to add/edit forms
- `supabase/functions/provision-instructor/index.ts` -- accept phone param, save to instructor record

**New interface field:**
```typescript
interface InstructorRow {
  // ... existing fields
  phone: string | null;
}
```


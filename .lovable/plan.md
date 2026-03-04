

## Instructor Data + UI Updates

### 1. Insert Dummy Instructors

Insert 3 sample instructors linked to "My Studio" (`7f617c1a-1cb0-4494-ae6f-ce0f72755d0e`) using the database insert tool:

- **Sarah Jones** -- "Certified Pilates Instructor with 5 years of experience specializing in reformer and mat classes." (display_order: 1)
- **Marco Rivera** -- "Former professional dancer turned movement specialist. Expert in barre and contemporary techniques." (display_order: 2)  
- **Aisha Patel** -- "Yoga and mindfulness coach with a focus on breathwork and restorative practices." (display_order: 3)

No photo URLs for now (left null).

### 2. Public Booking Page -- Show Instructor Info

**File: `src/pages/BookingPage.tsx`**

The RPC `get_public_classes_by_studio_slug` already returns `instructor_first_name` (mapped to `instructors.name`) and `instructor_last_name` (empty string). The booking page already renders the instructor name via the `instructorName()` helper (line 224-229) and displays it on each class card (line 386-388).

No changes needed here -- it already works once instructors are linked to classes.

### 3. Create Class Form -- Instructor Dropdown

**File: `src/pages/Schedule.tsx`**

- Add state for `instructors` list and `selectedInstructorId`
- Fetch instructors from `supabase.from("instructors").select("id, name").eq("studio_id", activeStudio.id).order("display_order")` when the studio loads
- Add a `Select` dropdown (from the existing `@/components/ui/select`) in the Create Class form between "Class Name" and "Time", with a "None" option and all fetched instructors
- Include `instructor_id` in the `.insert()` call when creating a class
- Also display the instructor name on each class card in the Schedule page by joining instructor data (fetch classes with `.select("*, instructors(name)")`)

### Technical Details

**Files modified:**
- `src/pages/Schedule.tsx` -- add instructor fetch, dropdown in form, instructor name display on class cards

**No database changes needed** -- the `instructors` table and FK on `classes.instructor_id` already exist.

**Data insert** -- 3 rows into `public.instructors` via the insert tool.


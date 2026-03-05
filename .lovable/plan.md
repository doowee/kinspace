

# Studio-Branded Login Pages + Tenant Mapping on Sign-Up

## Overview

Add slug-based branded routes (`/s/:studio_slug` and `/s/:studio_slug/staff`) that display the studio's logo, name, and colors on login/signup pages. When a new user signs up on a branded URL, automatically map them to that studio as a student member.

## Part 1: Database Migration — Tenant Mapping

Update `handle_new_user()` trigger to read `studio_id` from `raw_user_meta_data` and:
- Set `home_studio_id` on the new profile
- Insert a `studio_members` record with `role = 'student'` (with `ON CONFLICT DO NOTHING` safety)
- Only if the `studio_id` actually exists in the `studios` table

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _studio_id uuid;
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, phone, home_studio_id)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'studio_id', '')::uuid
  );

  _studio_id := NULLIF(NEW.raw_user_meta_data->>'studio_id', '')::uuid;
  IF _studio_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.studios WHERE id = _studio_id) THEN
    INSERT INTO public.studio_members (user_id, studio_id, role)
    VALUES (NEW.id, _studio_id, 'student')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END; $$;
```

## Part 2: New Component — `StudioBrandedLandingWrapper`

**File:** `src/components/StudioBrandedLandingWrapper.tsx`

- Reads `:studio_slug` from URL params
- Wraps children in `StudioThemeProvider` (reuses existing slug-based fetch + CSS injection)
- Shows skeleton while loading, "Studio Not Found" if invalid slug
- No new database calls — uses existing `get_public_studio_by_slug` RPC via `StudioThemeProvider`

## Part 3: Update `StudentLanding.tsx`

- Accept optional `studio?: { id: string; name: string; logo_url: string | null }` prop
- When `studio` is present:
  - Left panel: Replace `<Sparkles> Kinspace` with studio logo (`<img>`) + studio name
  - Hero text: "{Studio Name} — Book classes, manage credits"
  - Mobile header: Studio logo + name instead of Kinspace
- **Sign-up form**: When `studio` is provided, inject `studio_id: studio.id` into `options.data` of `supabase.auth.signUp()` — this is the critical tenant mapping
- When no `studio` prop: unchanged behavior (backward compatible)

## Part 4: Update `InstructorLanding.tsx`

- Accept optional `studio?: { id: string; name: string; logo_url: string | null }` prop
- When `studio` is present:
  - Replace `<Lock> Kinspace` with studio logo + studio name
  - Hero: "{Studio Name} — Staff Portal"
- No signup on instructor landing (login only), so no metadata injection needed

## Part 5: Update Auth Gates

**`StudentAuthGate.tsx`:**
- Import `useStudioTheme` from `StudioThemeProvider`
- Try to read studio context (returns null if not inside a theme provider)
- Pass `studio` prop to `<StudentLanding studio={studio} />` when rendering the unauthenticated state

**`InstructorAuthGate.tsx`:**
- Same pattern — pass `studio` prop to `<InstructorLanding studio={studio} />`

Both gates use a safe optional access pattern since the theme context may not always be present (generic routes have no provider).

## Part 6: Update `App.tsx` — Add Branded Routes

Add two new route blocks:

```text
/s/:studio_slug          → StudioBrandedLandingWrapper > StudentAuthGate > StudentLayout > [BookClass, Credits]
/s/:studio_slug/staff    → StudioBrandedLandingWrapper > InstructorAuthGate > InstructorPortal
```

These sit alongside existing `/book-class` and `/instructor-portal` routes which remain unchanged as generic fallbacks.

## Files Summary

| File | Action |
|------|--------|
| 1 SQL migration | **Create** — update `handle_new_user` trigger for tenant mapping |
| `src/components/StudioBrandedLandingWrapper.tsx` | **Create** |
| `src/components/student/StudentLanding.tsx` | **Edit** — accept studio prop, branded UI, pass `studio_id` in signup |
| `src/components/instructor/InstructorLanding.tsx` | **Edit** — accept studio prop, branded UI |
| `src/components/student/StudentAuthGate.tsx` | **Edit** — pass studio context to landing |
| `src/components/instructor/InstructorAuthGate.tsx` | **Edit** — pass studio context to landing |
| `src/App.tsx` | **Edit** — add `/s/:studio_slug` routes |


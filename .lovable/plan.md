

# Products & Memberships: Schema + Settings UI

## Part 1: Database Migration

Create two new tables and RLS policies:

**Table: `products`**
```sql
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  product_type VARCHAR NOT NULL CHECK (product_type IN ('pack', 'subscription')),
  point_value INTEGER,
  access_scope VARCHAR CHECK (access_scope IN ('single_studio', 'all_studios')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: Studio owners can CRUD. Studio members can SELECT.

**Table: `user_subscriptions`**
```sql
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  studio_id UUID REFERENCES public.studios(id),
  status VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due')),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS: Owners can CRUD for their studio's subscriptions. Users can SELECT own rows.

Also add `updated_at` triggers on both tables.

## Part 2: UI — Rewrite `PackagesTab` → `ProductsTab`

**File: `src/components/settings/ProductsTab.tsx`** (new, replaces PackagesTab)

- Fetches `products` WHERE `studio_id = activeStudio.id`
- Data table with columns: Name, Type (badge: Pack/Subscription), Price, Points/Scope, Active toggle
- "Create Product" button opens a Dialog with:
  - Name (text input)
  - Price (number input)
  - Type toggle: "Class Pack" vs "Unlimited Subscription"
  - Conditional fields:
    - Pack → `point_value` number input
    - Subscription → `access_scope` select ("Single Studio" / "All Studios")
  - Save button → `supabase.from('products').insert()`
- Delete button per row

**File: `src/pages/Settings.tsx`** (edit)

- Replace import of `PackagesTab` with `ProductsTab`
- Rename tab trigger from "Packages" to "Products & Memberships"

## Files Summary

| File | Action |
|------|--------|
| 1 SQL migration | **Create** — `products` + `user_subscriptions` tables with RLS |
| `src/components/settings/ProductsTab.tsx` | **Create** — full CRUD UI |
| `src/pages/Settings.tsx` | **Edit** — swap tab import + label |
| `src/components/settings/PackagesTab.tsx` | **Delete** (no longer imported) |


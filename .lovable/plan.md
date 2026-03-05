

# Add Stripe Mapping Columns to Products Table

The `products` table, `ProductsTab`, and Settings routing are already implemented. The only change needed is a small migration to add two nullable columns for Stripe integration.

## Database Migration

Add two columns to the existing `products` table:

```sql
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_product_id VARCHAR;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR;
```

No UI changes needed — these columns are backend-only for the upcoming Stripe billing integration phase.

## Files

| File | Action |
|------|--------|
| 1 SQL migration | **Create** — add `stripe_product_id` and `stripe_price_id` to `products` |


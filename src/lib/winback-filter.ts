/**
 * Pure helpers for the bulk-SMS win-back recipient pipeline.
 *
 * Extracted from src/pages/Students.tsx so the filtering rules around
 * `excludeOptedOut` can be unit-tested in isolation. The logic here MUST
 * mirror the inline `bulkRecipients` / `bulkExcludedOptedOut` memos used
 * by the Students CRM.
 */

export type BulkSmsMode = "reengage" | "renew" | "winback";
export type TierFilter = "all" | "active" | "inactive" | "expiring" | "lapsed";

export interface FilterableStudent {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  sms_opted_out: boolean | null;
  subscription_period_end?: string | null;
}

const MODE_TO_TIER: Record<BulkSmsMode, TierFilter> = {
  reengage: "inactive",
  renew: "expiring",
  winback: "lapsed",
};

/** Recipients eligible for the bulk SMS, after applying the opt-out toggle. */
export function getBulkRecipients(
  filtered: FilterableStudent[],
  mode: BulkSmsMode,
  tierFilter: TierFilter,
  excludeOptedOut: boolean,
): FilterableStudent[] {
  if (MODE_TO_TIER[mode] !== tierFilter) return [];
  return excludeOptedOut
    ? filtered.filter((s) => !s.sms_opted_out)
    : filtered.slice();
}

/** Students excluded by the toggle (i.e. opted-out) for the current mode/tier. */
export function getExcludedOptedOut(
  filtered: FilterableStudent[],
  mode: BulkSmsMode,
  tierFilter: TierFilter,
  excludeOptedOut: boolean,
): FilterableStudent[] {
  if (!excludeOptedOut) return [];
  if (MODE_TO_TIER[mode] !== tierFilter) return [];
  return filtered.filter((s) => !!s.sms_opted_out);
}

/** Effective recipient count surfaced on the bulk SMS button. */
export function getEffectiveBulkCount(
  filtered: FilterableStudent[],
  excludeOptedOut: boolean,
): number {
  if (!excludeOptedOut) return filtered.length;
  const optedOut = filtered.filter((s) => !!s.sms_opted_out).length;
  return Math.max(0, filtered.length - optedOut);
}

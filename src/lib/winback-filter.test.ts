import { describe, it, expect } from "vitest";
import {
  getBulkRecipients,
  getExcludedOptedOut,
  getEffectiveBulkCount,
  type FilterableStudent,
} from "@/lib/winback-filter";

const make = (
  id: string,
  opts: Partial<FilterableStudent> = {},
): FilterableStudent => ({
  user_id: id,
  first_name: `F${id}`,
  last_name: `L${id}`,
  email: `${id}@example.com`,
  phone: `+1555000${id.padStart(4, "0")}`,
  sms_opted_out: false,
  ...opts,
});

const lapsed: FilterableStudent[] = [
  make("1"),
  make("2", { sms_opted_out: true }),
  make("3"),
  make("4", { sms_opted_out: true }),
  make("5", { phone: null }),
];

describe("win-back recipient filtering", () => {
  describe("excludeOptedOut = true (default)", () => {
    it("removes STOP-replied students from recipients", () => {
      const r = getBulkRecipients(lapsed, "winback", "lapsed", true);
      expect(r.map((s) => s.user_id)).toEqual(["1", "3", "5"]);
      expect(r.every((s) => !s.sms_opted_out)).toBe(true);
    });

    it("returns all opted-out students as the excluded list", () => {
      const ex = getExcludedOptedOut(lapsed, "winback", "lapsed", true);
      expect(ex.map((s) => s.user_id)).toEqual(["2", "4"]);
      expect(ex).toHaveLength(2);
    });

    it("effective count = total − opted-out", () => {
      expect(getEffectiveBulkCount(lapsed, true)).toBe(3);
    });

    it("recipient count + excluded count = total filtered set", () => {
      const r = getBulkRecipients(lapsed, "winback", "lapsed", true);
      const ex = getExcludedOptedOut(lapsed, "winback", "lapsed", true);
      expect(r.length + ex.length).toBe(lapsed.length);
    });
  });

  describe("excludeOptedOut = false", () => {
    it("includes opted-out students in recipients", () => {
      const r = getBulkRecipients(lapsed, "winback", "lapsed", false);
      expect(r).toHaveLength(lapsed.length);
      expect(r.some((s) => s.sms_opted_out)).toBe(true);
    });

    it("excluded list is empty (no exclusions applied)", () => {
      expect(getExcludedOptedOut(lapsed, "winback", "lapsed", false)).toEqual([]);
    });

    it("effective count = total", () => {
      expect(getEffectiveBulkCount(lapsed, false)).toBe(lapsed.length);
    });
  });

  describe("mode/tier guard rails", () => {
    it("returns no recipients when mode is winback but tier is not 'lapsed'", () => {
      expect(getBulkRecipients(lapsed, "winback", "inactive", true)).toEqual([]);
      expect(getBulkRecipients(lapsed, "winback", "all", false)).toEqual([]);
    });

    it("returns no excluded list when mode/tier mismatch", () => {
      expect(getExcludedOptedOut(lapsed, "winback", "expiring", true)).toEqual([]);
    });

    it("re-engage pairs with 'inactive' tier", () => {
      const inactive = [make("a"), make("b", { sms_opted_out: true })];
      expect(getBulkRecipients(inactive, "reengage", "inactive", true).map(s => s.user_id))
        .toEqual(["a"]);
    });

    it("renew pairs with 'expiring' tier", () => {
      const expiring = [make("x", { sms_opted_out: true }), make("y")];
      expect(getBulkRecipients(expiring, "renew", "expiring", true).map(s => s.user_id))
        .toEqual(["y"]);
    });
  });

  describe("edge cases", () => {
    it("treats null sms_opted_out as not opted out", () => {
      const rows = [make("a", { sms_opted_out: null }), make("b", { sms_opted_out: true })];
      expect(getBulkRecipients(rows, "winback", "lapsed", true).map(s => s.user_id)).toEqual(["a"]);
    });

    it("empty filtered set yields empty recipients and zero count", () => {
      expect(getBulkRecipients([], "winback", "lapsed", true)).toEqual([]);
      expect(getExcludedOptedOut([], "winback", "lapsed", true)).toEqual([]);
      expect(getEffectiveBulkCount([], true)).toBe(0);
    });

    it("all opted-out → effective count is 0 and recipients empty", () => {
      const allOut = [
        make("a", { sms_opted_out: true }),
        make("b", { sms_opted_out: true }),
      ];
      expect(getBulkRecipients(allOut, "winback", "lapsed", true)).toEqual([]);
      expect(getEffectiveBulkCount(allOut, true)).toBe(0);
    });
  });
});

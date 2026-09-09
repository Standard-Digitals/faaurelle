import { describe, expect, it } from "vitest";
import { validateWaybill, WAYBILL_MAX_LENGTH } from "./tracking";

describe("waybill validation", () => {
  it("rejects an empty value", () => {
    expect(validateWaybill("   ")).toMatchObject({ success: false });
  });

  it("trims a single numeric waybill", () => {
    expect(validateWaybill("  1122345678722  ")).toEqual({ success: true, waybill: "1122345678722" });
  });

  it.each(["1122,3344", "1122 3344", "awb-1122", "https://example.com/1122"])("rejects malformed or multiple identifiers: %s", (value) => {
    expect(validateWaybill(value)).toMatchObject({ success: false });
  });

  it("rejects an excessively long value", () => {
    expect(validateWaybill("1".repeat(WAYBILL_MAX_LENGTH + 1))).toMatchObject({ success: false });
  });
});

import { describe, expect, it } from "vitest";
import {
  validateTrackingReference,
} from "./tracking";

describe("tracking reference classification", () => {
  it("normalizes a complete Aurelle order reference", () => {
    expect(validateTrackingReference(" fa-0123456789abcdef0123 ")).toEqual({
      success: true,
      reference: "FA-0123456789ABCDEF0123",
      kind: "internal",
    });
  });

  it.each([
    ["FA_83E111BF6CA04DD8AC57455526B9D3E3", "fa_83e111bf6ca04dd8ac57455526b9d3e3", "delhivery_order"],
    ["86313610000092", "86313610000092", "delhivery_waybill"],
    ["ORDER_TDUZQL01OQDHMY", "order_tduzql01oqdhmy", "razorpay_order"],
    ["PAY_TDUAGJCHNRY90B", "pay_tduagjchnry90b", "razorpay_payment"],
  ])("detects and normalizes provider reference %s", (input, reference, kind) => {
    expect(validateTrackingReference(input)).toEqual({ success: true, reference, kind });
  });

  it.each([
    "FA-0123",
    "FA-OPAQUE_PUBLI",
    "FA-0123456789ABCDEFGH12",
    "FA-0123456789ABCDEF0123-extra",
    "1122,3344",
    "https://example.com/order",
    "1".repeat(65),
  ])("rejects malformed, multiple, URL, or oversized input: %s", (value) => {
    expect(validateTrackingReference(value)).toMatchObject({ success: false });
  });
});

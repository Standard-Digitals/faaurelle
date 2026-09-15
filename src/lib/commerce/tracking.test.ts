import { describe, expect, it } from "vitest";
import {
  validateTrackingReference,
} from "./tracking";

describe("tracking reference classification", () => {
  it("normalizes a complete Aurelle order reference", () => {
    expect(validateTrackingReference(" fa-0123456789abcdef0123 ")).toEqual({
      success: true,
      reference: "FA-0123456789ABCDEF0123",
    });
  });

  it.each([
    "FA-0123",
    "FA-OPAQUE_PUBLI",
    "FA-0123456789ABCDEFGH12",
    "FA-0123456789ABCDEF0123-extra",
    "1122,3344",
    "1122345678722",
    "https://example.com/order",
    "1".repeat(65),
  ])("rejects malformed, multiple, URL, or oversized input: %s", (value) => {
    expect(validateTrackingReference(value)).toMatchObject({ success: false });
  });
});

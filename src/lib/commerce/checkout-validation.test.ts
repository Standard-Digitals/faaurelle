import { describe, expect, it, vi } from "vitest";
import { validateCheckoutPayload } from "./checkout-validation";

vi.mock("server-only", () => ({}));

const validPayload = {
  fullName: "  Aanya   Sharma  ",
  email: "  AANYA@example.com ",
  mobileNumber: "+91 98765-43210",
  addressLine1: "  12,   Lotus Road ",
  addressLine2: "  Near Central Park  ",
  city: "  Mumbai ",
  state: "Maharashtra",
  pincode: "400 001",
  countryCode: "US",
  amount: 1,
};

describe("checkout validation", () => {
  it("normalizes a valid guest checkout payload and fixes country to IN", () => {
    const result = validateCheckoutPayload(validPayload);
    expect(result).toEqual({
      success: true,
      data: {
        fullName: "Aanya Sharma",
        email: "aanya@example.com",
        mobileNumber: "+919876543210",
        addressLine1: "12, Lotus Road",
        addressLine2: "Near Central Park",
        city: "Mumbai",
        state: "Maharashtra",
        pincode: "400001",
        countryCode: "IN",
      },
    });
  });

  it("rejects an invalid email", () => {
    const result = validateCheckoutPayload({ ...validPayload, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.email).toBeDefined();
  });

  it.each(["12345", "1234567890", "+91 12345 67890"])("rejects invalid mobile %s", (mobileNumber) => {
    const result = validateCheckoutPayload({ ...validPayload, mobileNumber });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.mobileNumber).toBeDefined();
  });

  it.each(["40001", "4000011", "400A01"])("rejects invalid pincode %s", (pincode) => {
    const result = validateCheckoutPayload({ ...validPayload, pincode });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.pincode).toBeDefined();
  });

  it("reports missing required fields", () => {
    const result = validateCheckoutPayload({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toMatchObject({
        fullName: expect.any(String),
        email: expect.any(String),
        mobileNumber: expect.any(String),
        addressLine1: expect.any(String),
        city: expect.any(String),
        state: expect.any(String),
        pincode: expect.any(String),
      });
    }
  });

  it("rejects values over their maximum length", () => {
    const result = validateCheckoutPayload({ ...validPayload, addressLine1: "x".repeat(161) });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors.addressLine1).toBeDefined();
  });

  it("ignores browser amount fields", () => {
    const result = validateCheckoutPayload({ ...validPayload, amount: 1, totalPaisa: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("amount");
      expect(result.data).not.toHaveProperty("totalPaisa");
    }
  });
});

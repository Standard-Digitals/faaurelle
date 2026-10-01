import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db/prisma", () => ({ prisma: {} }));

const {
  checkoutAttemptDedupeKey,
  checkoutAttemptsCsv,
  describeCheckoutOutcome,
  hasPurchased,
  istDay,
  startOfIstDay,
} = await import("./checkout-attempts");
const { buildCheckoutAttemptAlert, buildCheckoutDigest } = await import("./checkout-attempt-email");
const { matchesSharedSecret } = await import("@/lib/server/auth/shared-secret");

type Attempt = Parameters<typeof describeCheckoutOutcome>[0];

function attempt(overrides: Partial<Attempt> = {}): Attempt {
  return {
    id: "a1",
    productCode: "hair-elixir",
    customerName: "Asha Sharma",
    customerEmail: "asha@example.com",
    customerPhone: "+919876543210",
    addressLine1: "12 Rose Street",
    addressLine2: null,
    city: "Pune",
    state: "Maharashtra",
    postalCode: "411001",
    deliveryCheck: "SERVICEABLE",
    detailsCheckCount: 1,
    firstSeenAt: new Date("2026-10-01T05:00:00Z"),
    lastSeenAt: new Date("2026-10-01T05:10:00Z"),
    order: null,
    ...overrides,
  };
}

const order = (paymentStatus: string) => ({
  customerReference: "FA-ABC",
  status: "AWAITING_PAYMENT",
  paymentStatus,
  totalPaisa: 209_900,
});

describe("checkout attempts", () => {
  it("groups a customer's attempts by IST day", () => {
    // 20:00 UTC on 30 Sep is 01:30 IST on 1 Oct.
    const lateNight = new Date("2026-09-30T20:00:00Z");
    expect(istDay(lateNight)).toBe("2026-10-01");
    expect(startOfIstDay(lateNight).toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(checkoutAttemptDedupeKey({ email: "Asha@Example.com", mobileNumber: "+919876543210" }, lateNight))
      .toBe("2026-10-01|asha@example.com|+919876543210");
  });

  it("describes how far the customer got", () => {
    expect(describeCheckoutOutcome(attempt())).toBe("details_only");
    expect(describeCheckoutOutcome(attempt({ deliveryCheck: "NOT_SERVICEABLE" }))).toBe("not_serviceable");
    expect(describeCheckoutOutcome(attempt({ deliveryCheck: "CHECK_FAILED" }))).toBe("delivery_check_failed");
    expect(describeCheckoutOutcome(attempt({ order: order("AWAITING_PAYMENT") }))).toBe("payment_not_completed");
    expect(describeCheckoutOutcome(attempt({ order: order("FAILED") }))).toBe("payment_failed");
    expect(describeCheckoutOutcome(attempt({ order: order("CAPTURED") }))).toBe("ordered");
    expect(describeCheckoutOutcome(attempt({ order: order("FAILED") }), true)).toBe("ordered");
  });

  it("matches purchases by email or phone", () => {
    expect(hasPurchased(attempt(), new Set(["phone:+919876543210"]))).toBe(true);
    expect(hasPurchased(attempt(), new Set(["email:asha@example.com"]))).toBe(true);
    expect(hasPurchased(attempt(), new Set(["email:other@example.com"]))).toBe(false);
  });

  it("builds an Excel-safe CSV", () => {
    const csv = checkoutAttemptsCsv([
      { attempt: attempt({ customerName: "=HYPERLINK(\"x\")", addressLine2: "Flat 4, Tower B" }), outcome: "payment_failed" },
    ]);
    const [header, line] = csv.replace(/^﻿/, "").trim().split("\r\n");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(header).toContain("Mobile (+91)");
    expect(line).toContain(`"'=HYPERLINK(""x"")"`);
    expect(line).toContain(`"Flat 4, Tower B"`);
    expect(line).toContain(",9876543210,");
    expect(line).toContain("Payment failed");
  });

  it("writes the instant alert and the daily summary", () => {
    const alert = buildCheckoutAttemptAlert(attempt());
    expect(alert.subject).toBe("Checkout started — Asha Sharma, Pune");
    expect(alert.text).toContain("Mobile: +919876543210");

    const digest = buildCheckoutDigest(
      [
        { attempt: attempt(), outcome: "details_only" },
        { attempt: attempt({ id: "a2", customerName: "Ravi" }), outcome: "ordered" },
      ],
      "2026-10-01",
    );
    expect(digest.subject).toBe("Checkout summary 2026-10-01 — 1 did not order");
    expect(digest.unfinished).toHaveLength(1);
    expect(digest.text).toContain("2 people started checkout. 1 ordered, 1 did not.");
    expect(digest.html).toContain("Asha Sharma");
    expect(digest.html).not.toContain("Ravi");
  });

  it("only accepts a configured, matching secret", () => {
    const secret = "a-long-shared-secret-value-123";
    expect(matchesSharedSecret(secret, secret)).toBe(true);
    expect(matchesSharedSecret("wrong", secret)).toBe(false);
    expect(matchesSharedSecret(secret, undefined)).toBe(false);
    expect(matchesSharedSecret("short", "short")).toBe(false);
  });
});

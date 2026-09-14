import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const token = "opaque_public_token_12345678901234567890";
const capturedOrder = {
  publicToken: token,
  productName: "Hair Elixir Oil-in-Serum",
  unitAmountPaisa: 209_900,
  quantity: 1,
  subtotalPaisa: 209_900,
  shippingPaisa: 0,
  taxPaisa: 0,
  totalPaisa: 209_900,
  currency: "INR",
  customerName: "Taranpreet Kaur",
  city: "Zirakpur",
  state: "Punjab",
  postalCode: "140603",
  countryCode: "IN",
  status: "PAID",
  paymentStatus: "CAPTURED",
  fulfillmentStatus: "CREATED",
  paidAt: new Date("2026-09-11T08:52:44.000Z"),
  shipment: {
    status: "CREATED",
    delhiveryWaybill: "1122345678722",
  },
};

describe("Order confirmation query", () => {
  it("returns a sanitized captured-order snapshot with created shipment state", async () => {
    const findOrder = vi.fn().mockResolvedValue(capturedOrder);
    const { getOrderConfirmation } = await import("./order-confirmation");

    await expect(getOrderConfirmation(token, { findOrder })).resolves.toEqual({
      displayReference: "FA-OPAQUE_PUBLI",
      productName: "Hair Elixir Oil-in-Serum",
      unitAmountPaisa: 209_900,
      quantity: 1,
      subtotalPaisa: 209_900,
      shippingPaisa: 0,
      taxPaisa: 0,
      totalPaisa: 209_900,
      currency: "INR",
      customerName: "Taranpreet Kaur",
      destination: "Zirakpur, Punjab 140603, India",
      paidAt: "2026-09-11T08:52:44.000Z",
      fulfilment: "created",
      waybill: "1122345678722",
    });
  });

  it.each([
    ["CREATING", "CREATING", "preparing"],
    ["PENDING", "PENDING", "preparing"],
    ["FAILED", "FAILED", "failed"],
  ])("maps %s fulfilment and %s shipment to %s", async (fulfillmentStatus, shipmentStatus, expected) => {
    const findOrder = vi.fn().mockResolvedValue({
      ...capturedOrder,
      fulfillmentStatus,
      shipment: { status: shipmentStatus, delhiveryWaybill: null },
    });
    const { getOrderConfirmation } = await import("./order-confirmation");

    await expect(getOrderConfirmation(token, { findOrder })).resolves.toMatchObject({ fulfilment: expected });
  });

  it("returns no confirmation for malformed, unknown, or uncaptured orders", async () => {
    const findOrder = vi.fn().mockResolvedValue(null);
    const { getOrderConfirmation } = await import("./order-confirmation");

    await expect(getOrderConfirmation("not-valid", { findOrder })).resolves.toBeNull();
    expect(findOrder).not.toHaveBeenCalled();
    await expect(getOrderConfirmation(token, { findOrder })).resolves.toBeNull();

    findOrder.mockResolvedValueOnce({ ...capturedOrder, status: "AWAITING_PAYMENT", paymentStatus: "AUTHORIZED" });
    await expect(getOrderConfirmation(token, { findOrder })).resolves.toBeNull();
  });

  it("rejects inconsistent currency and monetary snapshots", async () => {
    const findOrder = vi.fn().mockResolvedValue({ ...capturedOrder, currency: "USD" });
    const { getOrderConfirmation } = await import("./order-confirmation");

    await expect(getOrderConfirmation(token, { findOrder })).resolves.toBeNull();
    findOrder.mockResolvedValueOnce({ ...capturedOrder, totalPaisa: 1 });
    await expect(getOrderConfirmation(token, { findOrder })).resolves.toBeNull();
  });

  it("reads the current durable state again on refresh and preserves historical totals", async () => {
    const findOrder = vi.fn()
      .mockResolvedValueOnce({
        ...capturedOrder,
        totalPaisa: 99_900,
        unitAmountPaisa: 99_900,
        subtotalPaisa: 99_900,
        fulfillmentStatus: "CREATING",
        shipment: { status: "CREATING", delhiveryWaybill: null },
      })
      .mockResolvedValueOnce({
        ...capturedOrder,
        totalPaisa: 99_900,
        unitAmountPaisa: 99_900,
        subtotalPaisa: 99_900,
      });
    const { getOrderConfirmation } = await import("./order-confirmation");

    await expect(getOrderConfirmation(token, { findOrder })).resolves.toMatchObject({ totalPaisa: 99_900, fulfilment: "preparing" });
    await expect(getOrderConfirmation(token, { findOrder })).resolves.toMatchObject({ totalPaisa: 99_900, fulfilment: "created" });
    expect(findOrder).toHaveBeenCalledTimes(2);
  });
});

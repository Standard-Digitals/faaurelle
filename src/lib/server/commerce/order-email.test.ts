import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const now = new Date("2026-09-19T10:00:00.000Z");
const order = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  customerReference: "FA-0123456789ABCDEF0123",
  productName: "Hair Elixir Oil-in-Serum",
  unitAmountPaisa: 10_000,
  quantity: 1,
  subtotalPaisa: 10_000,
  couponCode: "NEW20",
  discountPaisa: 2_000,
  shippingPaisa: 0,
  taxPaisa: 0,
  totalPaisa: 8_000,
  currency: "INR" as const,
  customerName: "Aanya Sharma",
  customerEmail: "aanya@example.com",
  customerPhone: "+919876543210",
  addressLine1: "12 Lotus Road",
  addressLine2: "Near Central Park",
  city: "Zirakpur",
  state: "Punjab",
  postalCode: "140603",
  countryCode: "IN",
  status: "PAID",
  paymentStatus: "CAPTURED",
  fulfillmentStatus: "CREATED",
  paidAt: now,
  confirmationEmailClaimedAt: null as Date | null,
  confirmationEmailSentAt: null as Date | null,
  ownerOrderEmailSentAt: null as Date | null,
  confirmationEmailLastError: null as string | null,
  shipment: { status: "CREATED", delhiveryWaybill: "64878410000055" },
};

const environment = {
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "smtp-user",
  SMTP_PASS: "smtp-password",
  SMTP_FROM: "orders@faaurelle.com",
  SUBSCRIPTION_TO_EMAIL: "owner@faaurelle.com",
  SITE_URL: "https://www.faaurelle.com",
};

function fakeOrders() {
  const record = { ...order };
  return {
    record,
    store: {
      updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
        if (where.confirmationEmailSentAt === null && record.confirmationEmailSentAt) return { count: 0 };
        if (where.ownerOrderEmailSentAt === null && record.ownerOrderEmailSentAt) return { count: 0 };
        if (where.confirmationEmailClaimedAt === now && record.confirmationEmailClaimedAt !== now) return { count: 0 };
        if (Array.isArray(where.OR) && record.confirmationEmailSentAt && record.ownerOrderEmailSentAt) return { count: 0 };
        if (Array.isArray(where.AND) && record.confirmationEmailClaimedAt) return { count: 0 };
        Object.assign(record, data);
        return { count: 1 };
      }),
      findUnique: vi.fn().mockImplementation(async () => record),
    },
  };
}

describe("order completion email", () => {
  it("builds a branded detailed receipt with a prefilled Track Order URL", async () => {
    const { buildOrderEmail, buildOwnerOrderEmail } = await import("./order-email");
    const message = buildOrderEmail(order, environment.SITE_URL);
    const ownerMessage = buildOwnerOrderEmail(order, environment.SITE_URL);

    expect(message.subject).toContain(order.customerReference);
    expect(message.html).toContain("fa-aurelle-wordmark.svg");
    expect(message.html).toContain("Track your order");
    expect(message.html).toContain("₹80");
    expect(message.html).toContain(order.shipment.delhiveryWaybill);
    expect(message.text).toContain(order.customerEmail);
    expect(message.trackUrl).toBe(
      `https://www.faaurelle.com/track-order/?reference=${order.customerReference}`,
    );
    expect(ownerMessage.subject).toContain("New order received");
    expect(ownerMessage.html).toContain(`${order.customerName} placed an order.`);
    expect(ownerMessage.html).toContain("Customer and delivery");
    expect(ownerMessage.html).toContain("Order to prepare");
    expect(ownerMessage.html).not.toContain(`Thank you, ${order.customerName}`);
  });

  it("sends distinct customer and owner messages exactly once", async () => {
    const fake = fakeOrders();
    const transport = { sendMail: vi.fn().mockResolvedValue({ messageId: "mail-1" }) };
    const { sendOrderCompletionEmail } = await import("./order-email");

    await expect(sendOrderCompletionEmail(order.id, {
      orders: fake.store as never,
      transport,
      environment,
      now: () => now,
    })).resolves.toEqual({ status: "sent" });
    await expect(sendOrderCompletionEmail(order.id, {
      orders: fake.store as never,
      transport,
      environment,
      now: () => now,
    })).resolves.toEqual({ status: "already-sent" });

    expect(transport.sendMail).toHaveBeenCalledTimes(2);
    expect(transport.sendMail).toHaveBeenNthCalledWith(1, expect.objectContaining({
      to: order.customerEmail,
      replyTo: environment.SUBSCRIPTION_TO_EMAIL,
      subject: expect.stringContaining("Order confirmed"),
    }));
    expect(transport.sendMail).toHaveBeenNthCalledWith(2, expect.objectContaining({
      to: environment.SUBSCRIPTION_TO_EMAIL,
      subject: expect.stringContaining("New order received"),
    }));
    expect(transport.sendMail.mock.calls[1]?.[0]).not.toHaveProperty("replyTo");
    expect(fake.record.confirmationEmailSentAt).toEqual(now);
    expect(fake.record.ownerOrderEmailSentAt).toEqual(now);
  });
});

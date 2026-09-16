import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const config = { keyId: "rzp_test_example", keySecret: "secret", paymentMode: "test" };
const input = { amount: 99_900, currency: "INR" as const, receipt: "fa_12345678123441238123456789012345" };
const providerOrder = { id: "order_example123", ...input, status: "created" };

describe("Razorpay Orders client", () => {
  it("creates an INR order using Basic auth and integer paise", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerOrder), { status: 200 }));
    const { createRazorpayOrder } = await import("./client");
    await expect(createRazorpayOrder(input, { ...config, fetchImpl })).resolves.toEqual(providerOrder);
    const [url, request] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe("https://api.razorpay.com/v1/orders");
    expect(request.headers.Authorization).toBe(`Basic ${Buffer.from("rzp_test_example:secret").toString("base64")}`);
    expect(JSON.parse(request.body)).toEqual(input);
    expect(input.receipt.length).toBeLessThanOrEqual(40);
    expect(input.receipt).not.toMatch(/@|aanya|98765/i);
  });

  it("finds an existing order by its stable receipt", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [providerOrder] }), { status: 200 }));
    const { findRazorpayOrderByReceipt } = await import("./client");
    await expect(findRazorpayOrderByReceipt(input, { ...config, fetchImpl })).resolves.toEqual(providerOrder);
    expect(String(fetchImpl.mock.calls[0][0])).toContain(`receipt=${input.receipt}`);
  });

  it("accepts explicit Live Mode without inferring it from key format", async () => {
    const { createRazorpayOrder } = await import("./client");
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerOrder), { status: 200 }));
    await expect(createRazorpayOrder(input, { ...config, paymentMode: "live", fetchImpl })).resolves.toEqual(providerOrder);
  });

  it("allows Test Mode when the application runtime is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerOrder), { status: 200 }));
      const { createRazorpayOrder } = await import("./client");
      await expect(createRazorpayOrder(input, { ...config, fetchImpl })).resolves.toEqual(providerOrder);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("allows explicit Live Mode in a production runtime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(providerOrder), { status: 200 }));
      const { createRazorpayOrder } = await import("./client");
      await expect(createRazorpayOrder(input, { ...config, paymentMode: "live", fetchImpl })).resolves.toEqual(providerOrder);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it.each(["TEST", "", "unsupported"])("fails closed for payment mode %j", async (paymentMode) => {
    const { createRazorpayOrder } = await import("./client");
    await expect(createRazorpayOrder(input, { ...config, paymentMode })).rejects.toMatchObject({ kind: "configuration" });
  });

  it.each([
    [401, { error: "Authentication failed" }, "authentication"],
    [400, { error: "invalid amount" }, "definitive"],
    [500, { error: "server unavailable" }, "network"],
  ])("maps HTTP %s safely", async (status, body, kind) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: Number(status) }));
    const { createRazorpayOrder } = await import("./client");
    await expect(createRazorpayOrder(input, { ...config, fetchImpl })).rejects.toMatchObject({ kind });
  });

  it("distinguishes timeout and rejects malformed success", async () => {
    const timeoutFetch = vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    const malformedFetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "wrong" }), { status: 200 }));
    const { createRazorpayOrder } = await import("./client");
    await expect(createRazorpayOrder(input, { ...config, fetchImpl: timeoutFetch })).rejects.toMatchObject({ kind: "timeout" });
    await expect(createRazorpayOrder(input, { ...config, fetchImpl: malformedFetch })).rejects.toMatchObject({ kind: "malformed_response" });
  });
});

describe("Razorpay Payment fetch", () => {
  const payment = {
    id: "pay_Payment123",
    order_id: "order_Order123",
    amount: 99_900,
    currency: "INR",
    status: "captured",
    captured: true,
    created_at: 1_700_000_000,
  };

  it.each([
    ["captured", true],
    ["authorized", false],
    ["failed", false],
  ])("normalizes %s provider state", async (status, captured) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...payment, status, captured }), { status: 200 }));
    const { fetchRazorpayPayment } = await import("./client");
    await expect(fetchRazorpayPayment(payment.id, { ...config, fetchImpl })).resolves.toMatchObject({
      id: payment.id,
      orderId: payment.order_id,
      amount: 99_900,
      currency: "INR",
      status,
      captured,
    });
    expect(String(fetchImpl.mock.calls[0][0])).toBe(`https://api.razorpay.com/v1/payments/${payment.id}`);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toContain("Basic ");
  });

  it("maps timeout, authentication, server failure, and malformed success", async () => {
    const { fetchRazorpayPayment } = await import("./client");
    await expect(fetchRazorpayPayment(payment.id, { ...config, fetchImpl: vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")) })).rejects.toMatchObject({ kind: "timeout" });
    await expect(fetchRazorpayPayment(payment.id, { ...config, fetchImpl: vi.fn().mockResolvedValue(new Response("", { status: 401 })) })).rejects.toMatchObject({ kind: "authentication" });
    await expect(fetchRazorpayPayment(payment.id, { ...config, fetchImpl: vi.fn().mockResolvedValue(new Response("", { status: 500 })) })).rejects.toMatchObject({ kind: "network" });
    await expect(fetchRazorpayPayment(payment.id, { ...config, fetchImpl: vi.fn().mockResolvedValue(new Response("{}", { status: 200 })) })).rejects.toMatchObject({ kind: "malformed_response" });
  });
});

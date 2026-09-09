import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifySignature: vi.fn(),
  processWebhook: vi.fn(),
}));

vi.mock("@/lib/server/razorpay/signatures", () => ({ verifyRazorpayWebhookSignature: mocks.verifySignature }));
vi.mock("@/lib/server/commerce/razorpay-webhook", () => ({
  processRazorpayWebhook: mocks.processWebhook,
  WebhookProcessingError: class WebhookProcessingError extends Error {
    constructor(readonly retryable: boolean) { super("failed"); }
  },
}));

function request(body: string, signature = "a".repeat(64), eventId = "evt_test123") {
  return new Request("http://localhost/api/webhooks/razorpay", {
    method: "POST",
    headers: { "x-razorpay-signature": signature, "x-razorpay-event-id": eventId },
    body,
  });
}

describe("Razorpay webhook route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifySignature.mockReturnValue(true);
    mocks.processWebhook.mockResolvedValue({ outcome: "processed" });
  });

  it("rejects invalid signatures before parsing or persistence", async () => {
    mocks.verifySignature.mockReturnValue(false);
    const { POST } = await import("./route");
    const response = await POST(request("not-json"));
    expect(response.status).toBe(401);
    expect(mocks.processWebhook).not.toHaveBeenCalled();
  });

  it.each(["processed", "duplicate", "ignored"])("returns 2xx for %s", async (outcome) => {
    mocks.processWebhook.mockResolvedValue({ outcome });
    const { POST } = await import("./route");
    const response = await POST(request('{"event":"payment.captured"}'));
    expect(response.status).toBe(200);
  });

  it("asks Razorpay to retry while another delivery still owns processing", async () => {
    mocks.processWebhook.mockResolvedValue({ outcome: "in_progress" });
    const { POST } = await import("./route");
    const response = await POST(request('{"event":"payment.captured"}'));
    expect(response.status).toBe(503);
  });

  it("returns non-2xx for a retryable processing failure", async () => {
    mocks.processWebhook.mockRejectedValue(new Error("provider timeout"));
    const { POST } = await import("./route");
    const response = await POST(request('{"event":"payment.captured"}'));
    expect(response.status).toBe(503);
  });
});

import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/db/prisma", () => ({ prisma: {} }));

const { buildMetaUserData, readMetaBrowserContext, sendMetaServerEvent } = await import("./conversions-api");

const sha = (value: string) => createHash("sha256").update(value).digest("hex");

describe("Meta Conversions API", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("normalises and hashes customer details the way Meta expects", () => {
    const userData = buildMetaUserData(
      { ipAddress: "203.0.113.5", userAgent: "UA", fbp: "fb.1.1.1", fbc: "fb.1.1.abc" },
      {
        email: " Asha@Example.COM ",
        phone: "+91 98765 43210",
        fullName: "Asha  Rani Sharma",
        city: "New Delhi",
        state: "Tamil Nadu",
        postalCode: "110 001",
        countryCode: "IN",
      },
    );

    expect(userData).toMatchObject({
      client_ip_address: "203.0.113.5",
      client_user_agent: "UA",
      fbp: "fb.1.1.1",
      fbc: "fb.1.1.abc",
      em: [sha("asha@example.com")],
      ph: [sha("919876543210")],
      fn: [sha("asha")],
      ln: [sha("sharma")],
      ct: [sha("newdelhi")],
      st: [sha("tamilnadu")],
      zp: [sha("110001")],
      country: [sha("in")],
    });
  });

  it("reads the client IP, user agent and Meta cookies from the request", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "198.51.100.7, 10.0.0.1",
        "user-agent": "Browser",
        cookie: "a=1; _fbp=fb.1.123.456; _fbc=fb.1.123.click",
      },
    });

    expect(readMetaBrowserContext(request)).toEqual({
      ipAddress: "198.51.100.7",
      userAgent: "Browser",
      fbp: "fb.1.123.456",
      fbc: "fb.1.123.click",
    });
  });

  it("does nothing without an access token", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "");
    const fetchImpl = vi.fn();

    const result = await sendMetaServerEvent(
      { eventName: "ViewContent", eventId: "evt-12345678", customData: {} },
      fetchImpl,
    );

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts a website event with the shared event ID", async () => {
    vi.stubEnv("META_CAPI_ACCESS_TOKEN", "token");
    vi.stubEnv("META_CAPI_TEST_EVENT_CODE", "TEST123");
    const fetchImpl = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));

    await sendMetaServerEvent(
      {
        eventName: "AddToCart",
        eventId: "evt-12345678",
        eventTime: new Date("2026-10-01T00:00:00Z"),
        customData: { value: 2099, currency: "INR" },
      },
      fetchImpl,
    );

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("/2169167907337885/events?access_token=token");
    expect(JSON.parse(init.body)).toEqual({
      data: [
        {
          event_name: "AddToCart",
          event_id: "evt-12345678",
          event_time: 1790812800,
          action_source: "website",
          user_data: {},
          custom_data: { value: 2099, currency: "INR" },
        },
      ],
      test_event_code: "TEST123",
    });
  });
});

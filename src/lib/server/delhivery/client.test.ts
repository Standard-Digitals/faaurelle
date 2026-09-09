import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const configuration = {
  apiToken: "test-token",
  apiBaseUrl: "https://staging-express.delhivery.com",
};

describe("Delhivery HTTP client", () => {
  it("uses the documented endpoint, query, and token header", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ delivery_codes: [] }), { status: 200 }),
    );
    const { fetchDelhiveryServiceability } = await import("./client");

    await fetchDelhiveryServiceability("400064", { ...configuration, fetchImpl });

    const [url, request] = fetchImpl.mock.calls[0];
    expect(String(url)).toBe(
      "https://staging-express.delhivery.com/c/api/pin-codes/json/?filter_codes=400064",
    );
    expect(request).toMatchObject({
      method: "GET",
      headers: { Authorization: "Token test-token" },
      cache: "no-store",
    });
  });

  it.each([401, 403])("maps HTTP %s to a sanitized authentication error", async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("secret provider body", { status }));
    const { fetchDelhiveryServiceability } = await import("./client");

    await expect(
      fetchDelhiveryServiceability("400064", { ...configuration, fetchImpl }),
    ).rejects.toMatchObject({ kind: "authentication", message: expect.not.stringContaining("secret") });
  });

  it("maps a timeout separately from other network failures", async () => {
    const { fetchDelhiveryServiceability } = await import("./client");
    const timeoutFetch = vi.fn().mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    const networkFetch = vi.fn().mockRejectedValue(new TypeError("network failed"));

    await expect(
      fetchDelhiveryServiceability("400064", { ...configuration, fetchImpl: timeoutFetch }),
    ).rejects.toMatchObject({ kind: "timeout" });
    await expect(
      fetchDelhiveryServiceability("400064", { ...configuration, fetchImpl: networkFetch }),
    ).rejects.toMatchObject({ kind: "network" });
  });
});

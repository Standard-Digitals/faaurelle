import "server-only";
import { DelhiveryServiceabilityError } from "./types";

const SERVICEABILITY_PATH = "/c/api/pin-codes/json/";
// Vercel's Hobby plan hard-caps a function at 10s regardless of maxDuration.
// Order creation calls this and then Razorpay (its own 4s timeout) in the
// same request, so this budget has to leave room for that second call too.
const REQUEST_TIMEOUT_MS = 4_000;

type DelhiveryClientOptions = Readonly<{
  fetchImpl?: typeof fetch;
  apiToken?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
}>;

function configuration(options: DelhiveryClientOptions) {
  const apiToken = (options.apiToken ?? process.env.DELHIVERY_API_TOKEN)?.trim();
  const apiBaseUrl = (options.apiBaseUrl ?? process.env.DELHIVERY_API_BASE_URL)?.trim();

  const missingConfiguration = [
    ...(!apiToken?.trim() ? ["DELHIVERY_API_TOKEN"] : []),
    ...(!apiBaseUrl?.trim() ? ["DELHIVERY_API_BASE_URL"] : []),
  ];
  if (!apiToken || !apiBaseUrl) {
    throw new DelhiveryServiceabilityError("configuration", {
      stage: "configuration",
      missingConfiguration,
    });
  }

  try {
    const baseUrl = new URL(apiBaseUrl);
    if (baseUrl.protocol !== "https:") {
      throw new DelhiveryServiceabilityError("configuration", {
        stage: "configuration",
        providerHost: baseUrl.host,
        causeCode: "HTTPS_REQUIRED",
      });
    }
    return { apiToken, baseUrl };
  } catch (error) {
    if (error instanceof DelhiveryServiceabilityError) throw error;
    throw new DelhiveryServiceabilityError(
      "configuration",
      { stage: "configuration", causeName: error instanceof Error ? error.name : typeof error },
      { cause: error },
    );
  }
}

function safeCause(error: unknown) {
  if (!error || typeof error !== "object") return {};
  const value = error as { name?: unknown; code?: unknown; cause?: unknown };
  const nested = value.cause && typeof value.cause === "object"
    ? value.cause as { code?: unknown }
    : undefined;
  return {
    ...(typeof value.name === "string" ? { causeName: value.name } : {}),
    ...(typeof value.code === "string"
      ? { causeCode: value.code }
      : typeof nested?.code === "string"
        ? { causeCode: nested.code }
        : {}),
  };
}

function responseShape(payload: unknown) {
  if (Array.isArray(payload)) return "array";
  if (payload === null) return "null";
  if (typeof payload !== "object") return typeof payload;
  return `object:${Object.keys(payload as Record<string, unknown>).sort().join(",") || "empty"}`;
}

export async function fetchDelhiveryServiceability(
  postalCode: string,
  options: DelhiveryClientOptions = {},
): Promise<unknown> {
  const { apiToken, baseUrl } = configuration(options);
  const url = new URL(SERVICEABILITY_PATH, baseUrl);
  url.searchParams.set("filter_codes", postalCode);

  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Token ${apiToken}`,
      },
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const isTimeout =
      error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new DelhiveryServiceabilityError(
      isTimeout ? "timeout" : "network",
      { stage: "request", providerHost: baseUrl.host, ...safeCause(error) },
      { cause: error },
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new DelhiveryServiceabilityError("authentication", {
      stage: "response",
      providerHost: baseUrl.host,
      httpStatus: response.status,
      responseContentType: response.headers.get("content-type") ?? undefined,
    });
  }
  if (!response.ok) {
    throw new DelhiveryServiceabilityError("provider", {
      stage: "response",
      providerHost: baseUrl.host,
      httpStatus: response.status,
      responseContentType: response.headers.get("content-type") ?? undefined,
    });
  }

  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === "string" &&
      payload.toLocaleLowerCase().includes("login or api key required")
    ) {
      throw new DelhiveryServiceabilityError("authentication", {
        stage: "response",
        providerHost: baseUrl.host,
        httpStatus: response.status,
        responseContentType: response.headers.get("content-type") ?? undefined,
        responseShape: "authentication-message",
      });
    }
    return payload;
  } catch (error) {
    if (error instanceof DelhiveryServiceabilityError) throw error;
    throw new DelhiveryServiceabilityError(
      "malformed_response",
      {
        stage: "parsing",
        providerHost: baseUrl.host,
        httpStatus: response.status,
        responseContentType: response.headers.get("content-type") ?? undefined,
        ...safeCause(error),
      },
      { cause: error },
    );
  }
}

export { responseShape as describeDelhiveryResponseShape };

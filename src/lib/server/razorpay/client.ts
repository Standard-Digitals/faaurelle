import "server-only";
import { commerceDebug } from "@/lib/server/commerce/debug";
import { RazorpayOrderError, type RazorpayOrder, type RazorpayPayment } from "./types";

const ORDERS_URL = "https://api.razorpay.com/v1/orders";
// This project runs on Fluid compute (300s Hobby-plan function cap), so this
// just needs to be well short of leaving the checkout UI hanging.
const TIMEOUT_MS = 10_000;

type RazorpayClientOptions = Readonly<{
  fetchImpl?: typeof fetch;
  keyId?: string;
  keySecret?: string;
  paymentMode?: string;
  timeoutMs?: number;
}>;

type CreateOrderInput = Readonly<{ amount: number; currency: "INR"; receipt: string }>;

export function isSupportedRazorpayPaymentMode(value: unknown): value is "test" | "live" {
  return value === "test" || value === "live";
}

function credentials(options: RazorpayClientOptions) {
  const keyId = options.keyId ?? process.env.RAZORPAY_KEY_ID;
  const keySecret = options.keySecret ?? process.env.RAZORPAY_KEY_SECRET;
  const paymentMode = options.paymentMode ?? process.env.RAZORPAY_PAYMENT_MODE;
  if (
    !isSupportedRazorpayPaymentMode(paymentMode) ||
    !keyId?.trim() ||
    !keySecret?.trim()
  ) {
    throw new RazorpayOrderError("configuration", {
      stage: "configuration",
      missingConfiguration: [
        ...(!paymentMode ? ["RAZORPAY_PAYMENT_MODE"] : []),
        ...(!keyId?.trim() ? ["RAZORPAY_KEY_ID"] : []),
        ...(!keySecret?.trim() ? ["RAZORPAY_KEY_SECRET"] : []),
      ],
      paymentModeSupported: isSupportedRazorpayPaymentMode(paymentMode),
    });
  }
  return {
    keyId: keyId.trim(),
    authorization: `Basic ${Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString("base64")}`,
  };
}

function safeCause(error: unknown) {
  if (!error || typeof error !== "object") return {};
  const value = error as { name?: unknown; code?: unknown; cause?: unknown };
  const nested = value.cause && typeof value.cause === "object" ? value.cause as { code?: unknown } : undefined;
  return {
    ...(typeof value.name === "string" ? { causeName: value.name } : {}),
    ...(typeof value.code === "string"
      ? { causeCode: value.code }
      : typeof nested?.code === "string" ? { causeCode: nested.code } : {}),
  };
}

function safeProviderValue(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/[^A-Za-z0-9_. -]/g, "").trim();
  return normalized ? normalized.slice(0, 100) : undefined;
}

function safeProviderMessage(value: unknown) {
  if (typeof value !== "string") return undefined;
  const normalized = value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized ? normalized.slice(0, 300) : undefined;
}

function providerErrorDetails(payload: unknown) {
  if (!payload || typeof payload !== "object") return {};
  const error = (payload as Record<string, unknown>).error;
  if (!error || typeof error !== "object") return {};
  const value = error as Record<string, unknown>;
  return {
    ...(safeProviderValue(value.code) ? { providerErrorCode: safeProviderValue(value.code) } : {}),
    ...(safeProviderValue(value.reason) ? { providerReason: safeProviderValue(value.reason) } : {}),
    ...(safeProviderValue(value.step) ? { providerStep: safeProviderValue(value.step) } : {}),
    ...(safeProviderValue(value.source) ? { providerSource: safeProviderValue(value.source) } : {}),
    ...(safeProviderMessage(value.description) ? { providerMessage: safeProviderMessage(value.description) } : {}),
  };
}

function providerResponseSummary(payload: unknown) {
  if (!payload || typeof payload !== "object") return { responseShape: typeof payload };
  const value = payload as Record<string, unknown>;
  const summary: Record<string, string | number | boolean> = {};
  const safeKeys = [
    "id", "entity", "amount", "amount_due", "amount_paid", "currency", "status",
    "order_id", "receipt", "captured", "attempts", "created_at",
  ] as const;
  for (const key of safeKeys) {
    const item = value[key];
    if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
      summary[key] = item;
    }
  }
  return summary;
}

async function request(url: URL, init: RequestInit, options: RazorpayClientOptions) {
  const { authorization } = credentials(options);
  commerceDebug("razorpay-request", {
    method: init.method ?? "GET",
    url: url.toString(),
    headers: { Accept: "application/json", ...init.headers, Authorization: "Basic <redacted>" },
    body: init.body ?? null,
  });
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(url, {
      ...init,
      headers: { Accept: "application/json", Authorization: authorization, ...init.headers },
      signal: AbortSignal.timeout(options.timeoutMs ?? TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const isTimeout = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new RazorpayOrderError(
      isTimeout ? "timeout" : "network",
      { stage: "request", providerHost: url.host, ...safeCause(error) },
      { cause: error },
    );
  }
  const responseContext = {
    stage: "response" as const,
    providerHost: url.host,
    httpStatus: response.status,
    responseContentType: response.headers.get("content-type") ?? undefined,
    responseContentLength: response.headers.get("content-length") ?? undefined,
    providerRequestId:
      response.headers.get("x-razorpay-request-id") ??
      response.headers.get("x-request-id") ??
      undefined,
  };
  commerceDebug("razorpay-response-headers", {
    url: url.toString(),
    status: response.status,
    statusText: response.statusText,
    contentType: response.headers.get("content-type") ?? undefined,
    contentLength: response.headers.get("content-length") ?? undefined,
    providerRequestId: responseContext.providerRequestId,
  });
  if (response.status === 401 || response.status === 403) throw new RazorpayOrderError("authentication", responseContext);
  if (!response.ok) {
    let authenticationFailure = false;
    let providerDiagnostic = {};
    try {
      const responseText = await response.text();
      let payload: unknown;
      try {
        payload = JSON.parse(responseText) as unknown;
      } catch {
        payload = null;
      }
      const body = responseText.toLocaleLowerCase();
      authenticationFailure = body.includes("authentication") || body.includes("api key");
      providerDiagnostic = {
        ...providerErrorDetails(payload),
        ...(!payload && safeProviderMessage(responseText)
          ? { providerMessage: safeProviderMessage(responseText) }
          : {}),
      };
      commerceDebug("razorpay-error-response", { url: url.toString(), ...providerDiagnostic });
    } catch {
      // Status still determines whether the outcome is definitive or ambiguous.
    }
    const diagnostic = { ...responseContext, ...providerDiagnostic };
    if (authenticationFailure) throw new RazorpayOrderError("authentication", diagnostic);
    throw new RazorpayOrderError(response.status >= 500 ? "network" : "definitive", diagnostic);
  }
  try {
    const payload: unknown = await response.json();
    commerceDebug("razorpay-success-response", { url: url.toString(), ...providerResponseSummary(payload) });
    return payload;
  } catch (error) {
    throw new RazorpayOrderError("malformed_response", { ...responseContext, stage: "parsing", ...safeCause(error) }, { cause: error });
  }
}

function normalizeOrder(payload: unknown, expected: CreateOrderInput): RazorpayOrder {
  if (!payload || typeof payload !== "object") throw new RazorpayOrderError("malformed_response", { stage: "parsing", responseShape: typeof payload });
  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" || !value.id.startsWith("order_") ||
    value.amount !== expected.amount || value.currency !== expected.currency ||
    value.receipt !== expected.receipt ||
    !["created", "attempted", "paid"].includes(String(value.status))
  ) {
    throw new RazorpayOrderError("malformed_response", { stage: "parsing", responseShape: `object:${Object.keys(value).sort().join(",")}` });
  }
  return {
    id: value.id,
    amount: value.amount,
    currency: value.currency,
    receipt: value.receipt,
    status: value.status,
  } as RazorpayOrder;
}

export function getRazorpayPublicKey(options: RazorpayClientOptions = {}) {
  return credentials(options).keyId;
}

export function getRazorpayKeySecret(options: RazorpayClientOptions = {}) {
  credentials(options);
  return (options.keySecret ?? process.env.RAZORPAY_KEY_SECRET)!.trim();
}

export async function createRazorpayOrder(input: CreateOrderInput, options: RazorpayClientOptions = {}) {
  const payload = await request(
    new URL(ORDERS_URL),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    options,
  );
  return normalizeOrder(payload, input);
}

export async function findRazorpayOrderByReceipt(
  input: CreateOrderInput,
  options: RazorpayClientOptions = {},
): Promise<RazorpayOrder | null> {
  const url = new URL(ORDERS_URL);
  url.searchParams.set("receipt", input.receipt);
  const payload = await request(url, { method: "GET" }, options);
  if (!payload || typeof payload !== "object") throw new RazorpayOrderError("malformed_response");
  const items = (payload as Record<string, unknown>).items;
  if (!Array.isArray(items)) throw new RazorpayOrderError("malformed_response");
  if (items.length === 0) return null;
  if (items.length !== 1) throw new RazorpayOrderError("malformed_response");
  return normalizeOrder(items[0], input);
}

export async function fetchRazorpayPayment(
  paymentId: string,
  options: RazorpayClientOptions = {},
): Promise<RazorpayPayment> {
  const payload = await request(
    new URL(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`),
    { method: "GET" },
    options,
  );
  if (!payload || typeof payload !== "object") throw new RazorpayOrderError("malformed_response");
  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" || !value.id.startsWith("pay_") ||
    typeof value.order_id !== "string" || !value.order_id.startsWith("order_") ||
    typeof value.amount !== "number" || !Number.isSafeInteger(value.amount) || value.amount < 0 || value.currency !== "INR" ||
    !["created", "authorized", "captured", "failed", "refunded"].includes(String(value.status)) ||
    typeof value.captured !== "boolean" || typeof value.created_at !== "number" || !Number.isSafeInteger(value.created_at)
  ) {
    throw new RazorpayOrderError("malformed_response");
  }
  const createdAt = new Date((value.created_at as number) * 1_000);
  if (Number.isNaN(createdAt.getTime())) throw new RazorpayOrderError("malformed_response");
  return {
    id: value.id,
    orderId: value.order_id,
    amount: value.amount as number,
    currency: "INR",
    status: value.status as RazorpayPayment["status"],
    captured: value.captured,
    createdAt,
  };
}

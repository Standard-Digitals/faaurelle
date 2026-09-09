import "server-only";
import { RazorpayOrderError, type RazorpayOrder, type RazorpayPayment } from "./types";

const ORDERS_URL = "https://api.razorpay.com/v1/orders";
const TIMEOUT_MS = 5_000;

type RazorpayClientOptions = Readonly<{
  fetchImpl?: typeof fetch;
  keyId?: string;
  keySecret?: string;
  paymentMode?: string;
  timeoutMs?: number;
}>;

type CreateOrderInput = Readonly<{ amount: number; currency: "INR"; receipt: string }>;

function credentials(options: RazorpayClientOptions) {
  const keyId = options.keyId ?? process.env.RAZORPAY_KEY_ID;
  const keySecret = options.keySecret ?? process.env.RAZORPAY_KEY_SECRET;
  const paymentMode = options.paymentMode ?? process.env.RAZORPAY_PAYMENT_MODE;
  if (
    paymentMode !== "test" ||
    !keyId?.trim() ||
    !keySecret?.trim()
  ) {
    throw new RazorpayOrderError("configuration");
  }
  return {
    keyId: keyId.trim(),
    authorization: `Basic ${Buffer.from(`${keyId.trim()}:${keySecret.trim()}`).toString("base64")}`,
  };
}

async function request(url: URL, init: RequestInit, options: RazorpayClientOptions) {
  const { authorization } = credentials(options);
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
    throw new RazorpayOrderError(isTimeout ? "timeout" : "network", { cause: error });
  }
  if (response.status === 401 || response.status === 403) throw new RazorpayOrderError("authentication");
  if (!response.ok) {
    let authenticationFailure = false;
    try {
      const body = JSON.stringify(await response.json()).toLocaleLowerCase();
      authenticationFailure = body.includes("authentication") || body.includes("api key");
    } catch {
      // Status still determines whether the outcome is definitive or ambiguous.
    }
    if (authenticationFailure) throw new RazorpayOrderError("authentication");
    throw new RazorpayOrderError(response.status >= 500 ? "network" : "definitive");
  }
  try {
    return (await response.json()) as unknown;
  } catch (error) {
    throw new RazorpayOrderError("malformed_response", { cause: error });
  }
}

function normalizeOrder(payload: unknown, expected: CreateOrderInput): RazorpayOrder {
  if (!payload || typeof payload !== "object") throw new RazorpayOrderError("malformed_response");
  const value = payload as Record<string, unknown>;
  if (
    typeof value.id !== "string" || !value.id.startsWith("order_") ||
    value.amount !== expected.amount || value.currency !== expected.currency ||
    value.receipt !== expected.receipt ||
    !["created", "attempted", "paid"].includes(String(value.status))
  ) {
    throw new RazorpayOrderError("malformed_response");
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

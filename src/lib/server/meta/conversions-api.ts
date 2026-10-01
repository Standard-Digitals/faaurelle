import "server-only";
import { createHash } from "node:crypto";
import { META_PIXEL_ID } from "@/config/meta";
import { prisma } from "@/lib/server/db/prisma";

const GRAPH_API_VERSION = "v23.0";
const REQUEST_TIMEOUT_MS = 5_000;

export type MetaBrowserContext = Readonly<{
  ipAddress?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}>;

export type MetaCustomer = Readonly<{
  email: string;
  phone: string;
  fullName: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}>;

export type MetaServerEvent = Readonly<{
  eventName: string;
  eventId: string;
  eventTime?: Date;
  eventSourceUrl?: string;
  browser?: MetaBrowserContext;
  customer?: MetaCustomer;
  customData: Record<string, unknown>;
}>;

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hashed(value: string | undefined) {
  return value ? [sha256(value)] : undefined;
}

// Normalisation follows Meta's customer information parameter rules:
// lowercase, no spaces or punctuation, phone digits with country code.
export function buildMetaUserData(browser: MetaBrowserContext = {}, customer?: MetaCustomer) {
  const userData: Record<string, unknown> = {};
  if (browser.ipAddress) userData.client_ip_address = browser.ipAddress;
  if (browser.userAgent) userData.client_user_agent = browser.userAgent;
  if (browser.fbp) userData.fbp = browser.fbp;
  if (browser.fbc) userData.fbc = browser.fbc;
  if (!customer) return userData;

  const email = customer.email.trim().toLowerCase();
  const phone = customer.phone.replace(/\D/g, "");
  const [firstName, ...rest] = customer.fullName.trim().toLowerCase().split(/\s+/);
  const lastName = rest.length ? rest[rest.length - 1] : undefined;
  const lettersOnly = (value: string) => value.toLowerCase().replace(/[^a-z]/g, "");

  Object.assign(userData, {
    em: hashed(email),
    ph: hashed(phone),
    fn: hashed(firstName),
    ln: hashed(lastName),
    ct: hashed(lettersOnly(customer.city)),
    st: hashed(lettersOnly(customer.state)),
    zp: hashed(customer.postalCode.replace(/\s/g, "").toLowerCase()),
    country: hashed(customer.countryCode.toLowerCase()),
    external_id: hashed(email),
  });
  return Object.fromEntries(Object.entries(userData).filter(([, value]) => value !== undefined));
}

export function readMetaBrowserContext(request: Request): MetaBrowserContext {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const cookies = Object.fromEntries(
    (request.headers.get("cookie") ?? "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([name, value]) => name && value)
      .map(([name, ...value]) => [name, decodeURIComponent(value.join("="))]),
  );
  return {
    ipAddress: forwardedFor || request.headers.get("x-real-ip") || undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    fbp: cookies._fbp,
    fbc: cookies._fbc,
  };
}

export async function sendMetaServerEvent(event: MetaServerEvent, fetchImpl: typeof fetch = fetch) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!accessToken) return { sent: false as const, reason: "not_configured" as const };

  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  const body = {
    data: [
      {
        event_name: event.eventName,
        event_id: event.eventId,
        event_time: Math.floor((event.eventTime ?? new Date()).getTime() / 1000),
        action_source: "website",
        ...(event.eventSourceUrl ? { event_source_url: event.eventSourceUrl } : {}),
        user_data: buildMetaUserData(event.browser, event.customer),
        custom_data: event.customData,
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  const response = await fetchImpl(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(accessToken)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    },
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[meta:capi]", { eventName: event.eventName, status: response.status, detail: detail.slice(0, 500) });
    return { sent: false as const, reason: "rejected" as const };
  }
  return { sent: true as const };
}

// Sends Purchase for a paid order. Both the browser verification and the
// Razorpay webhook may call this; the shared event ID (the customer order
// reference, also used by the pixel) lets Meta keep a single Purchase.
export async function sendMetaPurchase(
  where: { id: string } | { publicToken: string },
  browser?: MetaBrowserContext,
) {
  if (!process.env.META_CAPI_ACCESS_TOKEN?.trim()) return;
  try {
    const order = await prisma.order.findUnique({ where });
    if (!order || order.paymentStatus !== "CAPTURED") return;
    const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const value = order.totalPaisa / 100;
    await sendMetaServerEvent({
      eventName: "Purchase",
      eventId: order.customerReference,
      eventTime: order.paidAt ?? new Date(),
      ...(siteUrl ? { eventSourceUrl: `${siteUrl}${basePath}/order-confirmation/${encodeURIComponent(order.publicToken)}` } : {}),
      browser,
      customer: {
        email: order.customerEmail,
        phone: order.customerPhone,
        fullName: order.customerName,
        city: order.city,
        state: order.state,
        postalCode: order.postalCode,
        countryCode: order.countryCode,
      },
      customData: {
        currency: order.currency,
        value,
        content_type: "product",
        content_ids: [order.productCode],
        content_name: order.productName,
        num_items: order.quantity,
        contents: [{ id: order.productCode, quantity: order.quantity, item_price: order.unitAmountPaisa / 100 }],
        order_id: order.customerReference,
      },
    });
  } catch (error) {
    console.error("[meta:capi]", {
      eventName: "Purchase",
      causeName: error instanceof Error ? error.name : typeof error,
    });
  }
}

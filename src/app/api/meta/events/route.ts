import { after, NextResponse } from "next/server";
import { metaRelayedEventNames, type MetaRelayedEventName } from "@/config/meta";
import { readMetaBrowserContext, sendMetaServerEvent } from "@/lib/server/meta/conversions-api";

const MAX_BODY_BYTES = 4_096;
const EVENT_ID = /^[A-Za-z0-9-]{8,64}$/;
const SHORT_TEXT = /^[\w .,'&()-]{1,120}$/;

type RelayBody = {
  eventName?: unknown;
  eventId?: unknown;
  eventSourceUrl?: unknown;
  customData?: Record<string, unknown>;
};

function isNonNegativeNumber(value: unknown, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;
}

// Copies only the standard commerce fields the site sends, so the relay
// cannot be used to forward arbitrary data to Meta.
function sanitizeCustomData(input: Record<string, unknown> | undefined) {
  if (!input || typeof input !== "object") return null;
  const { value, currency, content_type, content_name, content_ids, num_items, contents } = input;
  if (!isNonNegativeNumber(value, 1_000_000) || currency !== "INR" || content_type !== "product") return null;
  if (!Array.isArray(content_ids) || !content_ids.length || content_ids.length > 10) return null;
  if (!content_ids.every((id) => typeof id === "string" && SHORT_TEXT.test(id))) return null;
  const cleanContents = Array.isArray(contents)
    ? contents.slice(0, 10).flatMap((item) =>
        item && typeof item === "object" &&
        typeof item.id === "string" && SHORT_TEXT.test(item.id) &&
        isNonNegativeNumber(item.quantity, 100) &&
        isNonNegativeNumber(item.item_price, 1_000_000)
          ? [{ id: item.id, quantity: item.quantity, item_price: item.item_price }]
          : [],
      )
    : [];
  return {
    value,
    currency,
    content_type,
    content_ids,
    ...(typeof content_name === "string" && SHORT_TEXT.test(content_name) ? { content_name } : {}),
    ...(isNonNegativeNumber(num_items, 100) ? { num_items } : {}),
    ...(cleanContents.length ? { contents: cleanContents } : {}),
  };
}

export async function POST(request: Request) {
  const raw = await request.text().catch(() => "");
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
    return new NextResponse(null, { status: 400 });
  }

  let body: RelayBody;
  try {
    body = JSON.parse(raw) as RelayBody;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const eventName = body.eventName as MetaRelayedEventName;
  const customData = sanitizeCustomData(body.customData);
  if (
    !metaRelayedEventNames.includes(eventName) ||
    typeof body.eventId !== "string" || !EVENT_ID.test(body.eventId) ||
    !customData
  ) {
    return new NextResponse(null, { status: 400 });
  }

  let eventSourceUrl: string | undefined;
  if (typeof body.eventSourceUrl === "string" && body.eventSourceUrl.length <= 1_000) {
    try {
      const url = new URL(body.eventSourceUrl);
      if (url.protocol === "https:" || url.protocol === "http:") eventSourceUrl = url.toString();
    } catch {
      eventSourceUrl = undefined;
    }
  }

  const browser = readMetaBrowserContext(request);
  const eventId = body.eventId;
  after(async () => {
    try {
      await sendMetaServerEvent({ eventName, eventId, eventSourceUrl, browser, customData });
    } catch (error) {
      console.error("[meta:capi]", { eventName, causeName: error instanceof Error ? error.name : typeof error });
    }
  });
  return new NextResponse(null, { status: 202 });
}

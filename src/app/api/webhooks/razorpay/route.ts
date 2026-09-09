import { NextResponse } from "next/server";
import { processRazorpayWebhook, WebhookProcessingError } from "@/lib/server/commerce/razorpay-webhook";
import { verifyRazorpayWebhookSignature } from "@/lib/server/razorpay/signatures";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 256_000;

export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!signature || !eventId || !Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ accepted: false }, { status: contentLength > MAX_BODY_BYTES ? 413 : 400 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ accepted: false }, { status: 413 });
  }
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ accepted: false }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ accepted: false }, { status: 400 });
  }

  try {
    const result = await processRazorpayWebhook(eventId, payload);
    if (result.outcome === "in_progress") {
      return NextResponse.json({ accepted: false, outcome: result.outcome }, { status: 503 });
    }
    return NextResponse.json({ accepted: true, outcome: result.outcome }, { status: 200 });
  } catch (error) {
    const retryable = error instanceof WebhookProcessingError ? error.retryable : true;
    return NextResponse.json({ accepted: false }, { status: retryable ? 503 : 400 });
  }
}

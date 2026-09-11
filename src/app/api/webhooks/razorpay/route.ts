import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { processRazorpayWebhook, WebhookProcessingError } from "@/lib/server/commerce/razorpay-webhook";
import { verifyRazorpayWebhookSignature } from "@/lib/server/razorpay/signatures";
import { commerceDebug } from "@/lib/server/commerce/debug";

export const runtime = "nodejs";
const MAX_BODY_BYTES = 256_000;

export async function POST(request: Request) {
  const diagnosticId = randomUUID();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!signature || !eventId || !Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    console.error("[commerce:razorpay-webhook-route]", {
      diagnosticId,
      stage: "request_validation",
      hasSignature: Boolean(signature),
      hasEventId: Boolean(eventId),
      contentLength: Number.isFinite(contentLength) ? contentLength : "invalid",
      outcome: "rejected",
    });
    return NextResponse.json({ accepted: false }, { status: contentLength > MAX_BODY_BYTES ? 413 : 400 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    console.error("[commerce:razorpay-webhook-route]", { diagnosticId, stage: "body_size", eventId, outcome: "rejected" });
    return NextResponse.json({ accepted: false }, { status: 413 });
  }
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    console.error("[commerce:razorpay-webhook-route]", { diagnosticId, stage: "signature_verification", eventId, outcome: "rejected" });
    return NextResponse.json({ accepted: false }, { status: 401 });
  }
  commerceDebug("razorpay-webhook-authenticated", {
    eventId,
    contentLength: new TextEncoder().encode(rawBody).byteLength,
    headers: Object.fromEntries(
      [...request.headers.entries()].map(([name, value]) => [
        name,
        ["x-razorpay-signature", "authorization", "cookie", "set-cookie"].includes(name)
          ? "<redacted>"
          : value,
      ]),
    ),
    rawBody,
  });

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch (error) {
    console.error("[commerce:razorpay-webhook-route]", {
      diagnosticId,
      stage: "json_parsing",
      eventId,
      outcome: "rejected",
      causeName: error instanceof Error ? error.name : typeof error,
    });
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
    console.error("[commerce:razorpay-webhook-route]", {
      diagnosticId,
      stage: "processing",
      eventId,
      outcome: "failed",
      retryable,
      causeName: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json({ accepted: false }, { status: retryable ? 503 : 400 });
  }
}

import { after, NextResponse } from "next/server";
import {
  verifyCheckoutPayment,
  type PaymentVerificationInput,
} from "@/lib/server/commerce/payment-verification";
import { readMetaBrowserContext, sendMetaPurchase } from "@/lib/server/meta/conversions-api";

const MAX_BODY_BYTES = 4_096;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ success: false, kind: "invalid_request", retryable: false, message: "Invalid verification request." }, { status: 413 });
  }

  let input: PaymentVerificationInput;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, kind: "invalid_request", retryable: false, message: "Invalid verification request." }, { status: 413 });
    }
    input = JSON.parse(body) as PaymentVerificationInput;
  } catch {
    return NextResponse.json({ success: false, kind: "invalid_request", retryable: false, message: "Invalid verification request." }, { status: 400 });
  }

  try {
    const result = await verifyCheckoutPayment(input);
    if (result.success) {
      if (result.payment.status === "captured") {
        const publicToken = input.publicOrderToken;
        const browser = readMetaBrowserContext(request);
        after(() => sendMetaPurchase({ publicToken }, browser));
      }
      return NextResponse.json(result);
    }
    const status = result.kind === "not_found" ? 404 : result.retryable ? 503 : 409;
    return NextResponse.json(result, { status });
  } catch {
    return NextResponse.json(
      { success: false, kind: "provider_unavailable", retryable: true, message: "Payment verification is pending. Please try again." },
      { status: 503 },
    );
  }
}

import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { validateWaybill, type TrackOrderApiResponse } from "@/lib/commerce/tracking";
import { DelhiveryTrackingError, trackDelhiveryWaybill } from "@/lib/server/delhivery/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_REQUEST_BYTES = 1_024;

function response(body: TrackOrderApiResponse, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (!Number.isFinite(contentLength) || contentLength > MAX_REQUEST_BYTES) {
    return response({ success: false, error: "invalid", message: "Invalid tracking request." }, contentLength > MAX_REQUEST_BYTES ? 413 : 400);
  }
  let payload: unknown;
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_REQUEST_BYTES) {
      return response({ success: false, error: "invalid", message: "Invalid tracking request." }, 413);
    }
    payload = JSON.parse(text) as unknown;
  } catch {
    return response({ success: false, error: "invalid", message: "Invalid tracking request." }, 400);
  }
  const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : {};
  if (Object.keys(root).some((key) => key !== "waybill")) {
    return response({ success: false, error: "invalid", message: "Submit one Delhivery waybill only." }, 400);
  }
  const validation = validateWaybill(root.waybill);
  if (!validation.success) return response({ success: false, error: "invalid", message: validation.message }, 400);

  try {
    const tracking = await trackDelhiveryWaybill(validation.waybill);
    return response({ success: true, tracking }, 200);
  } catch (error) {
    if (error instanceof DelhiveryTrackingError && error.kind === "not_found") {
      return response({ success: false, error: "not_found" }, 404);
    }
    const diagnosticId = randomUUID();
    console.error("[commerce:delhivery-tracking]", error instanceof DelhiveryTrackingError
      ? { diagnosticId, kind: error.kind, ...error.diagnostic }
      : { diagnosticId, kind: "unexpected", causeName: error instanceof Error ? error.name : typeof error });
    return response({ success: false, error: "unavailable" }, 503);
  }
}

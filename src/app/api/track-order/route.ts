import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  validateTrackingReference,
  type CustomerTrackingResult,
  type TrackOrderApiResponse,
} from "@/lib/commerce/tracking";
import { resolveOrderTracking } from "@/lib/server/commerce/order-tracking";
import { DelhiveryTrackingError } from "@/lib/server/delhivery/tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_REQUEST_BYTES = 1_024;

function response(body: TrackOrderApiResponse, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function serializeTracking(tracking: CustomerTrackingResult): CustomerTrackingResult {
  return {
    currentStatus: {
      label: tracking.currentStatus.label,
      carrierStatus: tracking.currentStatus.carrierStatus,
      state: tracking.currentStatus.state,
      ...(tracking.currentStatus.timestamp ? { timestamp: tracking.currentStatus.timestamp } : {}),
      ...(tracking.currentStatus.location ? { location: tracking.currentStatus.location } : {}),
      ...(tracking.currentStatus.statusType ? { statusType: tracking.currentStatus.statusType } : {}),
      ...(tracking.currentStatus.statusCode ? { statusCode: tracking.currentStatus.statusCode } : {}),
    },
    ...(tracking.origin ? { origin: tracking.origin } : {}),
    ...(tracking.destination ? { destination: tracking.destination } : {}),
    ...(tracking.pickupTimestamp ? { pickupTimestamp: tracking.pickupTimestamp } : {}),
    scans: tracking.scans.map((scan) => ({
      status: scan.status,
      ...(scan.timestamp ? { timestamp: scan.timestamp } : {}),
      ...(scan.location ? { location: scan.location } : {}),
      ...(scan.instructions ? { instructions: scan.instructions } : {}),
      ...(scan.statusCode ? { statusCode: scan.statusCode } : {}),
    })),
  };
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
  const keys = Object.keys(root);
  if (keys.length !== 1 || keys[0] !== "reference") {
    return response({ success: false, error: "invalid", message: "Submit one FA order reference only." }, 400);
  }
  const validation = validateTrackingReference(root.reference);
  if (!validation.success) return response({ success: false, error: "invalid", message: validation.message }, 400);

  try {
    const result = await resolveOrderTracking(validation.reference, validation.kind);
    if (result.state === "not_found") {
      return response({ success: false, error: "not_found" }, 404);
    }
    if (result.state === "preparing") {
      return response({ success: true, state: "preparing", orderReference: result.orderReference }, 200);
    }
    if (result.state === "tracking_pending") {
      return response({ success: true, state: "tracking_pending", orderReference: result.orderReference }, 200);
    }
    return response({
      success: true,
      state: "tracking",
      tracking: serializeTracking(result.tracking),
      orderReference: result.orderReference,
    }, 200);
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

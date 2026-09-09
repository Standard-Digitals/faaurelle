import "server-only";
import type { CustomerTrackingState, TrackingResult, TrackingScan } from "@/lib/commerce/tracking";
import type { DelhiveryDiagnosticContext, DelhiveryErrorKind } from "./types";

const TRACKING_PATH = "/api/v1/packages/json/";
const REQUEST_TIMEOUT_MS = 5_000;

type TrackingClientOptions = Readonly<{
  fetchImpl?: typeof fetch;
  apiToken?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
}>;

export class DelhiveryTrackingError extends Error {
  constructor(
    readonly kind: DelhiveryErrorKind | "not_found",
    readonly diagnostic: DelhiveryDiagnosticContext = { stage: "unknown" },
    options?: ErrorOptions,
  ) {
    super(`Delhivery tracking failed: ${kind}`, options);
    this.name = "DelhiveryTrackingError";
  }
}

function configuration(options: TrackingClientOptions) {
  const apiToken = options.apiToken ?? process.env.DELHIVERY_API_TOKEN;
  const apiBaseUrl = options.apiBaseUrl ?? process.env.DELHIVERY_API_BASE_URL;
  const missingConfiguration = [
    ...(!apiToken?.trim() ? ["DELHIVERY_API_TOKEN"] : []),
    ...(!apiBaseUrl?.trim() ? ["DELHIVERY_API_BASE_URL"] : []),
  ];
  if (missingConfiguration.length) {
    throw new DelhiveryTrackingError("configuration", { stage: "configuration", missingConfiguration });
  }
  try {
    const baseUrl = new URL(apiBaseUrl!);
    if (baseUrl.protocol !== "https:") {
      throw new DelhiveryTrackingError("configuration", {
        stage: "configuration",
        providerHost: baseUrl.host,
        causeCode: "HTTPS_REQUIRED",
      });
    }
    return { apiToken: apiToken!.trim(), baseUrl };
  } catch (error) {
    if (error instanceof DelhiveryTrackingError) throw error;
    throw new DelhiveryTrackingError(
      "configuration",
      { stage: "configuration", causeName: error instanceof Error ? error.name : typeof error },
      { cause: error },
    );
  }
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

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function clean(value: unknown, maxLength = 180) {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const normalized = String(value).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

function customerState(status: string): { state: CustomerTrackingState; label: string } {
  const value = status.toLocaleLowerCase();
  if (value.includes("rto") || value.includes("return")) return { state: "returned", label: "Returned / RTO" };
  if (value.includes("out for delivery")) return { state: "out-for-delivery", label: "Out for delivery" };
  if (value === "delivered" || value.includes("successfully delivered")) return { state: "delivered", label: "Delivered" };
  if (value.includes("in transit") || value.includes("dispatched")) return { state: "in-transit", label: "In transit" };
  if (value.includes("picked up") || value.includes("pickup")) return { state: "picked-up", label: "Picked up" };
  if (value.includes("manifest") || value.includes("not picked")) return { state: "shipment-created", label: "Shipment created" };
  if (value.includes("pending") || value.includes("undelivered")) return { state: "delivery-pending", label: "Delivery pending" };
  return { state: "carrier-update", label: status };
}

function normalizeScan(value: unknown): TrackingScan | null {
  const detail = record(record(value)?.ScanDetail);
  if (!detail) return null;
  const status = clean(detail.Scan);
  if (!status) return null;
  return {
    status,
    ...(clean(detail.StatusDateTime ?? detail.ScanDateTime) ? { timestamp: clean(detail.StatusDateTime ?? detail.ScanDateTime) } : {}),
    ...(clean(detail.ScannedLocation) ? { location: clean(detail.ScannedLocation) } : {}),
    ...(clean(detail.Instructions, 300) ? { instructions: clean(detail.Instructions, 300) } : {}),
    ...(clean(detail.StatusCode) ? { statusCode: clean(detail.StatusCode) } : {}),
  };
}

function uniqueChronologicalScans(values: unknown[]) {
  const seen = new Set<string>();
  return values
    .map(normalizeScan)
    .filter((scan): scan is TrackingScan => scan !== null)
    .filter((scan) => {
      const key = [scan.status, scan.timestamp, scan.location, scan.instructions].join("|");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.timestamp ?? "").localeCompare(b.timestamp ?? ""));
}

export function normalizeDelhiveryTracking(payload: unknown, requestedWaybill: string): TrackingResult {
  const root = record(payload);
  if (!root) throw new DelhiveryTrackingError("malformed_response", { stage: "parsing", responseShape: typeof payload });
  const shipments = root.ShipmentData;
  if (!Array.isArray(shipments)) {
    const providerError = clean(root.Error)?.toLocaleLowerCase();
    if (providerError?.includes("login") || providerError?.includes("api key") || providerError?.includes("authenticat")) {
      throw new DelhiveryTrackingError("authentication", { stage: "response", responseShape: "authentication-error" });
    }
    if (providerError?.includes("not found") || providerError?.includes("no data") || providerError?.includes("does not exist")) {
      throw new DelhiveryTrackingError("not_found", { stage: "response", responseShape: "not-found-error" });
    }
    if (providerError) throw new DelhiveryTrackingError("provider", { stage: "response", responseShape: "provider-error" });
    throw new DelhiveryTrackingError("malformed_response", { stage: "parsing", responseShape: `object:${Object.keys(root).sort().join(",")}` });
  }
  if (shipments.length === 0) throw new DelhiveryTrackingError("not_found", { stage: "response", responseShape: "empty-shipment-data" });
  const shipment = record(record(shipments[0])?.Shipment);
  const status = record(shipment?.Status);
  const waybill = clean(shipment?.AWB);
  const carrierStatus = clean(status?.Status);
  if (!shipment || !status || !waybill || !carrierStatus || waybill !== requestedWaybill) {
    throw new DelhiveryTrackingError("malformed_response", { stage: "parsing", responseShape: "invalid-shipment" });
  }
  const presentation = customerState(carrierStatus);
  const scans = uniqueChronologicalScans(Array.isArray(shipment.Scans) ? shipment.Scans : []);
  return {
    waybill,
    currentStatus: {
      carrierStatus,
      ...presentation,
      ...(clean(status.StatusDateTime) ? { timestamp: clean(status.StatusDateTime) } : {}),
      ...(clean(status.StatusLocation) ? { location: clean(status.StatusLocation) } : {}),
      ...(clean(status.StatusType) ? { statusType: clean(status.StatusType) } : {}),
      ...(clean(status.StatusCode) ? { statusCode: clean(status.StatusCode) } : {}),
    },
    ...(clean(shipment.Origin) ? { origin: clean(shipment.Origin) } : {}),
    ...(clean(shipment.Destination) ? { destination: clean(shipment.Destination) } : {}),
    ...(clean(shipment.PickUpDate) ? { pickupTimestamp: clean(shipment.PickUpDate) } : {}),
    scans,
  };
}

export async function trackDelhiveryWaybill(waybill: string, options: TrackingClientOptions = {}) {
  const { apiToken, baseUrl } = configuration(options);
  const url = new URL(TRACKING_PATH, baseUrl);
  url.searchParams.set("waybill", waybill);
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(url, {
      method: "GET",
      headers: { Accept: "application/json", Authorization: `Token ${apiToken}` },
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const timeout = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new DelhiveryTrackingError(
      timeout ? "timeout" : "network",
      { stage: "request", providerHost: baseUrl.host, ...safeCause(error) },
      { cause: error },
    );
  }
  const responseContext = {
    stage: "response" as const,
    providerHost: baseUrl.host,
    httpStatus: response.status,
    responseContentType: response.headers.get("content-type") ?? undefined,
  };
  if (response.status === 401 || response.status === 403) throw new DelhiveryTrackingError("authentication", responseContext);
  if (!response.ok) throw new DelhiveryTrackingError("provider", responseContext);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new DelhiveryTrackingError("malformed_response", { ...responseContext, stage: "parsing", ...safeCause(error) }, { cause: error });
  }
  return normalizeDelhiveryTracking(payload, waybill);
}

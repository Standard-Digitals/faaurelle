import "server-only";
import { commerceDebug } from "@/lib/server/commerce/debug";
import type { DelhiveryDiagnosticContext, DelhiveryErrorKind } from "./types";

const CREATE_SHIPMENT_PATH = "/api/cmu/create.json";
const TRACKING_PATH = "/api/v1/packages/json/";
const REQUEST_TIMEOUT_MS = 10_000;

export type DelhiveryShipmentInput = Readonly<{
  reference: string;
  recipient: Readonly<{
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }>;
  product: Readonly<{
    description: string;
    sku: string;
    hsnCode: string;
    quantity: number;
    totalAmountRupees: string;
  }>;
  package: Readonly<{
    weightGrams: number;
    widthCm: number;
    lengthCm: number;
    heightCm: number;
  }>;
  seller: Readonly<{
    name: string;
    address: string;
    gstin: string;
  }>;
  pickup: Readonly<{
    name: string;
    address: string;
    city: string;
    pincode: string;
    country: string;
  }>;
}>;

type ShipmentClientOptions = Readonly<{
  fetchImpl?: typeof fetch;
  apiToken?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
}>;

export class DelhiveryShipmentError extends Error {
  constructor(
    readonly kind: DelhiveryErrorKind | "definitive" | "not_found",
    readonly ambiguous: boolean,
    readonly diagnostic: DelhiveryDiagnosticContext = { stage: "unknown" },
    options?: ErrorOptions,
  ) {
    super(`Delhivery shipment failed: ${kind}`, options);
    this.name = "DelhiveryShipmentError";
  }
}

function configuration(options: ShipmentClientOptions) {
  const apiToken = (options.apiToken ?? process.env.DELHIVERY_API_TOKEN)?.trim();
  const apiBaseUrl = (options.apiBaseUrl ?? process.env.DELHIVERY_API_BASE_URL)?.trim();
  const missingConfiguration = [
    ...(!apiToken ? ["DELHIVERY_API_TOKEN"] : []),
    ...(!apiBaseUrl ? ["DELHIVERY_API_BASE_URL"] : []),
  ];
  if (!apiToken || !apiBaseUrl) {
    throw new DelhiveryShipmentError("configuration", false, { stage: "configuration", missingConfiguration });
  }
  try {
    const baseUrl = new URL(apiBaseUrl);
    if (baseUrl.protocol !== "https:") {
      throw new DelhiveryShipmentError("configuration", false, {
        stage: "configuration",
        providerHost: baseUrl.host,
        causeCode: "HTTPS_REQUIRED",
      });
    }
    return { apiToken, baseUrl };
  } catch (error) {
    if (error instanceof DelhiveryShipmentError) throw error;
    throw new DelhiveryShipmentError(
      "configuration",
      false,
      { stage: "configuration", causeName: error instanceof Error ? error.name : typeof error },
      { cause: error },
    );
  }
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function cleanIdentifier(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const result = String(value).trim();
  return /^[A-Za-z0-9_-]{6,64}$/.test(result) ? result : null;
}

function cleanProviderText(value: unknown, maxLength = 240): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const result = String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return result ? result.slice(0, maxLength) : undefined;
}

function rejectionDiagnostic(root: Record<string, unknown> | null, first: Record<string, unknown> | null) {
  const providerMessage = cleanProviderText(first?.remarks ?? first?.remark ?? root?.rmk ?? root?.remarks);
  const providerStatus = cleanProviderText(first?.status, 80);
  const providerReference = cleanProviderText(first?.refnum ?? first?.reference, 80);
  return {
    ...(providerMessage ? { providerMessage } : {}),
    ...(providerStatus ? { providerStatus } : {}),
    ...(providerReference ? { providerReference } : {}),
  };
}

function requestContext(response: Response, host: string) {
  return {
    stage: "response" as const,
    providerHost: host,
    httpStatus: response.status,
    responseContentType: response.headers.get("content-type") ?? undefined,
  };
}

function shipmentPayload(input: DelhiveryShipmentInput) {
  return {
    shipments: [{
      name: input.recipient.name,
      add: input.recipient.address,
      pin: input.recipient.pincode,
      city: input.recipient.city,
      state: input.recipient.state,
      country: input.recipient.country,
      phone: input.recipient.phone,
      order: input.reference,
      payment_mode: "Prepaid",
      products_desc: input.product.description,
      hsn_code: input.product.hsnCode,
      quantity: input.product.quantity,
      total_amount: input.product.totalAmountRupees,
      weight: input.package.weightGrams,
      shipment_width: input.package.widthCm,
      shipment_length: input.package.lengthCm,
      shipment_height: input.package.heightCm,
      seller_name: input.seller.name,
      seller_add: input.seller.address,
      seller_gst_tin: input.seller.gstin,
    }],
    pickup_location: {
      name: input.pickup.name,
      add: input.pickup.address,
      city: input.pickup.city,
      pin: input.pickup.pincode,
      country: input.pickup.country,
    },
  };
}

export async function createDelhiveryShipment(
  input: DelhiveryShipmentInput,
  options: ShipmentClientOptions = {},
): Promise<{ waybill: string }> {
  const { apiToken, baseUrl } = configuration(options);
  const url = new URL(CREATE_SHIPMENT_PATH, baseUrl);
  const providerPayload = shipmentPayload(input);
  const body = new URLSearchParams({ format: "json", data: JSON.stringify(providerPayload) });
  commerceDebug("delhivery-shipment-request", {
    method: "POST",
    url: url.toString(),
    headers: { Accept: "application/json", Authorization: "Token <redacted>", "Content-Type": "application/x-www-form-urlencoded" },
    payload: providerPayload,
  });
  let response: Response;
  try {
    response = await (options.fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Token ${apiToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
      signal: AbortSignal.timeout(options.timeoutMs ?? REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    const timeout = error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new DelhiveryShipmentError(
      timeout ? "timeout" : "network",
      true,
      { stage: "request", providerHost: baseUrl.host, causeName: error instanceof Error ? error.name : typeof error },
      { cause: error },
    );
  }
  const context = requestContext(response, baseUrl.host);
  commerceDebug("delhivery-shipment-response-headers", {
    url: url.toString(),
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
  });
  if (response.status === 401 || response.status === 403) throw new DelhiveryShipmentError("authentication", false, context);
  if (!response.ok) {
    throw new DelhiveryShipmentError(response.status >= 500 ? "provider" : "definitive", response.status >= 500, context);
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new DelhiveryShipmentError("malformed_response", true, { ...context, stage: "parsing" }, { cause: error });
  }
  commerceDebug("delhivery-shipment-response-body", { payload });
  const root = record(payload);
  const packages = root?.packages;
  const first = Array.isArray(packages) ? record(packages[0]) : null;
  const waybill = cleanIdentifier(first?.waybill);
  const providerDiagnostic = rejectionDiagnostic(root, first);
  if (root?.success === false) {
    throw new DelhiveryShipmentError("definitive", false, {
      ...context,
      responseShape: "shipment-not-created",
      ...providerDiagnostic,
    });
  }
  if (root?.success !== true || !waybill) {
    throw new DelhiveryShipmentError("malformed_response", true, {
      ...context,
      responseShape: "missing-success-waybill",
      ...providerDiagnostic,
    });
  }
  return { waybill };
}

export async function findDelhiveryShipmentByReference(
  reference: string,
  options: ShipmentClientOptions = {},
): Promise<{ waybill: string } | null> {
  const { apiToken, baseUrl } = configuration(options);
  const url = new URL(TRACKING_PATH, baseUrl);
  url.searchParams.set("ref_ids", reference);
  commerceDebug("delhivery-reference-lookup-request", {
    method: "GET",
    url: url.toString(),
    headers: { Accept: "application/json", Authorization: "Token <redacted>" },
  });
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
    throw new DelhiveryShipmentError(timeout ? "timeout" : "network", true, {
      stage: "request",
      providerHost: baseUrl.host,
      causeName: error instanceof Error ? error.name : typeof error,
    }, { cause: error });
  }
  const context = requestContext(response, baseUrl.host);
  commerceDebug("delhivery-reference-lookup-response-headers", {
    url: url.toString(),
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
  });
  if (response.status === 401 || response.status === 403) throw new DelhiveryShipmentError("authentication", false, context);
  if (!response.ok) throw new DelhiveryShipmentError("provider", true, context);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new DelhiveryShipmentError("malformed_response", true, { ...context, stage: "parsing" }, { cause: error });
  }
  commerceDebug("delhivery-reference-lookup-response-body", { payload });
  const shipments = record(payload)?.ShipmentData;
  if (!Array.isArray(shipments) || shipments.length === 0) return null;
  const shipment = record(record(shipments[0])?.Shipment);
  const waybill = cleanIdentifier(shipment?.AWB);
  if (!waybill) throw new DelhiveryShipmentError("malformed_response", true, { ...context, responseShape: "invalid-reference-lookup" });
  return { waybill };
}

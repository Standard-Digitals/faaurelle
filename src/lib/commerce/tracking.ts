export const CUSTOMER_ORDER_REFERENCE_PATTERN = /^FA-[A-F0-9]{20}$/;
export const TRACKING_REFERENCE_MAX_LENGTH = 23;

export type CustomerTrackingState =
  | "shipment-created"
  | "picked-up"
  | "in-transit"
  | "out-for-delivery"
  | "delivered"
  | "delivery-pending"
  | "returned"
  | "carrier-update";

export type TrackingScan = Readonly<{
  status: string;
  timestamp?: string;
  location?: string;
  instructions?: string;
  statusCode?: string;
}>;

export type TrackingResult = Readonly<{
  waybill: string;
  currentStatus: Readonly<{
    label: string;
    carrierStatus: string;
    state: CustomerTrackingState;
    timestamp?: string;
    location?: string;
    statusType?: string;
    statusCode?: string;
  }>;
  origin?: string;
  destination?: string;
  pickupTimestamp?: string;
  scans: readonly TrackingScan[];
}>;

export type CustomerTrackingResult = Omit<TrackingResult, "waybill">;

export type TrackOrderApiResponse =
  | { success: true; state: "tracking"; tracking: CustomerTrackingResult; orderReference: string }
  | { success: true; state: "preparing"; orderReference: string }
  | { success: true; state: "tracking_pending"; orderReference: string }
  | { success: false; error: "invalid"; message: string }
  | { success: false; error: "not_found" }
  | { success: false; error: "unavailable" };

export type TrackingReferenceValidationResult =
  | { success: true; reference: string }
  | { success: false; message: string };

export function validateTrackingReference(value: unknown): TrackingReferenceValidationResult {
  if (typeof value !== "string" || !value.trim()) {
    return { success: false, message: "Enter your Aurelle order reference." };
  }
  const reference = value.trim();
  if (reference.length > TRACKING_REFERENCE_MAX_LENGTH) {
    return { success: false, message: "The tracking reference is too long. Check it and try again." };
  }
  const normalized = reference.toUpperCase();
  return CUSTOMER_ORDER_REFERENCE_PATTERN.test(normalized)
    ? { success: true, reference: normalized }
    : { success: false, message: "Enter the complete reference in the format FA- followed by its 20 characters." };
}

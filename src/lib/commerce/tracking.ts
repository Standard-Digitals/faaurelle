export const CUSTOMER_ORDER_REFERENCE_PATTERN = /^FA-[A-F0-9]{20}$/i;
export const DELHIVERY_ORDER_REFERENCE_PATTERN = /^fa_[a-f0-9]{32}$/i;
export const DELHIVERY_WAYBILL_PATTERN = /^\d{10,24}$/;
export const RAZORPAY_ORDER_REFERENCE_PATTERN = /^order_[a-z0-9]{6,64}$/i;
export const RAZORPAY_PAYMENT_REFERENCE_PATTERN = /^pay_[a-z0-9]{6,64}$/i;
export const TRACKING_REFERENCE_MAX_LENGTH = 70;

export type TrackingReferenceKind =
  | "internal"
  | "delhivery_order"
  | "delhivery_waybill"
  | "razorpay_order"
  | "razorpay_payment";

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
  | { success: true; reference: string; kind: TrackingReferenceKind }
  | { success: false; message: string };

export function validateTrackingReference(value: unknown): TrackingReferenceValidationResult {
  if (typeof value !== "string" || !value.trim()) {
    return { success: false, message: "Enter your FA order reference." };
  }
  const reference = value.trim();
  if (reference.length > TRACKING_REFERENCE_MAX_LENGTH) {
    return { success: false, message: "The tracking reference is too long. Check it and try again." };
  }
  if (CUSTOMER_ORDER_REFERENCE_PATTERN.test(reference)) {
    return { success: true, reference: reference.toUpperCase(), kind: "internal" };
  }
  if (DELHIVERY_ORDER_REFERENCE_PATTERN.test(reference)) {
    return { success: true, reference: reference.toLowerCase(), kind: "delhivery_order" };
  }
  if (DELHIVERY_WAYBILL_PATTERN.test(reference)) {
    return { success: true, reference, kind: "delhivery_waybill" };
  }
  if (RAZORPAY_ORDER_REFERENCE_PATTERN.test(reference)) {
    return { success: true, reference: reference.toLowerCase(), kind: "razorpay_order" };
  }
  if (RAZORPAY_PAYMENT_REFERENCE_PATTERN.test(reference)) {
    return { success: true, reference: reference.toLowerCase(), kind: "razorpay_payment" };
  }
  return {
    success: false,
    message: "Check the reference and enter it again.",
  };
}

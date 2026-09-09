export const WAYBILL_MAX_LENGTH = 64;

export type WaybillValidationResult =
  | { success: true; waybill: string }
  | { success: false; message: string };

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

export type TrackOrderApiResponse =
  | { success: true; tracking: TrackingResult }
  | { success: false; error: "invalid"; message: string }
  | { success: false; error: "not_found" }
  | { success: false; error: "unavailable" };

export function validateWaybill(value: unknown): WaybillValidationResult {
  if (typeof value !== "string" || !value.trim()) {
    return { success: false, message: "Enter your Delhivery AWB / Waybill." };
  }
  const waybill = value.trim();
  if (waybill.length > WAYBILL_MAX_LENGTH) {
    return { success: false, message: "The waybill is too long. Check it and try again." };
  }
  if (!/^\d+$/.test(waybill)) {
    return { success: false, message: "Enter one waybill using numbers only." };
  }
  return { success: true, waybill };
}

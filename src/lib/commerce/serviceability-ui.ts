import type { CheckoutFieldName } from "./checkout-validation";

export type CheckoutServiceabilityState =
  | "not-checked"
  | "checking"
  | "serviceable"
  | "unserviceable"
  | "unavailable";

export function serviceabilityAfterFieldChange(
  current: CheckoutServiceabilityState,
  field: CheckoutFieldName,
): CheckoutServiceabilityState {
  return field === "pincode" ? "not-checked" : current;
}

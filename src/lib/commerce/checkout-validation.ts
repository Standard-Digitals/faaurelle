import {
  indiaStatesAndUnionTerritories,
  type IndiaStateOrUnionTerritory,
} from "@/config/india";

export const checkoutFieldNames = [
  "fullName",
  "email",
  "mobileNumber",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "pincode",
] as const;

export type CheckoutFieldName = (typeof checkoutFieldNames)[number];
export type CheckoutFieldErrors = Partial<Record<CheckoutFieldName, string>>;

export type NormalizedCheckoutDetails = Readonly<{
  fullName: string;
  email: string;
  mobileNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: IndiaStateOrUnionTerritory;
  pincode: string;
  countryCode: "IN";
}>;

export type CheckoutValidationResult =
  | { success: true; data: NormalizedCheckoutDetails }
  | { success: false; errors: CheckoutFieldErrors };

const limits = {
  fullName: 100,
  email: 254,
  mobileNumber: 32,
  addressLine1: 160,
  addressLine2: 160,
  city: 80,
  state: 80,
  pincode: 16,
} as const;

function inputValue(payload: unknown, key: CheckoutFieldName): string {
  if (!payload || typeof payload !== "object") return "";
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeMobile(value: string): string | null {
  if (value.length > limits.mobileNumber) return null;

  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);

  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
}

export function validateCheckoutPayload(payload: unknown): CheckoutValidationResult {
  const errors: CheckoutFieldErrors = {};
  const fullName = normalizeText(inputValue(payload, "fullName"));
  const email = normalizeText(inputValue(payload, "email")).toLowerCase();
  const mobileInput = inputValue(payload, "mobileNumber");
  const mobileNumber = normalizeMobile(mobileInput);
  const addressLine1 = normalizeText(inputValue(payload, "addressLine1"));
  const addressLine2 = normalizeText(inputValue(payload, "addressLine2"));
  const city = normalizeText(inputValue(payload, "city"));
  const state = normalizeText(inputValue(payload, "state"));
  const pincodeInput = inputValue(payload, "pincode");
  const pincode = pincodeInput.replace(/\s/g, "");

  if (!fullName) errors.fullName = "Enter your full name.";
  else if (fullName.length > limits.fullName) errors.fullName = "Name must be 100 characters or fewer.";

  if (!email) errors.email = "Enter your email address.";
  else if (email.length > limits.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!mobileNumber) errors.mobileNumber = "Enter a valid 10-digit Indian mobile number.";

  if (!addressLine1) errors.addressLine1 = "Enter your street address.";
  else if (addressLine1.length > limits.addressLine1) {
    errors.addressLine1 = "Address must be 160 characters or fewer.";
  }

  if (addressLine2.length > limits.addressLine2) {
    errors.addressLine2 = "Address line 2 must be 160 characters or fewer.";
  }

  if (!city) errors.city = "Enter your city.";
  else if (city.length > limits.city) errors.city = "City must be 80 characters or fewer.";

  if (!state) errors.state = "Select your state or union territory.";
  else if (
    state.length > limits.state ||
    !indiaStatesAndUnionTerritories.includes(state as IndiaStateOrUnionTerritory)
  ) {
    errors.state = "Select a valid Indian state or union territory.";
  }

  if (pincodeInput.length > limits.pincode || !/^\d{6}$/.test(pincode)) {
    errors.pincode = "Enter a valid six-digit pincode.";
  }

  if (Object.keys(errors).length > 0 || !mobileNumber) return { success: false, errors };

  return {
    success: true,
    data: {
      fullName,
      email,
      mobileNumber,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state: state as IndiaStateOrUnionTerritory,
      pincode,
      countryCode: "IN",
    },
  };
}

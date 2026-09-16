"use server";

import {
  validateCheckoutAndCheckServiceability,
  type CheckoutServiceabilityResponse,
} from "@/lib/server/commerce/checkout-serviceability";
import {
  createPayableCheckout,
  type CreateCheckoutInput,
  type CreateCheckoutResponse,
} from "@/lib/server/commerce/checkout-order";
import { normalizeCheckoutIdentity } from "@/lib/commerce/checkout-validation";
import { getAuthoritativeProduct } from "@/lib/server/commerce/products";
import { calculateV1Pricing } from "@/lib/server/commerce/pricing";
import { validateCouponEligibility } from "@/lib/server/commerce/coupons";

export type ValidateCheckoutResponse = CheckoutServiceabilityResponse;

export async function validateCheckoutDetails(
  productCode: string,
  payload: unknown,
): Promise<ValidateCheckoutResponse> {
  return validateCheckoutAndCheckServiceability(productCode, payload);
}

export async function createCheckoutOrder(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResponse> {
  return createPayableCheckout(input);
}

export type ValidateCouponResponse =
  | { success: true; code: string; discountPaisa: number; totalPaisa: number }
  | { success: false; message: string };

export async function validateCheckoutCoupon(
  productCode: string,
  code: string,
  identityPayload: unknown,
): Promise<ValidateCouponResponse> {
  const identity = normalizeCheckoutIdentity(identityPayload);
  if (!identity.success) return { success: false, message: identity.message };
  const product = getAuthoritativeProduct(productCode);
  if (!product) return { success: false, message: "This product is not available for checkout." };
  const eligibility = await validateCouponEligibility(code, identity.data);
  if (!eligibility.success) {
    return {
      success: false,
      message: eligibility.reason === "used"
        ? "Invalid coupon code. This coupon has already been used."
        : "This coupon is invalid or has expired.",
    };
  }
  const pricing = calculateV1Pricing(product, eligibility.coupon.discountPercent);
  return {
    success: true,
    code: eligibility.coupon.code,
    discountPaisa: pricing.discountPaisa,
    totalPaisa: pricing.totalPaisa,
  };
}

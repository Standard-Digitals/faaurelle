"use server";

import { after } from "next/server";
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
import {
  linkCheckoutAttemptToOrder,
  recordCheckoutAttempt,
} from "@/lib/server/commerce/checkout-attempts";
import { sendCheckoutAttemptAlert } from "@/lib/server/commerce/checkout-attempt-email";

export type ValidateCheckoutResponse = CheckoutServiceabilityResponse;

export async function validateCheckoutDetails(
  productCode: string,
  payload: unknown,
): Promise<ValidateCheckoutResponse> {
  const result = await validateCheckoutAndCheckServiceability(productCode, payload);
  if (result.success) {
    const details = result.data;
    const deliveryCheck = "serviceability" in result
      ? result.serviceability.prepaidServiceable ? "SERVICEABLE" : "NOT_SERVICEABLE"
      : "CHECK_FAILED";
    // Saved for follow-up even if the customer never pays; runs after the
    // response so the checkout never waits on it or fails because of it.
    after(async () => {
      try {
        const attempt = await recordCheckoutAttempt(productCode, details, deliveryCheck);
        await sendCheckoutAttemptAlert(attempt);
      } catch (error) {
        console.error("[commerce:checkout-attempt]", {
          stage: "record",
          causeName: error instanceof Error ? error.name : typeof error,
        });
      }
    });
  }
  return result;
}

export async function createCheckoutOrder(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResponse> {
  const result = await createPayableCheckout(input);
  if (result.success) {
    const publicOrderToken = result.checkout.publicOrderToken;
    after(async () => {
      try {
        await linkCheckoutAttemptToOrder(publicOrderToken);
      } catch (error) {
        console.error("[commerce:checkout-attempt]", {
          stage: "link_order",
          causeName: error instanceof Error ? error.name : typeof error,
        });
      }
    });
  }
  return result;
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

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
import { featuredCoupon, isFeaturedCouponActive } from "@/config/promotions";
import { normalizeCheckoutContact, normalizeCheckoutIdentity } from "@/lib/commerce/checkout-validation";
import { getAuthoritativeProduct } from "@/lib/server/commerce/products";
import { calculateV1Pricing } from "@/lib/server/commerce/pricing";
import { validateCouponEligibility } from "@/lib/server/commerce/coupons";
import {
  linkCheckoutAttemptToOrder,
  recordCheckoutAttempt,
  recordCheckoutContact,
} from "@/lib/server/commerce/checkout-attempts";
import { sendCheckoutAttemptAlert } from "@/lib/server/commerce/checkout-attempt-email";

export type ValidateCheckoutResponse = CheckoutServiceabilityResponse;

const CHECKOUT_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validCheckoutKey(value: unknown) {
  return typeof value === "string" && CHECKOUT_KEY.test(value) ? value : null;
}

// Saves what the customer has typed once there is a valid email or mobile
// number, so the owner can follow up even if they never submit the form.
export async function saveCheckoutContact(
  productCode: string,
  checkoutKey: string,
  payload: unknown,
): Promise<void> {
  const key = validCheckoutKey(checkoutKey);
  const contact = normalizeCheckoutContact(payload);
  if (!key || !contact || !getAuthoritativeProduct(productCode)) return;
  after(async () => {
    try {
      const attempt = await recordCheckoutContact(productCode, key, contact);
      await sendCheckoutAttemptAlert(attempt);
    } catch (error) {
      console.error("[commerce:checkout-attempt]", {
        stage: "record_contact",
        causeName: error instanceof Error ? error.name : typeof error,
      });
    }
  });
}

export type ClaimProductOfferResponse =
  | { success: true; code: string }
  | { success: false; errors: Partial<Record<"fullName" | "email" | "mobileNumber", string>>; message?: string };

// The product page popup: saves the customer's name, email and mobile as a
// lead (emailed to the owner like a checkout attempt) and reveals the code.
export async function claimProductOffer(
  productCode: string,
  leadKey: string,
  payload: unknown,
): Promise<ClaimProductOfferResponse> {
  if (!isFeaturedCouponActive()) {
    return { success: false, errors: {}, message: "This offer has ended." };
  }
  const key = validCheckoutKey(leadKey);
  const contact = normalizeCheckoutContact(payload);
  const errors: Partial<Record<"fullName" | "email" | "mobileNumber", string>> = {};
  if (!contact?.fullName) errors.fullName = "Enter your name.";
  if (!contact?.email) errors.email = "Enter a valid email address.";
  if (!contact?.mobileNumber) errors.mobileNumber = "Enter a valid 10-digit Indian mobile number.";
  if (Object.keys(errors).length || !contact || !key || !getAuthoritativeProduct(productCode)) {
    return { success: false, errors };
  }
  // Bots fill the hidden field; show them the same success without saving.
  const honeypot = payload && typeof payload === "object" ? (payload as Record<string, unknown>).website : "";
  if (!honeypot) {
    after(async () => {
      try {
        const attempt = await recordCheckoutContact(productCode, key, contact, "PRODUCT_POPUP");
        await sendCheckoutAttemptAlert(attempt);
      } catch (error) {
        console.error("[commerce:checkout-attempt]", {
          stage: "record_popup_lead",
          causeName: error instanceof Error ? error.name : typeof error,
        });
      }
    });
  }
  return { success: true, code: featuredCoupon.code };
}

export async function validateCheckoutDetails(
  productCode: string,
  payload: unknown,
  checkoutKey?: string,
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
        const attempt = await recordCheckoutAttempt(productCode, details, deliveryCheck, validCheckoutKey(checkoutKey));
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

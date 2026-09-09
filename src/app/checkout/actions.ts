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

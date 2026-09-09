import "server-only";
import {
  validateCheckoutPayload,
  type CheckoutFieldErrors,
  type NormalizedCheckoutDetails,
} from "@/lib/commerce/checkout-validation";
import { getAuthoritativeProduct } from "@/lib/server/commerce/products";
import { checkDelhiveryPrepaidServiceability } from "@/lib/server/delhivery/serviceability";
import type { DelhiveryServiceabilityResult } from "@/lib/server/delhivery/types";
import { DelhiveryServiceabilityError } from "@/lib/server/delhivery/types";
import { randomUUID } from "node:crypto";

export type CheckoutServiceabilityResponse =
  | {
      success: true;
      data: NormalizedCheckoutDetails;
      serviceability: DelhiveryServiceabilityResult;
    }
  | { success: false; errors: CheckoutFieldErrors; formError?: string }
  | {
      success: true;
      data: NormalizedCheckoutDetails;
      serviceabilityError: "unavailable";
    };

type ServiceabilityCheck = (postalCode: string) => Promise<DelhiveryServiceabilityResult>;

export async function validateCheckoutAndCheckServiceability(
  productCode: string,
  payload: unknown,
  checkServiceability: ServiceabilityCheck = checkDelhiveryPrepaidServiceability,
): Promise<CheckoutServiceabilityResponse> {
  if (!getAuthoritativeProduct(productCode)) {
    return { success: false, errors: {}, formError: "This product is not available for checkout." };
  }

  const validation = validateCheckoutPayload(payload);
  if (!validation.success) return validation;

  try {
    const serviceability = await checkServiceability(validation.data.pincode);
    return { success: true, data: validation.data, serviceability };
  } catch (error) {
    const diagnosticId = randomUUID();
    if (error instanceof DelhiveryServiceabilityError) {
      console.error("[commerce:delhivery-serviceability]", {
        diagnosticId,
        kind: error.kind,
        ...error.diagnostic,
      });
    } else {
      console.error("[commerce:delhivery-serviceability]", {
        diagnosticId,
        kind: "unexpected",
        stage: "unknown",
        causeName: error instanceof Error ? error.name : typeof error,
      });
    }
    // Provider-specific categories terminate at this server boundary. The client
    // only needs to know that the check is retryable, not why infrastructure failed.
    return { success: true, data: validation.data, serviceabilityError: "unavailable" };
  }
}

import "server-only";
import { calculateSubtotal, calculateTotal } from "@/lib/commerce/money";
import type { AuthoritativeProduct } from "./products";

export const V1_QUANTITY = 1 as const;
export const V1_SHIPPING_PAISA = 0 as const;
export const V1_ADDITIONAL_TAX_PAISA = 0 as const;

export function calculateV1Pricing(product: AuthoritativeProduct) {
  const subtotalPaisa = calculateSubtotal(product.unitAmountPaisa, V1_QUANTITY);
  return Object.freeze({
    unitAmountPaisa: product.unitAmountPaisa,
    quantity: V1_QUANTITY,
    subtotalPaisa,
    shippingPaisa: V1_SHIPPING_PAISA,
    taxPaisa: V1_ADDITIONAL_TAX_PAISA,
    totalPaisa: calculateTotal(subtotalPaisa, V1_SHIPPING_PAISA, V1_ADDITIONAL_TAX_PAISA),
    currency: product.currency,
  });
}

import "server-only";
import { calculateSubtotal, calculateTotal } from "@/lib/commerce/money";
import type { AuthoritativeProduct } from "./products";

export const V1_QUANTITY = 1 as const;
export const V1_SHIPPING_PAISA = 0 as const;
export const V1_ADDITIONAL_TAX_PAISA = 0 as const;

export function calculateV1Pricing(product: AuthoritativeProduct, discountPercent = 0) {
  const subtotalPaisa = calculateSubtotal(product.unitAmountPaisa, V1_QUANTITY);
  if (!Number.isSafeInteger(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new RangeError("discountPercent must be an integer from 0 to 100.");
  }
  const discountPaisa = (subtotalPaisa * discountPercent) / 100;
  if (!Number.isSafeInteger(discountPaisa)) throw new RangeError("Coupon discount must resolve to whole paise.");
  return Object.freeze({
    unitAmountPaisa: product.unitAmountPaisa,
    quantity: V1_QUANTITY,
    subtotalPaisa,
    discountPaisa,
    shippingPaisa: V1_SHIPPING_PAISA,
    taxPaisa: V1_ADDITIONAL_TAX_PAISA,
    totalPaisa: calculateTotal(subtotalPaisa - discountPaisa, V1_SHIPPING_PAISA, V1_ADDITIONAL_TAX_PAISA),
    currency: product.currency,
  });
}

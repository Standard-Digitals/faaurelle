import "server-only";

import { product } from "@/config/product";

export type AuthoritativeProduct = Readonly<{
  code: string;
  name: string;
  unitAmountPaisa: number;
  currency: "INR";
  active: boolean;
}>;

export const v1Product: AuthoritativeProduct = Object.freeze({
  code: product.code,
  name: product.formalName,
  unitAmountPaisa: product.unitAmountPaisa,
  currency: product.currency,
  active: true,
});

export function getAuthoritativeProduct(productCode: string): AuthoritativeProduct | null {
  return productCode === v1Product.code && v1Product.active ? v1Product : null;
}

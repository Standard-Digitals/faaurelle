"use client";

import { useEffect } from "react";
import { product } from "@/config/product";
import { trackViewContent } from "@/lib/analytics/meta-pixel";

export function ViewContentTracker() {
  useEffect(() => {
    trackViewContent({
      content_ids: [product.code],
      content_name: product.formalName,
      content_type: "product",
      currency: product.currency,
      value: product.unitAmountPaisa / 100,
    });
  }, []);

  return null;
}

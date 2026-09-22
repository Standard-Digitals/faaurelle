"use client";

import { useEffect, useState } from "react";
import { trackInitiateCheckout } from "@/lib/analytics/meta-pixel";
import { CheckoutForm, type AppliedCoupon } from "./CheckoutForm";
import { OrderSummary, type CheckoutSummary } from "./OrderSummary";
import styles from "./checkout.module.css";

export function CheckoutExperience({ productCode, summary }: { productCode: string; summary: CheckoutSummary }) {
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const displayedSummary = coupon
    ? { ...summary, couponCode: coupon.code, discountPaisa: coupon.discountPaisa, totalPaisa: coupon.totalPaisa }
    : summary;

  useEffect(() => {
    trackInitiateCheckout({
      content_ids: [productCode],
      content_name: summary.productName,
      content_type: "product",
      currency: summary.currency,
      value: summary.totalPaisa / 100,
      num_items: summary.quantity,
    });
    // Fire once for the checkout session; coupon changes should not re-fire InitiateCheckout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.checkoutLayout}>
      <CheckoutForm productCode={productCode} onCouponChange={setCoupon} />
      <OrderSummary summary={displayedSummary} />
    </div>
  );
}

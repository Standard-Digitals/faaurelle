"use client";

import { useState } from "react";
import { CheckoutForm, type AppliedCoupon } from "./CheckoutForm";
import { OrderSummary, type CheckoutSummary } from "./OrderSummary";
import styles from "./checkout.module.css";

export function CheckoutExperience({ productCode, summary }: { productCode: string; summary: CheckoutSummary }) {
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const displayedSummary = coupon
    ? { ...summary, couponCode: coupon.code, discountPaisa: coupon.discountPaisa, totalPaisa: coupon.totalPaisa }
    : summary;

  return (
    <div className={styles.checkoutLayout}>
      <CheckoutForm productCode={productCode} onCouponChange={setCoupon} />
      <OrderSummary summary={displayedSummary} />
    </div>
  );
}

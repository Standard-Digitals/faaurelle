"use client";

import { useCallback, useEffect, useState } from "react";
import { trackAddToCart, trackInitiateCheckout } from "@/lib/analytics/meta-pixel";
import { CheckoutForm, type AppliedCoupon } from "./CheckoutForm";
import { OrderSummary, type CheckoutSummary } from "./OrderSummary";
import styles from "./checkout.module.css";

export function CheckoutExperience({ productCode, summary }: { productCode: string; summary: CheckoutSummary }) {
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const displayedSummary = coupon
    ? { ...summary, couponCode: coupon.code, discountPaisa: coupon.discountPaisa, totalPaisa: coupon.totalPaisa }
    : summary;

  // There is no cart: arriving at checkout (from Buy Now or a direct link) is
  // AddToCart, and InitiateCheckout waits until the customer starts filling in
  // the form with a valid email or mobile number. Each fires once per browser
  // session, so refreshing or returning to checkout is not counted again.
  const trackOnce = useCallback((event: "add_to_cart" | "initiate_checkout") => {
    const trackedKey = `fa_aurelle_${event}_${productCode}`;
    try {
      if (window.sessionStorage.getItem(trackedKey)) return;
      window.sessionStorage.setItem(trackedKey, "1");
    } catch {
      // Storage can be unavailable (private mode); track anyway.
    }
    const params = {
      content_ids: [productCode],
      content_name: summary.productName,
      content_type: "product" as const,
      currency: summary.currency,
      value: summary.totalPaisa / 100,
      num_items: summary.quantity,
    };
    if (event === "add_to_cart") trackAddToCart(params);
    else trackInitiateCheckout(params);
  }, [productCode, summary]);

  useEffect(() => trackOnce("add_to_cart"), [trackOnce]);

  const handleContactStarted = useCallback(() => trackOnce("initiate_checkout"), [trackOnce]);

  return (
    <div className={styles.checkoutLayout}>
      <CheckoutForm productCode={productCode} onCouponChange={setCoupon} onContactStarted={handleContactStarted} />
      <OrderSummary summary={displayedSummary} />
    </div>
  );
}

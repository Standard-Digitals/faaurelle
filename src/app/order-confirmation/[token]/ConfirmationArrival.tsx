"use client";

import { useEffect } from "react";
import {
  CONFIRMATION_RECOVERY_KEY,
  parseConfirmationRecovery,
  shouldClearConfirmationRecovery,
} from "@/lib/commerce/confirmation-recovery";
import { trackPurchase } from "@/lib/analytics/meta-pixel";

const PURCHASE_TRACKED_KEY_PREFIX = "fa_aurelle_purchase_tracked_";

export type ConfirmationPurchase = Readonly<{
  productCode: string;
  productName: string;
  totalPaisa: number;
  currency: "INR";
  quantity: number;
  reference: string;
}>;

export function ConfirmationArrival({ token, purchase }: { token: string; purchase: ConfirmationPurchase }) {
  useEffect(() => {
    const recovery = parseConfirmationRecovery(
      window.sessionStorage.getItem(CONFIRMATION_RECOVERY_KEY),
    );
    if (shouldClearConfirmationRecovery(recovery, token)) {
      window.sessionStorage.removeItem(CONFIRMATION_RECOVERY_KEY);
    }
  }, [token]);

  useEffect(() => {
    const trackedKey = `${PURCHASE_TRACKED_KEY_PREFIX}${token}`;
    if (window.sessionStorage.getItem(trackedKey)) return;
    trackPurchase(
      {
        content_ids: [purchase.productCode],
        content_name: purchase.productName,
        content_type: "product",
        currency: purchase.currency,
        value: purchase.totalPaisa / 100,
        num_items: purchase.quantity,
      },
      purchase.reference,
    );
    window.sessionStorage.setItem(trackedKey, "1");
  }, [token, purchase]);

  return null;
}

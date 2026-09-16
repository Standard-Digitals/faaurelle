"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import styles from "./checkout.module.css";

export type CheckoutProgressOperation = "delivery" | "payment" | "verification";

type ProgressStep = Readonly<{
  label: string;
  status: "complete" | "active" | "upcoming";
}>;

function checkoutProgress(
  operation: CheckoutProgressOperation,
  openingCheckout: boolean,
): { title: string; steps: ProgressStep[] } {
  if (operation === "delivery") {
    return {
      title: "Checking your delivery",
      steps: [
        { label: "Checkout details accepted", status: "complete" },
        { label: "Checking prepaid delivery availability", status: "active" },
        { label: "Secure payment setup", status: "upcoming" },
      ],
    };
  }

  if (operation === "payment") {
    return {
      title: "Preparing your order",
      steps: [
        { label: "Checkout details validated", status: "complete" },
        { label: "Delivery availability confirmed", status: "complete" },
        { label: "Price and coupon confirmed", status: "complete" },
        {
          label: "Creating secure payment order",
          status: openingCheckout ? "complete" : "active",
        },
        {
          label: "Opening Razorpay Checkout",
          status: openingCheckout ? "active" : "upcoming",
        },
      ],
    };
  }

  return {
    title: "Confirming your payment",
    steps: [
      { label: "Payment response received", status: "complete" },
      { label: "Verifying payment securely", status: "active" },
      { label: "Preparing confirmation and shipment", status: "upcoming" },
    ],
  };
}

export function CheckoutProgressDialog({
  open,
  operation,
  openingCheckout,
  takingLonger,
  onClose,
}: {
  open: boolean;
  operation: CheckoutProgressOperation | null;
  openingCheckout: boolean;
  takingLonger: boolean;
  onClose: () => void;
}) {
  const progress = operation
    ? checkoutProgress(operation, openingCheckout)
    : null;

  return (
    <Dialog open={open && Boolean(progress)} onClose={onClose}>
      <DialogBackdrop className={styles.progressBackdrop} />
      <div className={styles.progressDialogPositioner}>
        <DialogPanel className={styles.progressDialog}>
          <button
            type="button"
            className={styles.progressClose}
            onClick={onClose}
            aria-label="Close progress dialog"
          >
            <span aria-hidden="true">×</span>
          </button>

          {progress ? (
            <>
              <DialogTitle className={styles.progressTitle}>{progress.title}</DialogTitle>
              <p className={styles.progressIntro}>
                Please keep this page open while we securely continue your checkout.
              </p>
              <ol className={styles.progressSteps} aria-label="Checkout progress">
                {progress.steps.map((step) => (
                  <li key={step.label} data-status={step.status}>
                    <span className={styles.progressMarker} aria-hidden="true">
                      {step.status === "complete"
                        ? "✓"
                        : step.status === "active"
                          ? <span className={styles.progressSpinner} />
                          : ""}
                    </span>
                    <span>{step.label}</span>
                    <span className={styles.srOnly}>
                      {step.status === "complete"
                        ? " completed"
                        : step.status === "active"
                          ? " in progress"
                          : " upcoming"}
                    </span>
                  </li>
                ))}
              </ol>
              <p className={styles.progressNote} role="status" aria-live="polite">
                {takingLonger
                  ? "This is taking a little longer than usual. Your progress is safe, and you may close this window."
                  : "You may close this window. Your checkout will continue processing."}
              </p>
            </>
          ) : null}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

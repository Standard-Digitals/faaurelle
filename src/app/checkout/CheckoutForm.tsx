"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { indiaStatesAndUnionTerritories } from "@/config/india";
import { featuredCoupon, isFeaturedCouponActive } from "@/config/promotions";
import indianCitiesByState from "@/data/indian-cities-by-state.json";
import {
  checkoutFieldNames,
  normalizeCheckoutIdentity,
  validateCheckoutPayload,
  type CheckoutFieldErrors,
  type CheckoutFieldName,
} from "@/lib/commerce/checkout-validation";
import {
  serviceabilityAfterFieldChange,
  type CheckoutServiceabilityState,
} from "@/lib/commerce/serviceability-ui";
import { loadRazorpayCheckout } from "@/lib/commerce/razorpay-checkout";
import { setAdvancedMatching, trackAddPaymentInfo } from "@/lib/analytics/meta-pixel";
import type { RazorpaySuccessResponse } from "@/lib/commerce/razorpay-checkout";
import {
  CONFIRMATION_RECOVERY_KEY,
  isPublicOrderToken,
  parseConfirmationRecovery,
  serializeConfirmationRecovery,
  shouldAttemptConfirmationRecovery,
} from "@/lib/commerce/confirmation-recovery";
import { createCheckoutOrder, validateCheckoutDetails, validateCheckoutCoupon } from "./actions";
import {
  CheckoutProgressDialog,
  type CheckoutProgressOperation,
} from "./CheckoutProgressDialog";
import styles from "./checkout.module.css";

type SubmissionState =
  | "idle"
  | "checking"
  | "ready"
  | "creating-order"
  | "opening-payment"
  | "script-unavailable"
  | "payment-closed"
  | "payment-failed"
  | "verifying-payment"
  | "payment-captured"
  | "payment-processing"
  | "verification-pending"
  | "verification-failed"
  | "error";
type PendingVerification = RazorpaySuccessResponse & { publicOrderToken: string };
type CityOption = Readonly<{ city: string; state: string; label: string }>;

const validIndiaStates = new Set<string>(indiaStatesAndUnionTerritories);
const indianCityOptions: CityOption[] = Object.entries(indianCitiesByState)
  .filter(([state]) => validIndiaStates.has(state))
  .flatMap(([state, cities]) => cities.map((city) => ({ city, state, label: `${city}, ${state}` })))
  .sort((first, second) => first.label.localeCompare(second.label));

function RequiredMark() {
  return <span className={styles.requiredMark} aria-hidden="true">*</span>;
}

function FieldError({ field, errors }: { field: CheckoutFieldName; errors: CheckoutFieldErrors }) {
  const message = errors[field];
  return message ? <p id={`${field}-error`} className={styles.fieldError}>{message}</p> : null;
}

function errorProps(field: CheckoutFieldName, errors: CheckoutFieldErrors) {
  return errors[field]
    ? { "aria-invalid": true as const, "aria-describedby": `${field}-error` }
    : {};
}

export type AppliedCoupon = Readonly<{ code: string; discountPaisa: number; totalPaisa: number }>;

// "pending": the featured coupon is pre-filled and will be applied once the
// customer's email and mobile are valid. "manual": they removed it or typed
// another code, so it is never re-applied behind their back.
type AutoCouponState = "pending" | "applied" | "manual";

export function CheckoutForm({
  productCode,
  onCouponChange,
}: {
  productCode: string;
  onCouponChange: (coupon: AppliedCoupon | null) => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [checkoutKey] = useState(() => crypto.randomUUID());
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [pendingVerification, setPendingVerification] = useState<PendingVerification | null>(null);
  const [serviceabilityState, setServiceabilityState] = useState<CheckoutServiceabilityState>("not-checked");
  const [formMessage, setFormMessage] = useState("Enter your delivery details to check availability.");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [selectedState, setSelectedState] = useState("");
  const [autoCouponCode] = useState(() => (isFeaturedCouponActive() ? featuredCoupon.code : null));
  const autoCouponRef = useRef<AutoCouponState>(autoCouponCode ? "pending" : "manual");
  const autoCouponTimerRef = useRef<number | undefined>(undefined);
  const [couponInput, setCouponInput] = useState(autoCouponCode ?? "");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponState, setCouponState] = useState<"idle" | "loading" | "accepted" | "rejected">("idle");
  const [couponMessage, setCouponMessage] = useState(
    autoCouponCode
      ? `${autoCouponCode} will be applied automatically once you add your email and mobile number.`
      : "Optional. Enter a coupon code after adding your email and mobile number.",
  );
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [takingLonger, setTakingLonger] = useState(false);
  const normalizedLocationQuery = locationQuery.trim().toLocaleLowerCase();
  const locationSuggestions = indianCityOptions
    .filter((option) => option.label.toLocaleLowerCase().includes(normalizedLocationQuery))
    .slice(0, 10);
  const busy = couponState === "loading" || submissionState === "checking" || submissionState === "creating-order" || submissionState === "opening-payment" || submissionState === "verifying-payment";
  const progressOperation: CheckoutProgressOperation | null =
    submissionState === "checking"
      ? "delivery"
      : submissionState === "creating-order" || submissionState === "opening-payment"
        ? "payment"
        : submissionState === "verifying-payment"
          ? "verification"
          : null;

  useEffect(() => {
    const recovery = parseConfirmationRecovery(
      window.sessionStorage.getItem(CONFIRMATION_RECOVERY_KEY),
    );
    if (recovery && shouldAttemptConfirmationRecovery(recovery)) {
      window.sessionStorage.setItem(
        CONFIRMATION_RECOVERY_KEY,
        serializeConfirmationRecovery(recovery.token, true),
      );
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      router.replace(`${basePath}/order-confirmation/${encodeURIComponent(recovery.token)}`);
    }
  }, [router]);

  useEffect(() => {
    if (!progressOperation || !progressDialogOpen) return;
    const longerWaitTimer = window.setTimeout(() => setTakingLonger(true), 10_000);
    return () => window.clearTimeout(longerWaitTimer);
  }, [progressDialogOpen, progressOperation]);

  const verifyPayment = async (verification: PendingVerification) => {
    setTakingLonger(false);
    setProgressDialogOpen(true);
    setSubmissionState("verifying-payment");
    setFormMessage("Verifying payment securely…");
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
      const response = await fetch(`${basePath}/api/payments/razorpay/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verification),
      });
      const result = await response.json() as
        | {
            success: true;
            payment: { status: "captured" | "processing" | "failed" };
            fulfilment?: { status: "created" | "pending" | "failed" | "ineligible" };
            confirmationToken?: string;
          }
        | { success: false; retryable: boolean; message: string };

      if (!result.success) {
        if (!result.retryable) {
          window.sessionStorage.removeItem(CONFIRMATION_RECOVERY_KEY);
        }
        setSubmissionState(result.retryable ? "verification-pending" : "verification-failed");
        setFormMessage(result.message);
      } else if (result.payment.status === "captured") {
        if (result.confirmationToken && isPublicOrderToken(result.confirmationToken)) {
          window.sessionStorage.setItem(
            CONFIRMATION_RECOVERY_KEY,
            serializeConfirmationRecovery(result.confirmationToken, true),
          );
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
          router.replace(`${basePath}/order-confirmation/${encodeURIComponent(result.confirmationToken)}`);
          return;
        }
        setSubmissionState("payment-captured");
        setPendingVerification(null);
        setFormMessage(
          result.fulfilment?.status === "created"
            ? "Payment received. Your shipment has been created."
            : "Payment received. Order processing is pending.",
        );
      } else if (result.payment.status === "processing") {
        setSubmissionState("payment-processing");
        setFormMessage("Payment is authorized or still processing. It has not been marked paid yet.");
      } else {
        window.sessionStorage.removeItem(CONFIRMATION_RECOVERY_KEY);
        setSubmissionState("payment-failed");
        setPendingVerification(null);
        setFormMessage("Razorpay reports that this payment attempt failed. The order has not been marked paid.");
      }
    } catch {
      setSubmissionState("verification-pending");
      setFormMessage("We received the payment response, but verification is pending. Do not pay again; retry verification.");
    }
  };

  const focusFirstError = (nextErrors: CheckoutFieldErrors) => {
    const firstField = checkoutFieldNames.find((field) => nextErrors[field]);
    if (!firstField) return;
    requestAnimationFrame(() => {
      const field = formRef.current?.elements.namedItem(firstField);
      if (field instanceof HTMLElement) field.focus();
    });
  };

  const handleFieldChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    const fieldName = target.name;
    if (!checkoutFieldNames.includes(fieldName as CheckoutFieldName)) return;

    if (fieldName === "email" || fieldName === "mobileNumber") {
      if (autoCouponRef.current !== "manual") {
        // Eligibility is per email and mobile, so recheck the featured coupon
        // whenever either changes.
        autoCouponRef.current = "pending";
        if (appliedCoupon) {
          setAppliedCoupon(null);
          onCouponChange(null);
          setCouponState("idle");
        }
        window.clearTimeout(autoCouponTimerRef.current);
        autoCouponTimerRef.current = window.setTimeout(() => void applyAutoCoupon(), 700);
      } else if (appliedCoupon) {
        setAppliedCoupon(null);
        onCouponChange(null);
        setCouponState("idle");
        setCouponMessage("Contact details changed. Apply the coupon again to recheck eligibility.");
      }
    }

    setErrors((current) => {
      if (!current[fieldName as CheckoutFieldName]) return current;
      const next = { ...current };
      delete next[fieldName as CheckoutFieldName];
      return next;
    });
    if (submissionState !== "idle") {
      setSubmissionState("idle");
    }
    if (fieldName === "pincode") {
      setServiceabilityState((current) =>
        serviceabilityAfterFieldChange(current, fieldName as CheckoutFieldName),
      );
      setFormMessage("Enter your delivery details to check availability.");
    }
  };

  const applyCoupon = async (code = couponInput): Promise<AppliedCoupon | null> => {
    if (!formRef.current || couponState === "loading") return null;
    setCouponState("loading");
    setCouponMessage("Checking coupon eligibility…");
    const fields = Object.fromEntries(new FormData(formRef.current).entries());
    try {
      const result = await validateCheckoutCoupon(productCode, code, fields);
      if (!result.success) {
        setAppliedCoupon(null);
        onCouponChange(null);
        setCouponState("rejected");
        setCouponMessage(result.message);
        return null;
      }
      const next = { code: result.code, discountPaisa: result.discountPaisa, totalPaisa: result.totalPaisa };
      setCouponInput(result.code);
      setAppliedCoupon(next);
      onCouponChange(next);
      setCouponState("accepted");
      setCouponMessage(
        result.code === autoCouponCode
          ? `${result.code} applied automatically. You save ${featuredCoupon.discountPercent}%.`
          : `${result.code} applied. Your discount is ready for final server verification.`,
      );
      return next;
    } catch {
      setCouponState("rejected");
      setCouponMessage("This coupon code is invalid or has already been used.");
      return null;
    }
  };

  // Applies the featured coupon once the email and mobile are valid. Returns
  // the applied coupon, or null when it is not pending or was not accepted.
  const applyAutoCoupon = async (): Promise<AppliedCoupon | null> => {
    window.clearTimeout(autoCouponTimerRef.current);
    if (!autoCouponCode || autoCouponRef.current !== "pending" || !formRef.current) return null;
    const identity = normalizeCheckoutIdentity(Object.fromEntries(new FormData(formRef.current).entries()));
    if (!identity.success) return null;
    autoCouponRef.current = "applied";
    return applyCoupon(autoCouponCode);
  };

  const removeCoupon = () => {
    autoCouponRef.current = "manual";
    setCouponInput("");
    setAppliedCoupon(null);
    onCouponChange(null);
    setCouponState("idle");
    setCouponMessage("Coupon removed. You can enter another code.");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const clientResult = validateCheckoutPayload(payload);

    if (!clientResult.success) {
      setErrors(clientResult.errors);
      setSubmissionState("error");
      setFormMessage("Review the highlighted details before continuing.");
      focusFirstError(clientResult.errors);
      return;
    }

    setErrors({});

    // Covers browsers that fill the email and mobile without the usual change
    // events, so the featured coupon is never silently missed.
    const autoApplied = await applyAutoCoupon();
    const couponForOrder = autoApplied ?? appliedCoupon;

    if (pendingVerification && (submissionState === "verification-pending" || submissionState === "payment-processing")) {
      await verifyPayment(pendingVerification);
      return;
    }

    if (serviceabilityState === "serviceable") {
      setTakingLonger(false);
      setProgressDialogOpen(true);
      setSubmissionState("creating-order");
      setFormMessage("Creating your secure payment order…");
      try {
        const orderResult = await createCheckoutOrder({
          checkoutKey,
          productCode,
          quantity: 1,
          details: payload,
          couponCode: couponForOrder?.code ?? null,
        });
        if (!orderResult.success) {
          if (orderResult.kind === "validation") {
            setErrors(orderResult.errors);
            focusFirstError(orderResult.errors);
            setFormMessage(orderResult.formError ?? "Review the highlighted details before continuing.");
          } else {
            setFormMessage(orderResult.message);
          }
          setSubmissionState("error");
          return;
        }

        if (orderResult.free) {
          window.sessionStorage.setItem(
            CONFIRMATION_RECOVERY_KEY,
            serializeConfirmationRecovery(orderResult.checkout.publicOrderToken, false),
          );
          setSubmissionState("payment-captured");
          setFormMessage("Order confirmed. Redirecting…");
          const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
          router.replace(`${basePath}/order-confirmation/${encodeURIComponent(orderResult.checkout.publicOrderToken)}`);
          return;
        }

        setSubmissionState("opening-payment");
        setFormMessage("Opening secure Razorpay Checkout…");
        setAdvancedMatching({
          email: clientResult.data.email,
          phone: clientResult.data.mobileNumber,
          fullName: clientResult.data.fullName,
          city: clientResult.data.city,
          state: clientResult.data.state,
          pincode: clientResult.data.pincode,
        });
        trackAddPaymentInfo({
          content_ids: [productCode],
          content_name: orderResult.checkout.description,
          content_type: "product",
          currency: orderResult.checkout.currency,
          value: orderResult.checkout.amount / 100,
        });
        try {
          await loadRazorpayCheckout();
        } catch {
          setSubmissionState("script-unavailable");
          setFormMessage("Razorpay Checkout could not be loaded. No payment was attempted; please try again.");
          return;
        }
        if (!window.Razorpay) throw new Error("Razorpay Checkout unavailable");

        const checkout = new window.Razorpay({
          key: orderResult.checkout.keyId,
          amount: orderResult.checkout.amount,
          currency: orderResult.checkout.currency,
          name: orderResult.checkout.name,
          description: orderResult.checkout.description,
          order_id: orderResult.checkout.razorpayOrderId,
          prefill: orderResult.checkout.prefill,
          handler: (response) => {
            const verification = {
              publicOrderToken: orderResult.checkout.publicOrderToken,
              ...response,
            };
            window.sessionStorage.setItem(
              CONFIRMATION_RECOVERY_KEY,
              serializeConfirmationRecovery(orderResult.checkout.publicOrderToken, false),
            );
            setPendingVerification(verification);
            void verifyPayment(verification);
          },
          modal: {
            ondismiss: () => {
              setSubmissionState("payment-closed");
              setFormMessage("Payment window closed. No payment has been confirmed; you can try again.");
            },
          },
        });
        checkout.on("payment.failed", (response) => {
          const reason = response?.error?.description?.trim();
          setSubmissionState("payment-failed");
          setFormMessage(
            `${reason ? `${reason.replace(/\.?$/, ".")} ` : "The payment attempt failed. "}No payment has been confirmed. Please try again with a different UPI app or a card.`,
          );
        });
        setProgressDialogOpen(false);
        checkout.open();
      } catch {
        setSubmissionState("error");
        setFormMessage("We couldn’t finish setting up the payment. Please try again.");
      }
      return;
    }

    setTakingLonger(false);
    setProgressDialogOpen(true);
    setSubmissionState("checking");
    setServiceabilityState("checking");
    setFormMessage("Checking prepaid delivery availability…");

    try {
      const serverResult = await validateCheckoutDetails(productCode, payload);
      if (!serverResult.success) {
        setErrors(serverResult.errors);
        setSubmissionState("error");
        setServiceabilityState("not-checked");
        setFormMessage(serverResult.formError ?? "Review the highlighted details before continuing.");
        focusFirstError(serverResult.errors);
        return;
      }

      setSubmissionState("ready");
      if ("serviceabilityError" in serverResult) {
        setServiceabilityState("unavailable");
        setFormMessage("We couldn’t verify delivery availability right now. Please try again.");
      } else if (serverResult.serviceability.prepaidServiceable) {
        setServiceabilityState("serviceable");
        setFormMessage("Prepaid delivery is available. Continue to secure payment.");
      } else {
        setServiceabilityState("unserviceable");
        setFormMessage("Prepaid delivery is currently unavailable to this pincode.");
      }
    } catch {
      setSubmissionState("error");
      setServiceabilityState("unavailable");
      setFormMessage("We couldn’t verify delivery availability right now. Please try again.");
    }
  };

  return (
    <>
      <form ref={formRef} className={styles.form} onSubmit={handleSubmit} onChange={handleFieldChange} noValidate>
      {autoCouponCode ? (
        <p className={styles.offerBanner} data-state={appliedCoupon?.code === autoCouponCode ? "applied" : "pending"}>
          <span className={styles.offerCode}>{autoCouponCode}</span>
          <span>
            {appliedCoupon?.code === autoCouponCode
              ? `Applied. You save ${featuredCoupon.discountPercent}% on this order.`
              : `${featuredCoupon.discountPercent}% off your order. Applied automatically once you add your email and mobile number.`}
          </span>
        </p>
      ) : null}
      <fieldset disabled={busy || submissionState === "payment-captured"}>
        <legend>Contact details</legend>
        <p className={styles.sectionIntro}>We’ll use these details for delivery updates when ordering becomes available.</p>

        <div className={styles.fieldGrid}>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="fullName">Full name <RequiredMark /></label>
            <input id="fullName" name="fullName" type="text" autoComplete="name" maxLength={100} placeholder="Your full name" {...errorProps("fullName", errors)} />
            <FieldError field="fullName" errors={errors} />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email address <RequiredMark /></label>
            <input id="email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" {...errorProps("email", errors)} />
            <FieldError field="email" errors={errors} />
          </div>

          <div className={styles.field}>
            <label htmlFor="mobileNumber">Mobile number <RequiredMark /></label>
            <div className={`${styles.phoneInput} ${errors.mobileNumber ? styles.invalidGroup : ""}`}>
              <span aria-hidden="true">+91</span>
              <input id="mobileNumber" name="mobileNumber" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={18} placeholder="98765 43210" aria-label="Indian mobile number" {...errorProps("mobileNumber", errors)} />
            </div>
            <FieldError field="mobileNumber" errors={errors} />
          </div>
        </div>
      </fieldset>

      <fieldset disabled={busy || submissionState === "payment-captured"}>
        <legend>Shipping address</legend>
        <p className={styles.sectionIntro}>India delivery only for V1. Pincode availability will be checked next.</p>

        <div className={styles.fieldGrid}>
          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="addressLine1">Address line 1 <RequiredMark /></label>
            <input id="addressLine1" name="addressLine1" type="text" autoComplete="address-line1" maxLength={160} placeholder="House number and street" {...errorProps("addressLine1", errors)} />
            <FieldError field="addressLine1" errors={errors} />
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="addressLine2">Address line 2 <span className={styles.optional}>(optional)</span></label>
            <input id="addressLine2" name="addressLine2" type="text" autoComplete="address-line2" maxLength={160} placeholder="Apartment, landmark or area" {...errorProps("addressLine2", errors)} />
            <FieldError field="addressLine2" errors={errors} />
          </div>

          <div className={`${styles.field} ${styles.fullWidth}`}>
            <label htmlFor="city">Location <RequiredMark /></label>
            <Combobox
              immediate
              value={selectedCity}
              onChange={(option: CityOption | null) => {
                setSelectedCity(option);
                if (option) {
                  setLocationQuery(option.city);
                  setSelectedState(option.state);
                }
              }}
            >
              <div className={styles.autocomplete}>
                <ComboboxInput
                  id="city"
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  maxLength={80}
                  placeholder="Start typing your city"
                  displayValue={(option: CityOption | null) => option?.city ?? locationQuery}
                  onChange={(event) => {
                    setLocationQuery(event.target.value);
                    setSelectedCity(null);
                  }}
                  {...errorProps("city", errors)}
                />
                {locationSuggestions.length > 0 ? (
                  <ComboboxOptions
                    anchor={{ to: "bottom start", gap: 6 }}
                    className={styles.suggestionList}
                    modal={false}
                    portal
                  >
                    {locationSuggestions.map((option) => (
                      <ComboboxOption
                        key={option.label}
                        value={option}
                        className={({ focus }) =>
                          `${styles.suggestion} ${focus ? styles.suggestionActive : ""}`
                        }
                      >
                        <span>{option.city}</span>
                        <small>{option.state}</small>
                      </ComboboxOption>
                    ))}
                  </ComboboxOptions>
                ) : null}
              </div>
            </Combobox>
            <FieldError field="city" errors={errors} />
          </div>

          <div className={styles.field}>
            <label htmlFor="state">State / union territory <RequiredMark /></label>
            <select
              id="state"
              name="state"
              autoComplete="address-level1"
              value={selectedState}
              onChange={(event) => setSelectedState(event.target.value)}
              {...errorProps("state", errors)}
            >
              <option value="" disabled>Select state or territory</option>
              {indiaStatesAndUnionTerritories.map((state) => <option key={state} value={state}>{state}</option>)}
            </select>
            <FieldError field="state" errors={errors} />
          </div>

          <div className={styles.field}>
            <label htmlFor="pincode">Pincode <RequiredMark /></label>
            <input id="pincode" name="pincode" type="text" inputMode="numeric" autoComplete="postal-code" maxLength={7} pattern="[0-9]{6}" placeholder="Six-digit pincode" {...errorProps("pincode", errors)} />
            <FieldError field="pincode" errors={errors} />
          </div>

          <div className={styles.field}>
            <label htmlFor="countryDisplay">Country</label>
            <input id="countryDisplay" type="text" value="India" readOnly aria-readonly="true" />
          </div>
        </div>
      </fieldset>

      <fieldset disabled={busy || submissionState === "payment-captured"}>
        <legend>Coupon</legend>
        <p className={styles.sectionIntro}>Apply one eligible code to receive your discount.</p>
        <div className={styles.couponRow}>
          <div className={styles.field}>
            <label htmlFor="couponCode">Coupon code <span className={styles.optional}>(optional)</span></label>
            <input
              id="couponCode"
              name="couponCode"
              type="text"
              autoComplete="off"
              maxLength={32}
              value={couponInput}
              placeholder="Enter coupon code"
              aria-invalid={couponState === "rejected"}
              aria-describedby="coupon-message"
              onChange={(event) => {
                autoCouponRef.current = "manual";
                setCouponInput(event.target.value.toUpperCase());
                if (appliedCoupon) {
                  setAppliedCoupon(null);
                  onCouponChange(null);
                }
                setCouponState("idle");
                setCouponMessage("Apply the code to check eligibility.");
              }}
            />
          </div>
          {appliedCoupon ? (
            <button className={styles.couponSecondary} type="button" onClick={removeCoupon}>Remove</button>
          ) : (
            <button className={styles.couponApply} type="button" disabled={!couponInput.trim() || couponState === "loading"} onClick={() => {
              autoCouponRef.current = "manual";
              void applyCoupon();
            }}>
              {couponState === "loading" ? "Checking…" : "Apply"}
            </button>
          )}
        </div>
        <p id="coupon-message" className={styles.couponMessage} data-state={couponState} role="status" aria-live="polite">{couponMessage}</p>
      </fieldset>

      <div className={styles.formFooter}>
        <p className={styles.formStatus} data-state={submissionState === "error" || submissionState === "script-unavailable" || submissionState === "payment-failed" || submissionState === "verification-failed" ? "error" : serviceabilityState} role="status" aria-live="polite">{formMessage}</p>
        <button type="submit" disabled={busy || submissionState === "payment-captured" || submissionState === "verification-failed"}>
          {submissionState === "checking" ? "Checking availability…" : submissionState === "creating-order" ? "Creating payment order…" : submissionState === "opening-payment" ? "Opening Razorpay…" : submissionState === "verifying-payment" ? "Verifying payment…" : submissionState === "verification-pending" || submissionState === "payment-processing" ? "Retry verification" : submissionState === "payment-captured" ? "Payment received" : serviceabilityState === "serviceable" ? "Continue to payment" : serviceabilityState === "unavailable" ? "Try delivery check again" : "Check delivery availability"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      </form>

      <CheckoutProgressDialog
        open={progressDialogOpen}
        operation={progressOperation}
        openingCheckout={submissionState === "opening-payment"}
        takingLonger={takingLonger}
        onClose={() => setProgressDialogOpen(false)}
      />
    </>
  );
}

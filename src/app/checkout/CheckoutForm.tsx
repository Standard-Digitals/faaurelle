"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useRef, useState, type FormEvent } from "react";
import { indiaStatesAndUnionTerritories } from "@/config/india";
import indianCitiesByState from "@/data/indian-cities-by-state.json";
import {
  checkoutFieldNames,
  validateCheckoutPayload,
  type CheckoutFieldErrors,
  type CheckoutFieldName,
} from "@/lib/commerce/checkout-validation";
import {
  serviceabilityAfterFieldChange,
  type CheckoutServiceabilityState,
} from "@/lib/commerce/serviceability-ui";
import { loadRazorpayCheckout } from "@/lib/commerce/razorpay-checkout";
import type { RazorpaySuccessResponse } from "@/lib/commerce/razorpay-checkout";
import { createCheckoutOrder, validateCheckoutDetails } from "./actions";
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

export function CheckoutForm({ productCode }: { productCode: string }) {
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
  const normalizedLocationQuery = locationQuery.trim().toLocaleLowerCase();
  const locationSuggestions = indianCityOptions
    .filter((option) => option.label.toLocaleLowerCase().includes(normalizedLocationQuery))
    .slice(0, 10);
  const busy = submissionState === "checking" || submissionState === "creating-order" || submissionState === "opening-payment" || submissionState === "verifying-payment";

  const verifyPayment = async (verification: PendingVerification) => {
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
          }
        | { success: false; retryable: boolean; message: string };

      if (!result.success) {
        setSubmissionState(result.retryable ? "verification-pending" : "verification-failed");
        setFormMessage(result.message);
      } else if (result.payment.status === "captured") {
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

    if (pendingVerification && (submissionState === "verification-pending" || submissionState === "payment-processing")) {
      await verifyPayment(pendingVerification);
      return;
    }

    if (serviceabilityState === "serviceable") {
      setSubmissionState("creating-order");
      setFormMessage("Creating your secure test payment order…");
      try {
        const orderResult = await createCheckoutOrder({
          checkoutKey,
          productCode,
          quantity: 1,
          details: payload,
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

        setSubmissionState("opening-payment");
        setFormMessage("Opening Razorpay Test Mode…");
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
        checkout.on("payment.failed", () => {
          setSubmissionState("payment-failed");
          setFormMessage("The payment attempt failed. No payment has been confirmed; you can try again.");
        });
        checkout.open();
      } catch {
        setSubmissionState("error");
        setFormMessage("We couldn’t finish setting up the test payment. Please try again.");
      }
      return;
    }

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
        setFormMessage("Prepaid delivery is available. Continue to create a Razorpay Test Mode payment order.");
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
    <form ref={formRef} className={styles.form} onSubmit={handleSubmit} onChange={handleFieldChange} noValidate>
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

      <div className={styles.formFooter}>
        <p className={styles.formStatus} data-state={submissionState === "error" || submissionState === "script-unavailable" || submissionState === "payment-failed" || submissionState === "verification-failed" ? "error" : serviceabilityState} role="status" aria-live="polite">{formMessage}</p>
        <button type="submit" disabled={busy || submissionState === "payment-captured" || submissionState === "verification-failed"}>
          {submissionState === "checking" ? "Checking availability…" : submissionState === "creating-order" ? "Creating test order…" : submissionState === "opening-payment" ? "Opening Razorpay…" : submissionState === "verifying-payment" ? "Verifying payment…" : submissionState === "verification-pending" || submissionState === "payment-processing" ? "Retry verification" : submissionState === "payment-captured" ? "Payment received" : serviceabilityState === "serviceable" ? "Continue to test payment" : serviceabilityState === "unavailable" ? "Try delivery check again" : "Check delivery availability"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}

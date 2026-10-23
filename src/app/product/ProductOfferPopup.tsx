"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { product } from "@/config/product";
import { featuredCoupon, featuredCouponPricePaisa, isFeaturedCouponActive } from "@/config/promotions";
import { setAdvancedMatching, trackLead } from "@/lib/analytics/meta-pixel";
import { formatInr } from "@/lib/commerce/money";
import { claimProductOffer, type ClaimProductOfferResponse } from "../checkout/actions";
import styles from "./ProductOfferPopup.module.css";

type OfferErrors = Extract<ClaimProductOfferResponse, { success: false }>["errors"];

const SHOW_AFTER_MS = 4_000;
// Dismissing hides the popup for the rest of the visit; claiming hides it for good.
const DISMISSED_KEY = "fa_aurelle_offer_popup_dismissed";
const CLAIMED_KEY = `fa_aurelle_offer_popup_claimed_${featuredCoupon.code}`;

function readStorage(storage: () => Storage, key: string) {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: () => Storage, key: string) {
  try {
    storage().setItem(key, "1");
  } catch {
    // Storage can be unavailable (private mode); the popup just shows again.
  }
}

export function ProductOfferPopup() {
  const [open, setOpen] = useState(false);
  const [leadKey] = useState(() => crypto.randomUUID());
  const [errors, setErrors] = useState<OfferErrors>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const offerPrice = formatInr(featuredCouponPricePaisa(product.unitAmountPaisa));

  useEffect(() => {
    if (!isFeaturedCouponActive()) return;
    if (readStorage(() => window.sessionStorage, DISMISSED_KEY)) return;
    if (readStorage(() => window.localStorage, CLAIMED_KEY)) return;
    const timer = window.setTimeout(() => setOpen(true), SHOW_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const close = () => {
    setOpen(false);
    if (!code) writeStorage(() => window.sessionStorage, DISMISSED_KEY);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting || !formRef.current) return;
    const fields = Object.fromEntries(new FormData(formRef.current).entries());
    setSubmitting(true);
    setMessage("");
    try {
      const result = await claimProductOffer(product.code, leadKey, fields);
      if (!result.success) {
        setErrors(result.errors);
        setMessage(result.message ?? "");
        const firstInvalid = (["fullName", "email", "mobileNumber"] as const).find((field) => result.errors[field]);
        if (firstInvalid) {
          const input = formRef.current?.elements.namedItem(firstInvalid);
          if (input instanceof HTMLElement) input.focus();
        }
        return;
      }
      setErrors({});
      setCode(result.code);
      writeStorage(() => window.localStorage, CLAIMED_KEY);
      setAdvancedMatching({
        email: String(fields.email ?? ""),
        phone: String(fields.mobileNumber ?? ""),
        fullName: String(fields.fullName ?? ""),
        city: "",
        state: "",
        pincode: "",
      });
      trackLead({
        content_ids: [product.code],
        content_name: product.formalName,
        content_type: "product",
        currency: product.currency,
        value: featuredCouponPricePaisa(product.unitAmountPaisa) / 100,
      });
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const clearError = (field: keyof OfferErrors) => {
    if (!errors[field]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  return (
    <Dialog open={open} onClose={close}>
      <DialogBackdrop className={styles.backdrop} />
      <div className={styles.positioner}>
        <DialogPanel className={styles.panel}>
          <button type="button" className={styles.close} onClick={close} aria-label="Close offer">
            <span aria-hidden="true">×</span>
          </button>

          {code ? (
            <div className={styles.success}>
              <p className={styles.eyebrow}>Your code is ready</p>
              <DialogTitle className={styles.title}>{featuredCoupon.discountPercent}% off is yours</DialogTitle>
              <p className={styles.intro}>
                Use this code at checkout. Pay {offerPrice} for the {product.formalName}.
              </p>
              <div className={styles.codeRow}>
                <span className={styles.code}>{code}</span>
                <button type="button" className={styles.copy} onClick={copyCode}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className={styles.srOnly} role="status" aria-live="polite">
                {copied ? "Code copied" : ""}
              </p>
              <a
                className={`${styles.primary} type-cta`}
                href={`${basePath}/checkout?product=${encodeURIComponent(product.code)}`}
              >
                Shop now
              </a>
              <button type="button" className={styles.secondary} onClick={close}>
                Continue browsing
              </button>
            </div>
          ) : (
            <>
              <p className={styles.eyebrow}>Special offer</p>
              <DialogTitle className={styles.title}>Unlock {featuredCoupon.discountPercent}% off</DialogTitle>
              <p className={styles.intro}>
                Share your details to get your exclusive code and pay just {offerPrice} for the{" "}
                {product.formalName}.
              </p>
              <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
                <div className={styles.field}>
                  <label htmlFor="offer-fullName">Name</label>
                  <input
                    id="offer-fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    maxLength={100}
                    placeholder="Your full name"
                    autoFocus
                    onChange={() => clearError("fullName")}
                    {...(errors.fullName ? { "aria-invalid": true, "aria-describedby": "offer-fullName-error" } : {})}
                  />
                  {errors.fullName ? <p id="offer-fullName-error" className={styles.error}>{errors.fullName}</p> : null}
                </div>
                <div className={styles.field}>
                  <label htmlFor="offer-email">Email</label>
                  <input
                    id="offer-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="you@example.com"
                    onChange={() => clearError("email")}
                    {...(errors.email ? { "aria-invalid": true, "aria-describedby": "offer-email-error" } : {})}
                  />
                  {errors.email ? <p id="offer-email-error" className={styles.error}>{errors.email}</p> : null}
                </div>
                <div className={styles.field}>
                  <label htmlFor="offer-mobileNumber">Mobile number</label>
                  <div className={styles.phoneInput} data-invalid={errors.mobileNumber ? "true" : undefined}>
                    <span aria-hidden="true">+91</span>
                    <input
                      id="offer-mobileNumber"
                      name="mobileNumber"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={18}
                      placeholder="98765 43210"
                      onChange={() => clearError("mobileNumber")}
                      {...(errors.mobileNumber ? { "aria-invalid": true, "aria-describedby": "offer-mobileNumber-error" } : {})}
                    />
                  </div>
                  {errors.mobileNumber ? <p id="offer-mobileNumber-error" className={styles.error}>{errors.mobileNumber}</p> : null}
                </div>
                <input className={styles.honeypot} name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                {message ? <p className={styles.error} role="alert">{message}</p> : null}
                <button type="submit" className={`${styles.primary} type-cta`} disabled={submitting}>
                  {submitting ? "Getting your code…" : "Get my code"}
                </button>
                <p className={styles.fineprint}>
                  By continuing, you agree that FA ÀURELLE may contact you about your order and offers.
                </p>
              </form>
            </>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

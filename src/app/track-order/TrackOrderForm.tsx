"use client";

import { useRef, useState, type FormEvent } from "react";
import { validateTrackingReference, type CustomerTrackingResult, type TrackOrderApiResponse } from "@/lib/commerce/tracking";
import styles from "./track-order.module.css";

type ViewState = "initial" | "loading" | "found" | "preparing" | "tracking-pending" | "not-found" | "unavailable";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function displayTimestamp(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1];
  return `${day} ${monthName ?? month} ${year} · ${hour}:${minute}`;
}

function TrackingResultView({ tracking, orderReference }: { tracking: CustomerTrackingResult; orderReference: string }) {
  return (
    <section className={styles.result} aria-labelledby="shipment-status-title">
      <div className={styles.resultHeader}>
        <div>
          <p className={styles.resultLabel}>Current status</p>
          <h2 id="shipment-status-title">{tracking.currentStatus.label}</h2>
        </div>
        <span className={styles.statusMark} data-state={tracking.currentStatus.state} aria-hidden="true" />
      </div>

      <dl className={styles.shipmentFacts}>
        {orderReference ? <div><dt>Aurelle order reference</dt><dd>{orderReference}</dd></div> : null}
        {tracking.currentStatus.timestamp ? <div><dt>Latest update</dt><dd>{displayTimestamp(tracking.currentStatus.timestamp)}</dd></div> : null}
        {tracking.currentStatus.location ? <div><dt>Current location</dt><dd>{tracking.currentStatus.location}</dd></div> : null}
        {tracking.origin ? <div><dt>Origin</dt><dd>{tracking.origin}</dd></div> : null}
        {tracking.destination ? <div><dt>Destination</dt><dd>{tracking.destination}</dd></div> : null}
      </dl>

      <div className={styles.history}>
        <div className={styles.historyHeading}>
          <h3>Tracking history</h3>
          <span>{tracking.scans.length} {tracking.scans.length === 1 ? "update" : "updates"}</span>
        </div>
        {tracking.scans.length ? (
          <ol className={styles.timeline}>
            {tracking.scans.map((scan, index) => (
              <li key={[scan.status, scan.timestamp, scan.location, index].join("-")}>
                <span className={styles.timelineDot} aria-hidden="true" />
                <div className={styles.scanCopy}>
                  <div>
                    <h4>{scan.status}</h4>
                    {scan.timestamp ? <time dateTime={scan.timestamp}>{displayTimestamp(scan.timestamp)}</time> : null}
                  </div>
                  {scan.location ? <p className={styles.location}>{scan.location}</p> : null}
                  {scan.instructions ? <p>{scan.instructions}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.emptyHistory}>Delhivery provided the current status, but no scan history is available yet.</p>
        )}
      </div>
    </section>
  );
}

export function TrackOrderForm() {
  const [reference, setReference] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [view, setView] = useState<ViewState>("initial");
  const [tracking, setTracking] = useState<CustomerTrackingResult | null>(null);
  const [orderReference, setOrderReference] = useState<string | undefined>();
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const requestInFlightRef = useRef(false);

  const focusResponse = () => requestAnimationFrame(() => responseRef.current?.focus());

  async function lookup() {
    if (requestInFlightRef.current) return;
    const validation = validateTrackingReference(reference);
    if (!validation.success) {
      setFieldError(validation.message);
      setView("initial");
      inputRef.current?.focus();
      return;
    }
    const normalizedReference = validation.reference;
    setReference(normalizedReference);
    setFieldError("");
    setTracking(null);
    setOrderReference(undefined);
    setView("loading");
    requestInFlightRef.current = true;
    try {
      const response = await fetch(`${basePath}/api/track-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference: normalizedReference }),
        cache: "no-store",
      });
      const result = await response.json() as TrackOrderApiResponse;
      if (result.success) {
        setOrderReference(result.orderReference);
        if (result.state === "tracking") {
          setTracking(result.tracking);
          setView("found");
        } else if (result.state === "preparing") {
          setView("preparing");
        } else {
          setView("tracking-pending");
        }
      } else if (result.error === "invalid") {
        setFieldError(result.message);
        setView("initial");
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      } else {
        setView(result.error === "not_found" ? "not-found" : "unavailable");
      }
    } catch {
      setView("unavailable");
    } finally {
      requestInFlightRef.current = false;
    }
    focusResponse();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookup();
  }

  function reset() {
    setReference("");
    setFieldError("");
    setTracking(null);
    setOrderReference(undefined);
    setView("initial");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className={styles.workspace}>
      <form className={styles.lookupForm} onSubmit={handleSubmit} noValidate>
        <div className={styles.formHeading}>
          <span aria-hidden="true">FA</span>
          <div>
            <h2>Find your shipment</h2>
            <p>Use the FA reference shown on your Aurelle order confirmation.</p>
          </div>
        </div>
        <label htmlFor="tracking-reference">Aurelle order reference</label>
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            id="tracking-reference"
            name="reference"
            type="text"
            inputMode="text"
            autoComplete="off"
            maxLength={23}
            value={reference}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "tracking-reference-error" : "tracking-reference-help"}
            placeholder="FA-0123456789ABCDEF0123"
            disabled={view === "loading"}
            onChange={(event) => {
              setReference(event.target.value);
              if (fieldError) setFieldError("");
            }}
          />
          <button type="submit" disabled={view === "loading"}>
            {view === "loading" ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {view === "loading" ? "Checking…" : "Track order"}
          </button>
        </div>
        <p id="tracking-reference-help" className={styles.fieldHelp}>Enter one complete reference only. Do not paste a URL.</p>
        {fieldError ? <p id="tracking-reference-error" className={styles.fieldError}>{fieldError}</p> : null}
      </form>

      <p className="sr-only" role="status" aria-live="polite">
        {view === "loading" ? "Retrieving the latest update from Delhivery." : ""}
      </p>

      <div
        ref={responseRef}
        className={styles.response}
        tabIndex={-1}
        role="region"
        aria-label="Tracking result"
        aria-live="polite"
        aria-busy={view === "loading"}
      >
        {view === "initial" ? (
          <div className={styles.initialState}>
            <p>Carrier-confirmed updates will appear here.</p>
            <span>One reference · No automatic polling · No address details shown</span>
          </div>
        ) : null}
        {view === "loading" ? <div className={styles.loadingState}><span className={styles.loadingLine} /><p>Retrieving the latest update from Delhivery…</p></div> : null}
        {view === "found" && tracking && orderReference ? (
          <TrackingResultView tracking={tracking} orderReference={orderReference} />
        ) : null}
        {view === "preparing" ? (
          <div className={styles.messageState}>
            <p className={styles.resultLabel}>Order confirmed</p>
            <h2>Shipment preparation is in progress.</h2>
            <p>Your payment is confirmed. Tracking updates will become available after the carrier accepts your shipment.</p>
            <button type="button" onClick={() => void lookup()}>Check again</button>
          </div>
        ) : null}
        {view === "tracking-pending" ? (
          <div className={styles.messageState}>
            <p className={styles.resultLabel}>Shipment created</p>
            <h2>Carrier tracking will appear shortly.</h2>
            <p>Your shipment is recorded, but the carrier has not published tracking information yet.</p>
            <button type="button" onClick={() => void lookup()}>Check again</button>
          </div>
        ) : null}
        {view === "not-found" ? (
          <div className={styles.messageState}>
            <p className={styles.resultLabel}>No shipment found</p>
            <h2>We couldn’t find tracking information for that reference.</h2>
            <p>Check the complete FA reference against your order confirmation, then try again.</p>
            <button type="button" onClick={reset}>Track another order</button>
          </div>
        ) : null}
        {view === "unavailable" ? (
          <div className={styles.messageState}>
            <p className={styles.resultLabel}>Tracking unavailable</p>
            <h2>We couldn’t retrieve delivery updates right now.</h2>
            <p>Your reference may still be valid. Please wait a moment and try again.</p>
            <button type="button" onClick={() => void lookup()}>Try again</button>
          </div>
        ) : null}
        {view === "found" ? <button className={styles.resetButton} type="button" onClick={reset}>Track another order</button> : null}
      </div>
    </div>
  );
}

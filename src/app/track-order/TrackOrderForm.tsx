"use client";

import { useRef, useState, type FormEvent } from "react";
import { validateWaybill, type TrackOrderApiResponse, type TrackingResult } from "@/lib/commerce/tracking";
import styles from "./track-order.module.css";

type ViewState = "initial" | "loading" | "found" | "not-found" | "unavailable";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function displayTimestamp(value?: string) {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1];
  return `${day} ${monthName ?? month} ${year} · ${hour}:${minute}`;
}

function TrackingResultView({ tracking }: { tracking: TrackingResult }) {
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
        <div>
          <dt>Delhivery AWB / Waybill</dt>
          <dd>{tracking.waybill}</dd>
        </div>
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
          <p className={styles.emptyHistory}>Delhivery has provided the current status, but no scan history is available yet.</p>
        )}
      </div>
    </section>
  );
}

export function TrackOrderForm() {
  const [waybill, setWaybill] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [view, setView] = useState<ViewState>("initial");
  const [tracking, setTracking] = useState<TrackingResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const requestInFlightRef = useRef(false);

  const focusResponse = () => requestAnimationFrame(() => responseRef.current?.focus());

  async function lookup() {
    if (requestInFlightRef.current) return;
    const validation = validateWaybill(waybill);
    if (!validation.success) {
      setFieldError(validation.message);
      setView("initial");
      inputRef.current?.focus();
      return;
    }
    setWaybill(validation.waybill);
    setFieldError("");
    setTracking(null);
    setView("loading");
    requestInFlightRef.current = true;
    try {
      const response = await fetch(`${basePath}/api/track-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ waybill: validation.waybill }),
        cache: "no-store",
      });
      const result = await response.json() as TrackOrderApiResponse;
      if (result.success) {
        setTracking(result.tracking);
        setView("found");
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
    setWaybill("");
    setFieldError("");
    setTracking(null);
    setView("initial");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  return (
    <div className={styles.workspace}>
      <form className={styles.lookupForm} onSubmit={handleSubmit} noValidate>
        <div className={styles.formHeading}>
          <span aria-hidden="true">AWB</span>
          <div>
            <h2>Find your shipment</h2>
            <p>Your waybill is usually included in the shipment message from Delhivery.</p>
          </div>
        </div>
        <label htmlFor="tracking-waybill">Delhivery AWB / Waybill</label>
        <div className={styles.inputRow}>
          <input
            ref={inputRef}
            id="tracking-waybill"
            name="waybill"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            maxLength={64}
            value={waybill}
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "tracking-waybill-error" : "tracking-waybill-help"}
            placeholder="Enter your Delhivery waybill"
            disabled={view === "loading"}
            onChange={(event) => {
              setWaybill(event.target.value);
              if (fieldError) setFieldError("");
            }}
          />
          <button type="submit" disabled={view === "loading"}>
            {view === "loading" ? <span className={styles.spinner} aria-hidden="true" /> : null}
            {view === "loading" ? "Checking…" : "Track order"}
          </button>
        </div>
        <p id="tracking-waybill-help" className={styles.fieldHelp}>Enter one waybill using numbers only.</p>
        {fieldError ? <p id="tracking-waybill-error" className={styles.fieldError}>{fieldError}</p> : null}
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
            <span>One waybill · No automatic polling · No address details shown</span>
          </div>
        ) : null}
        {view === "loading" ? <div className={styles.loadingState}><span className={styles.loadingLine} /><p>Retrieving the latest update from Delhivery…</p></div> : null}
        {view === "found" && tracking ? <TrackingResultView tracking={tracking} /> : null}
        {view === "not-found" ? (
          <div className={styles.messageState}>
            <p className={styles.resultLabel}>No shipment found</p>
            <h2>We couldn’t find tracking for that waybill.</h2>
            <p>Check every digit against the Delhivery shipment message, then try again.</p>
            <button type="button" onClick={reset}>Track another order</button>
          </div>
        ) : null}
        {view === "unavailable" ? (
          <div className={styles.messageState}>
            <p className={styles.resultLabel}>Tracking unavailable</p>
            <h2>We couldn’t retrieve delivery updates right now.</h2>
            <p>Your waybill may still be valid. Please wait a moment and try again.</p>
            <button type="button" onClick={() => void lookup()}>Try again</button>
          </div>
        ) : null}
        {view === "found" ? <button className={styles.resetButton} type="button" onClick={reset}>Track another order</button> : null}
      </div>
    </div>
  );
}

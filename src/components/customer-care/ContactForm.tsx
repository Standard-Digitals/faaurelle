"use client";

import {
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from "@headlessui/react";
import { useState, type FormEvent } from "react";
import indianCitiesByState from "@/data/indian-cities-by-state.json";
import styles from "./CustomerCare.module.css";

type SubmissionState = "idle" | "submitting" | "success" | "error";

function RequiredMark() {
  return <span className={styles.requiredMark} aria-hidden="true">*</span>;
}

const indianCityOptions = Object.entries(indianCitiesByState)
  .flatMap(([state, cities]) => cities.map((city) => `${city}, ${state}`))
  .sort((first, second) => first.localeCompare(second));

export function ContactForm() {
  const [locationQuery, setLocationQuery] = useState("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const normalizedLocationQuery = locationQuery.trim().toLocaleLowerCase();
  const locationSuggestions = indianCityOptions
    .filter((city) => city.toLocaleLowerCase().includes(normalizedLocationQuery))
    .slice(0, 10);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setSubmissionState("submitting");
    setSubmissionMessage("");

    try {
      const response = await fetch(`${basePath}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data.entries())),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to send your message.");
      }

      form.reset();
      setLocationQuery("");
      setSubmissionState("success");
      setSubmissionMessage("Thank you. Your message has been received.");
    } catch (error) {
      setSubmissionState("error");
      setSubmissionMessage(
        error instanceof Error ? error.message : "We could not send your message. Please try again.",
      );
    }
  };

  return (
    <form className={styles.contactForm} onSubmit={handleSubmit}>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.formField}>
          <label htmlFor="contact-name">Name <RequiredMark /></label>
          <input id="contact-name" name="name" type="text" autoComplete="name" placeholder="Your full name" required />
        </div>
        <div className={styles.formField}>
          <label htmlFor="contact-email">Email address <RequiredMark /></label>
          <input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </div>
      </div>

      <div className={styles.fieldRow}>
        <div className={styles.formField}>
          <label htmlFor="contact-number">Contact number <RequiredMark /></label>
          <div className={styles.contactInputGroup}>
            <span className={styles.contactPrefix} aria-hidden="true">+91</span>
            <input type="hidden" name="countryCode" value="+91" />
            <input
              id="contact-number"
              name="contact"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              aria-label="Indian mobile number"
              placeholder="Enter 10-digit number"
              pattern="[0-9]{10}"
              maxLength={10}
              required
            />
          </div>
        </div>
        <div className={styles.formField}>
          <label htmlFor="contact-location">Location <RequiredMark /></label>
          <Combobox immediate value={locationQuery} onChange={(city) => setLocationQuery(city ?? "")}>
            <div className={styles.autocomplete}>
              <ComboboxInput
                id="contact-location"
                name="location"
                type="text"
                autoComplete="address-level2"
                placeholder="Start typing your city"
                displayValue={(city: string) => city}
                onChange={(event) => setLocationQuery(event.target.value)}
                required
              />
              {locationSuggestions.length > 0 ? (
                <ComboboxOptions
                  anchor={{ to: "bottom start", gap: 6 }}
                  className={styles.suggestionList}
                  modal={false}
                  portal
                >
                  {locationSuggestions.map((city) => (
                    <ComboboxOption
                      key={city}
                      value={city}
                      className={({ focus }) =>
                        `${styles.suggestion} ${focus ? styles.suggestionActive : ""}`
                      }
                    >
                      {city}
                    </ComboboxOption>
                  ))}
                </ComboboxOptions>
              ) : null}
            </div>
          </Combobox>
        </div>
      </div>

      <div className={styles.formField}>
        <label htmlFor="contact-topic">How can we help? <RequiredMark /></label>
        <select id="contact-topic" name="topic" defaultValue="" required>
          <option value="" disabled>Select a topic</option>
          <option>Product guidance</option>
          <option>Order support</option>
          <option>Shipping and delivery</option>
          <option>Returns and replacements</option>
          <option>Press and partnerships</option>
          <option>Something else</option>
        </select>
      </div>

      <div className={`${styles.formField} ${styles.messageField}`}>
        <label htmlFor="contact-message">Message <RequiredMark /></label>
        <textarea id="contact-message" name="message" rows={6} placeholder="Tell us how we can help" required />
      </div>

      <div className={styles.formFooter}>
        <p className={styles.formStatus} data-state={submissionState} role="status" aria-live="polite">
          {submissionMessage}
        </p>
        <button type="submit" disabled={submissionState === "submitting"}>
          {submissionState === "submitting" ? "Sending…" : "Send message"}
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h13M13 7l5 5-5 5" />
          </svg>
        </button>
      </div>
    </form>
  );
}

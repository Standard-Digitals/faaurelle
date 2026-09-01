"use client";

import {
  Button,
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Field,
  Input,
  Label,
} from "@headlessui/react";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import styles from "./coming-soon.module.css";
import indianCitiesByState from "@/data/indian-cities-by-state.json";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const indianCityOptions = Object.entries(indianCitiesByState)
  .flatMap(([state, cities]) => cities.map((city) => `${city}, ${state}`))
  .sort((first, second) => first.localeCompare(second));

type SubmissionState = "idle" | "submitting" | "success" | "error";

export function ComingSoonExperience() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [submissionMessage, setSubmissionMessage] = useState("");

  const normalizedLocationQuery = locationQuery.trim().toLocaleLowerCase();
  const locationSuggestions = indianCityOptions
    .filter((city) => city.toLocaleLowerCase().includes(normalizedLocationQuery))
    .slice(0, 10);
  const openDialog = () => {
    setSubmissionState("idle");
    setSubmissionMessage("");
    setDialogOpen(true);
  };
  const closeDialog = () => setDialogOpen(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setSubmissionState("submitting");
    setSubmissionMessage("");

    try {
      const response = await fetch(`${basePath}/api/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          contact: data.get("contact"),
          email: data.get("email"),
          location: data.get("location"),
          website: data.get("website"),
        }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Unable to submit the form.");
      }

      form.reset();
      setLocationQuery("");
      setSubmissionState("success");
      setSubmissionMessage("Thank you. Your interest has been registered.");
    } catch (error) {
      setSubmissionState("error");
      setSubmissionMessage(
        error instanceof Error
          ? error.message
          : "We could not register your interest. Please try again.",
      );
    }
  };

  return (
    <section className={styles.section} aria-labelledby="coming-soon-title">
      <div className={styles.composition}>
        <div className={styles.productVisual} aria-hidden="true">
          <Image
            src={`${basePath}/images/products/coming-soon-banner.png`}
            alt=""
            fill
            priority
            sizes="100vw"
            className={styles.productImage}
          />
        </div>

        <div className={styles.content}>
          <h1 id="coming-soon-title">Elixir is near</h1>
          <Button type="button" className={styles.subscribeButton} onClick={openDialog}>
            Subscribe
          </Button>
          <time className={styles.launchDate} dateTime="2026-09-15">
            Sep 15, 2026
          </time>
        </div>
      </div>

      <Dialog open={dialogOpen} onClose={closeDialog} className={styles.dialogRoot}>
        <DialogBackdrop className={styles.dialogBackdrop} />
        <div className={styles.dialogViewport}>
          <DialogPanel className={styles.dialog}>
            <div className={styles.dialogHeader}>
              <div>
                <p>Private access</p>
                <DialogTitle id="subscription-title">Join the reveal</DialogTitle>
              </div>
              <Button
                type="button"
                className={styles.closeButton}
                onClick={closeDialog}
                aria-label="Close subscription form"
              >
                <span aria-hidden="true">×</span>
              </Button>
            </div>

            <p className={styles.dialogIntroduction}>
              Share your details to receive launch news and availability updates.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.honeypot} aria-hidden="true">
                <label htmlFor="subscription-website">Website</label>
                <Input
                  id="subscription-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <Field className={styles.formField}>
                <Label className={styles.formLabel}>Name</Label>
                <Input
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  required
                />
              </Field>

              <Field className={styles.formField}>
                <Label className={styles.formLabel}>Contact number</Label>
                <div className={styles.contactInputGroup}>
                  <span className={styles.contactPrefix} aria-hidden="true">
                    +91
                  </span>
                  <Input type="hidden" name="countryCode" value="+91" />
                  <Input
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
              </Field>

              <Field className={styles.formField}>
                <Label className={styles.formLabel}>Email address</Label>
                <Input
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  required
                />
              </Field>

              <Field className={styles.formField}>
                <Label className={styles.formLabel}>Location</Label>
                <Combobox
                  immediate
                  value={locationQuery}
                  onChange={(city) => setLocationQuery(city ?? "")}
                >
                  <div className={styles.autocomplete}>
                    <ComboboxInput
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
              </Field>

              <Button
                type="submit"
                className={styles.submitButton}
                disabled={submissionState === "submitting"}
              >
                {submissionState === "submitting" ? "Sending…" : "Register interest"}
              </Button>

              <p
                className={`${styles.formStatus} ${
                  submissionState === "error" ? styles.formStatusError : ""
                }`}
                role={submissionState === "error" ? "alert" : "status"}
                aria-live="polite"
              >
                {submissionMessage}
              </p>
            </form>
          </DialogPanel>
        </div>
      </Dialog>
    </section>
  );
}

"use client";

import Image from "next/image";
import { useState, type FormEvent, type ReactNode } from "react";
import { closingExploreLinks, customerCareItems, footerContent } from "./closing.data";
import styles from "./SiteFooter.module.css";
import { brand } from "@/config/brand";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const logoPath = `${basePath}/images/brand/fa-aurelle-wordmark.svg`;

function SocialIcon({ name }: { name: "instagram" | "pinterest" }) {
  const paths: Record<typeof name, ReactNode> = {
    instagram: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.2" cy="6.8" r="0.7" fill="currentColor" stroke="none" />
      </>
    ),
    pinterest: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M10.2 18.2c.8-2.3 1.2-3.6 1.7-6.1-.7-1.4.1-3.6 1.5-3.6 1.1 0 1.6 1 1.6 2.1 0 1.3-.8 3.2-1.3 5-.4 1.5.8 2.7 2.2 2.7 2.7 0 4.2-3.5 4.2-6.2 0-3.4-2.8-6.1-6.9-6.1-4.9 0-7.8 3.6-7.8 7.3 0 1.4.4 2.8 1.4 3.7" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

export function SiteFooter() {
  const [status, setStatus] = useState("");
  const currentYear = new Date().getFullYear();

  const handleNewsletterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus(footerContent.newsletter.placeholderStatus);
  };

  const showPlaceholder = (label: string) => {
    setStatus(`${label} is coming soon.`);
  };

  return (
    <footer className={styles.footer} aria-labelledby="footer-brand">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <div className={styles.brand}>
          <a href="#main-content" aria-label={`${brand.accessibilityLabel}, return to the beginning`}>
            <Image
              src={logoPath}
              alt={brand.displayName}
              width={320}
              height={44}
              className={styles.logo}
            />
          </a>
          <h2 id="footer-brand" className="sr-only">
            {brand.displayName}
          </h2>
          <p>
            {footerContent.brandParagraph}
          </p>
        </div>

        <nav className={styles.navigation} aria-labelledby="footer-explore">
          <h3 id="footer-explore">{footerContent.exploreHeading}</h3>
          <ul>
            {closingExploreLinks.map((link) => (
              <li key={link.href}>
                <a href={`${basePath}/${link.href}`}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <nav className={styles.navigation} aria-labelledby="footer-care">
          <h3 id="footer-care">{footerContent.customerCareHeading}</h3>
          <ul>
            {customerCareItems.map((item) => (
              <li key={item.label}>
                <a href={`${basePath}${item.href}`}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.connected}>
          <h3>{footerContent.newsletter.heading}</h3>
          <p>{footerContent.newsletter.body}</p>
          <form onSubmit={handleNewsletterSubmit}>
            <label htmlFor="footer-email">{footerContent.newsletter.label}</label>
            <div className={styles.field}>
              <input
                id="footer-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder={footerContent.newsletter.placeholder}
              />
              <button
                type="submit"
                className="type-cta"
                aria-label={footerContent.newsletter.submitLabel}
              >
                <span>{footerContent.newsletter.cta}</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h13M13 7l5 5-5 5" />
                </svg>
              </button>
            </div>
          </form>
          <div className={styles.socials} aria-label={footerContent.socialLabel}>
            <button
              type="button"
              aria-label={`${brand.accessibilityLabel} on ${footerContent.socials.instagram} — coming soon`}
              title={`${footerContent.socials.instagram} — coming soon`}
              onClick={() => showPlaceholder(footerContent.socials.instagram)}
            >
              <SocialIcon name="instagram" />
            </button>
            <button
              type="button"
              aria-label={`${brand.accessibilityLabel} on ${footerContent.socials.pinterest} — coming soon`}
              title={`${footerContent.socials.pinterest} — coming soon`}
              onClick={() => showPlaceholder(footerContent.socials.pinterest)}
            >
              <SocialIcon name="pinterest" />
            </button>
          </div>
          <p className={styles.status} role="status" aria-live="polite">
            {status}
          </p>
        </div>
      </div>

      <div className={styles.legal}>
        <p>© {currentYear} {brand.displayName}</p>
        <span>{footerContent.legalLine}</span>
      </div>
    </footer>
  );
}

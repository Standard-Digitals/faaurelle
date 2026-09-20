import Image from "next/image";
import { closingExploreLinks, customerCareItems, footerContent } from "./closing.data";
import styles from "./SiteFooter.module.css";
import { brand } from "@/config/brand";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const logoPath = `${basePath}/images/brand/fa-aurelle-wordmark.svg`;

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

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
          <div className={styles.socials} aria-label={footerContent.socialLabel}>
            <a href={footerContent.socials.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label={`${brand.accessibilityLabel} on Instagram (opens in a new tab)`}>
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <rect x="4" y="4" width="16" height="16" rx="4" />
                <circle cx="12" cy="12" r="3.5" />
                <circle cx="17.2" cy="6.8" r="0.7" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>
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


      </div>

      <div className={styles.legal}>
        <p>© {currentYear} {brand.displayName}</p>
        <span>{footerContent.legalLine}</span>
      </div>
    </footer>
  );
}

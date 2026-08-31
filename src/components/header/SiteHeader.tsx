"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./SiteHeader.module.css";
import { brand } from "@/config/brand";
import {
  customerCareLabels,
  innerCircleLink,
  navigationAccessibility,
  primaryNavigationLinks,
} from "@/config/navigation";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const logoPath = `${basePath}/images/brand/fa-aurelle-wordmark.svg`;
const homeAnchor = (href: string) => `${basePath}/${href}`;

type IconName = "account" | "bag" | "close" | "menu" | "search";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, ReactNode> = {
    account: (
      <>
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.75 19c.65-3.2 2.75-5 6.25-5s5.6 1.8 6.25 5" />
      </>
    ),
    bag: (
      <>
        <path d="M5.5 8.25h13l-.65 11H6.15l-.65-11Z" />
        <path d="M9 9V6.5a3 3 0 0 1 6 0V9" />
      </>
    ),
    close: <path d="m6.25 6.25 11.5 11.5m0-11.5-11.5 11.5" />,
    menu: (
      <>
        <path d="M4 8h16" />
        <path d="M4 16h16" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="5.75" />
        <path d="m15 15 4.25 4.25" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[name]}
    </svg>
  );
}

function UtilityButton({
  icon,
  label,
  className,
}: {
  icon: Extract<IconName, "account" | "bag" | "search">;
  label: string;
  className?: string;
}) {
  return (
    <button type="button" className={className} aria-label={label} title={`${label} — coming soon`}>
      <Icon name={icon} />
    </button>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const openMenu = () => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setMenuOpen(true);
  };

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const bodyOverflow = document.body.style.overflow;
    const htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const focusFrame = requestAnimationFrame(() => closeButtonRef.current?.focus());
    const desktopQuery = window.matchMedia("(min-width: 1101px)");
    const handleViewportChange = () => {
      if (desktopQuery.matches) {
        closeMenu();
      }
    };
    const handleOrientationChange = () => closeMenu();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    desktopQuery.addEventListener("change", handleViewportChange);
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = htmlOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktopQuery.removeEventListener("change", handleViewportChange);
      window.removeEventListener("orientationchange", handleOrientationChange);
      restoreFocusRef.current?.focus();
    };
  }, [closeMenu, menuOpen]);

  const handlePlaceholder = () => closeMenu();

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <button
            ref={menuButtonRef}
            type="button"
            className={styles.menuTrigger}
            aria-label={navigationAccessibility.openMenu}
            aria-expanded={menuOpen}
            aria-controls="site-navigation-panel"
            onClick={openMenu}
          >
            <Icon name="menu" />
            <span>Menu</span>
          </button>

          <nav className={styles.primaryNavigation} aria-label={navigationAccessibility.primary}>
            {primaryNavigationLinks.map((link) => (
              <a key={link.href} href="">
                {link.label}
              </a>
            ))}
          </nav>

          <a className={styles.logo} href="" aria-label={`${brand.accessibilityLabel}, home`}>
            <Image src={logoPath} alt={brand.displayName} fill priority sizes="240px" />
          </a>

          <div className={styles.rightCluster}>
            <nav
              className={styles.secondaryNavigation}
              aria-label={navigationAccessibility.secondary}
            >
              <a href="">{innerCircleLink.label}</a>
              <button
                type="button"
                onClick={handlePlaceholder}
                title={`${customerCareLabels.contact} — coming soon`}
              >
                {customerCareLabels.contact}
              </button>
              <button
                type="button"
                onClick={handlePlaceholder}
                title={`${customerCareLabels.faq} — coming soon`}
              >
                {customerCareLabels.faq}
              </button>
            </nav>

            <div className={styles.utilities} aria-label={navigationAccessibility.utilities}>
              <UtilityButton
                icon="account"
                label={navigationAccessibility.account}
                className={styles.optionalUtility}
              />
              <UtilityButton icon="bag" label={navigationAccessibility.shoppingBag} />
            </div>
          </div>
        </div>
      </header>

      <div
        className={`${styles.mobileNavigation} ${menuOpen ? styles.mobileNavigationOpen : ""}`}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <button
          type="button"
          className={styles.backdrop}
          aria-label={navigationAccessibility.closeMenu}
          tabIndex={menuOpen ? 0 : -1}
          onClick={closeMenu}
        />
        <div
          ref={panelRef}
          id="site-navigation-panel"
          className={styles.panel}
          role="dialog"
          aria-modal="true"
          aria-label={navigationAccessibility.menu}
        >
          <div className={styles.panelHeader}>
            <Image src={logoPath} alt={brand.displayName} width={220} height={31} priority />
            <button
              ref={closeButtonRef}
              type="button"
              aria-label={navigationAccessibility.closeMenu}
              onClick={closeMenu}
            >
              <Icon name="close" />
            </button>
          </div>

          <nav className={styles.panelNavigation} aria-label={navigationAccessibility.mobile}>
            {[...primaryNavigationLinks, innerCircleLink].map((link, index) => (
              <a key={link.href} href="" onClick={closeMenu}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {link.label}
              </a>
            ))}
            <button type="button" onClick={handlePlaceholder}>
              <span>05</span>
              {customerCareLabels.contact}
            </button>
            <button type="button" onClick={handlePlaceholder}>
              <span>06</span>
              {customerCareLabels.faq}
            </button>
          </nav>

          <div className={styles.panelUtilities}>
            <UtilityButton icon="account" label={navigationAccessibility.account} />
            <UtilityButton icon="bag" label={navigationAccessibility.shoppingBag} />
          </div>
        </div>
      </div>
    </>
  );
}

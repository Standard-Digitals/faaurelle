import type { Metadata } from "next";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { SiteHeader } from "@/components/header/SiteHeader";
import { TrackOrderForm } from "./TrackOrderForm";
import styles from "./track-order.module.css";

/*
THESIS: Tracking is a calm handoff from one customer reference to a trustworthy shipment record, not a dashboard of invented progress.
OWN-WORLD: Pure white and warm ivory fields, ink typography, fine gold rules, square controls, and a chronological dispatch ledger.
STORY: Enter one Aurelle order reference, resolve its shipment safely, then read every available carrier scan in order.
FIRST VIEWPORT: A generous editorial introduction sits beside one precise lookup form; results replace the quiet guidance below.
FORM: Focused tracking desk, assigned structure 3, operate seed eca49416.
*/

export const metadata: Metadata = {
  title: "Track Order",
  description: "Track a FA ÀURELLE shipment using its Aurelle order reference.",
  robots: { index: true, follow: true },
};

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string | string[] }>;
}) {
  const requestedReference = (await searchParams).reference;
  const initialReference = typeof requestedReference === "string" ? requestedReference : "";
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.main}>
        <section className={styles.trackingDesk} aria-labelledby="track-order-title">
          <header className={styles.intro}>
            <p className={styles.kicker}>Shipment care</p>
            <h1 id="track-order-title">Track Order.</h1>
            <p>
              Enter the FA reference from your order confirmation. We’ll securely resolve the
              shipment and retrieve its latest carrier updates.
            </p>
          </header>
          <TrackOrderForm initialReference={initialReference} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

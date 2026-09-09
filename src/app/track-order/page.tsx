import type { Metadata } from "next";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { SiteHeader } from "@/components/header/SiteHeader";
import { TrackOrderForm } from "./TrackOrderForm";
import styles from "./track-order.module.css";

/*
THESIS: Tracking is a calm handoff from one carrier number to a trustworthy shipment record, not a dashboard of invented progress.
OWN-WORLD: Pure white and warm ivory fields, ink typography, fine gold rules, square controls, and a chronological dispatch ledger.
STORY: Enter one Delhivery waybill, see its current carrier-confirmed state, then read every available scan in order.
FIRST VIEWPORT: A generous editorial introduction sits beside one precise lookup form; results replace the quiet guidance below.
FORM: Focused tracking desk, assigned structure 3, operate seed eca49416.
*/

export const metadata: Metadata = {
  title: "Track Order",
  description: "Track a FA ÀURELLE shipment using its Delhivery AWB or waybill.",
  robots: { index: true, follow: true },
};

export default function TrackOrderPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.main}>
        <section className={styles.trackingDesk} aria-labelledby="track-order-title">
          <header className={styles.intro}>
            <p className={styles.kicker}>Shipment care</p>
            <h1 id="track-order-title">Track Order.</h1>
            <p>
              Enter the Delhivery AWB or waybill shared with your shipment. We’ll retrieve its
              latest carrier update and available scan history.
            </p>
          </header>
          <TrackOrderForm />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

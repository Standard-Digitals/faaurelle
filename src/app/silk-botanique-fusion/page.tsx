import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { InnerCircleSection } from "@/components/closing/InnerCircleSection";
import { SectionDivider } from "@/components/layout/SectionDivider";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { TrustDetailsSection } from "@/components/closing/TrustDetailsSection";
import { SiteHeader } from "@/components/header/SiteHeader";
import { SilkBotaniqueHero } from "./SilkBotaniqueHero";
import styles from "./SilkBotaniqueFusionPage.module.css";

export const metadata: Metadata = {
  title: "Silk Botanique Fusion",
  description:
    "Discover Silk Botanique Fusion™, FA ÀURELLE's blend of botanical oils and advanced shine-enhancing actives.",
};

const principles: Array<{ title: string; icon: ReactNode }> = [
  {
    title: "Silk Power",
    icon: <><path d="M3 16c4.2 0 4-8 8-8 3.1 0 3.4 5.6 6.3 5.6 1.4 0 2.2-1.2 3.7-3.2" /><path d="M4 20c4.7 0 4.7-8 9.2-8 3 0 3.5 4.6 6.8 4.6" /></>,
  },
  {
    title: "Clean Science",
    icon: <><path d="M9 3h6" /><path d="M10 3v5l-5 9a2.7 2.7 0 0 0 2.4 4h9.2a2.7 2.7 0 0 0 2.4-4l-5-9V3" /><path d="M7.5 15h9" /></>,
  },
  {
    title: "Pure Formula",
    icon: <><path d="M12 2.5c3.6 4.5 6.2 7.8 6.2 11.3A6.2 6.2 0 0 1 5.8 13.8C5.8 10.3 8.4 7 12 2.5Z" /><path d="M8.5 15.4c.8 1.8 2.1 2.6 4 2.4" /></>,
  },
  {
    title: "Safe & Effective",
    icon: <><path d="M12 3 5.5 6v5.2c0 4.3 2.6 7.7 6.5 9.8 3.9-2.1 6.5-5.5 6.5-9.8V6L12 3Z" /><path d="m8.7 12.2 2.1 2.1 4.6-4.8" /></>,
  },
  {
    title: "Silk-Infused Care",
    icon: <><path d="M5 19c6.2-.4 11-4.3 13-12-7.5.1-12.1 4.3-13 12Z" /><path d="M4 21c3.2-5.5 7.1-8.7 12.3-11.4" /></>,
  },
];

const sciencePoints = [
  "Smooth the cuticle for a refined finish",
  "Enhance light reflection for mirror-like shine",
  "Lock in softness and moisture",
  "Create a lightweight protective veil",
];

export default function SilkBotaniqueFusionPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.page}>
        <SilkBotaniqueHero />

        <section className={styles.principles} aria-label="Silk Botanique Fusion principles">
          {principles.map(({ title, icon }) => (
            <article key={title}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
              <h2>{title}</h2>
            </article>
          ))}
        </section>

        <SectionDivider />
        <section className={styles.science}>
          <div className={styles.scienceCopy}>
            <p className={styles.eyebrow}>The science behind our fusion</p>
            <h2>
              <span className={styles.headingLine}>Light, refined,</span>
              <span className={styles.headingLine}>high-performance.</span>
            </h2>
            <p>
              Healthy hair reflects light evenly. When hair becomes rough, dry, or affected by
              humidity, light scatters unevenly, causing dullness and loss of shine.
            </p>
            <ul>
              {sciencePoints.map((point) => <li key={point}>{point}</li>)}
            </ul>
            <p className={styles.result}>
              The result is hair that looks visibly smoother, feels silkier, and shines with
              exceptional brilliance.
            </p>
          </div>
        </section>

        <SectionDivider />
        <section className={styles.closing}>
          <div className={styles.closingVisual}>
            <Image
              src="/images/silk-botanique-fusion/fusion-hero.png"
              alt="Silk Botanique Fusion emblem"
              width={819}
              height={819}
              sizes="(max-width: 800px) 70vw, 24vw"
            />
          </div>
          <div className={styles.closingCopy}>
            <p className={styles.eyebrow}>The signature fusion</p>
            <h2>Silk. Botanicals. Brilliance.</h2>
            <p>Experience the perfect fusion of nature and science.</p>
            <div className={styles.closingBenefits}>
              <span>Mirror-Like Shine</span>
              <span>Silk-Touch Softness</span>
              <span>Frizz Control</span>
              <span>Weightless Elegance</span>
              <span>Humidity Defence</span>
            </div>
          </div>
        </section>
      </main>
      <InnerCircleSection />
      <TrustDetailsSection />
      <SiteFooter />
    </>
  );
}

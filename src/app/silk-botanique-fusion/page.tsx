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

const signatureBenefits = [
  { label: "Visible shine", path: "m9 3 1.6 5.4L16 10l-5.4 1.6L9 17l-1.6-5.4L2 10l5.4-1.6L9 3Zm10 10 .9 3.1L23 17l-3.1.9L19 21l-.9-3.1L15 17l3.1-.9L19 13Z" },
  { label: "Split end defense", path: "M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6l-7-3Zm-3.5 9 2.5 2.5 4.5-5" },
  { label: "Smoother texture", path: "M3 6c3-3 6 3 9 0s6 3 9 0M3 12c3-3 6 3 9 0s6 3 9 0M3 18c3-3 6 3 9 0s6 3 9 0" },
  { label: "Weightless elegance", path: "M6 3c-5 6 5 12 0 18M12 3c-5 6 5 12 0 18M18 3c-5 6 5 12 0 18" },
  { label: "Deep nourishment", path: "M5 19C4 9 10 4 20 3c0 10-5 17-15 16Zm-1 3L16 8" },
  { label: "Everyday luxury", path: "M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Zm-3.5 12a3.5 3.5 0 0 0 3.5 3.5" },
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
          <div className={styles.scienceBackdrop} aria-hidden="true">
            <Image
              src="/images/silk-botanique-fusion/light-refined-high-performance.png"
              alt=""
              width={1279}
              height={1600}
              sizes="100vw"
              unoptimized
            />
          </div>
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
        <section className={styles.smoothness} aria-labelledby="smoothness-title">
          <div className={styles.smoothnessCopy}>
            <h2 id="smoothness-title">The Art of Smoothness</h2>
            <p className={styles.smoothnessIntro}>Where actives meet every strand.</p>
            <p>
              Silk Botanique Fusion brings targeted actives and botanical conditioning together
              to help smooth the hair surface, reduce friction and enhance the way light reflects
              from each strand.
            </p>
            <p>
              As the formula spreads through the lengths, its conditioning agents help soften and
              smooth the feel of the cuticle, while lightweight botanical care helps support a more
              controlled, polished finish.
            </p>
            <dl>
              <div>
                <dt>Smooth the surface</dt>
                <dd>Helps reduce the rough feel that can contribute to frizz and flyaways.</dd>
              </div>
              <div>
                <dt>Reduce friction</dt>
                <dd>Helps strands glide more smoothly against one another for a softer, more manageable feel.</dd>
              </div>
              <div>
                <dt>Control frizz</dt>
                <dd>Helps tame the appearance of unruly strands and humidity-related frizz.</dd>
              </div>
              <div>
                <dt>Amplify shine</dt>
                <dd>A smoother hair surface allows light to reflect more evenly, creating a naturally luminous-looking finish.</dd>
              </div>
            </dl>
          </div>
          <div className={styles.smoothnessVisual}>
            <Image
              src="/images/silk-botanique-fusion/art-of-smoothness.jpeg"
              alt="Molecular structures over smooth, flowing brunette hair"
              width={1200}
              height={1268}
              sizes="(max-width: 900px) 100vw, 48vw"
            />
          </div>
        </section>

        <SectionDivider />
        <section className={styles.signature} aria-labelledby="signature-title">
          <div className={styles.signatureVisual}>
            <Image
              src="/images/silk-botanique-fusion/silk-botanicals-brilliance.jpeg"
              alt="Clear molecular spheres surrounding a pale golden serum capsule"
              width={1254}
              height={1254}
              sizes="(max-width: 900px) 100vw, 44vw"
            />
          </div>
          <div className={styles.signatureCopy}>
            <p className={styles.signatureEyebrow}>The signature fusion</p>
            <h2 id="signature-title">Silk. Botanicals. Brilliance.</h2>
            <p className={styles.signatureDescription}>
              Engineered to deliver visible care and timeless shine.
            </p>
            <ul className={styles.signatureBenefits}>
              {signatureBenefits.map(({ label, path }) => (
                <li key={label}>
                  <span className={styles.signatureIcon}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d={path} />
                    </svg>
                  </span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <InnerCircleSection />
      <TrustDetailsSection />
      <SiteFooter />
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { InnerCircleSection } from "@/components/closing/InnerCircleSection";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { TrustDetailsSection } from "@/components/closing/TrustDetailsSection";
import { SiteHeader } from "@/components/header/SiteHeader";
import { SectionDivider } from "@/components/layout/SectionDivider";
import { ProductShowcaseSection } from "@/components/product-showcase/ProductShowcaseSection";
import styles from "./ProductPage.module.css";
import { SignatureBenefitsCarousel } from "./SignatureBenefitsCarousel";

export const metadata: Metadata = {
  title: "Hair Elixir Oil-in-Serum",
  description:
    "Discover FA ÀURELLE Hair Elixir Oil-in-Serum for mirror-like shine, silk-touch softness, and weightless frizz control.",
};

const resultHighlights = [
  "Mirror-Like Shine",
  "Silk-Touch Softness",
  "Weightless Elegance",
  "Humidity Defence",
];

const silkKeys = [
  ["Argan Oil", "Deeply nourishes and enhances softness."],
  ["Jojoba Oil", "Supports smoothness and effortless manageability."],
  ["Camellia Oil", "Boosts natural shine and silky texture."],
  ["Vitamin E", "Provides antioxidant care for healthy-looking hair."],
];

export default function ProductPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.page}>
        <ProductShowcaseSection />
        <SectionDivider />

        <section className={styles.benefits} aria-labelledby="signature-benefits-title">
          <header className={styles.header}>
            <p>Why you’ll love it</p>
            <h1 id="signature-benefits-title">Signature Benefits</h1>
          </header>

          <SignatureBenefitsCarousel />
        </section>

        <SectionDivider />
        <section className={styles.result} aria-labelledby="product-result-title">
          <div className={styles.resultVisual}>
            <Image
              src="/images/hair-comparison/hair-after-shine-and-smooth.png"
              alt="Smooth, glossy hair displaying the FA ÀURELLE finish"
              fill
              sizes="(max-width: 800px) 100vw, 52vw"
            />
          </div>
          <div className={styles.resultCopy}>
            <p className={styles.eyebrow}>The result</p>
            <h2 id="product-result-title">
              <span>Silky. Radiant.</span>
              <span>Effortlessly You.</span>
            </h2>
            <p>
              Hair that feels exceptionally soft, looks luminous, and moves with natural
              elegance. Experience mirror-like shine, lasting smoothness, and a lightweight
              finish that enhances your hair’s beauty without weighing it down.
            </p>
            <div className={styles.resultHighlights}>
              {resultHighlights.map((highlight) => <span key={highlight}>{highlight}</span>)}
            </div>
          </div>
        </section>

        <SectionDivider />
        <section className={styles.powered} aria-labelledby="powered-title">
          <div className={styles.poweredCopy}>
            <p className={styles.eyebrow}>Powered by Silk Botanique Fusion™</p>
            <h2 id="powered-title">
              <span>Nature. Science.</span>
              <span>Silk. Perfected.</span>
            </h2>
            <p>
              An exclusive blend of botanical oils and advanced shine-enhancing actives that
              work in harmony to deliver exceptional smoothness, frizz control, and luminous,
              glass-like radiance. Designed to leave hair silky, refined, and effortlessly elegant.
            </p>
            <a href="/silk-botanique-fusion">Discover the fusion</a>
          </div>
          <div className={styles.poweredVisual}>
            <Image
              src="/images/about/difference.png"
              alt="Silk Botanique Fusion botanical oils"
              fill
              sizes="(max-width: 900px) 82vw, 30vw"
            />
          </div>
          <div className={styles.poweredKeys}>
            <h3>Silk Keys</h3>
            <div className={styles.silkKeys}>
              {silkKeys.map(([name, description]) => (
                <div key={name}>
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="m14.5 4.5 5 5-3 1.25-3.25 3.25.75 3.5-1.5 1.5-3.25-4.25L5 11.5 6.5 10l3.5.75 3.25-3.25 1.25-3Z" />
                    <path d="m9.25 14.75-4.5 4.5" />
                  </svg>
                  <p><strong>{name}</strong> – {description}</p>
                </div>
              ))}
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

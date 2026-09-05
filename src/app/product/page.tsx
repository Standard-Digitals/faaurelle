import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { TrustDetailsSection } from "@/components/closing/TrustDetailsSection";
import { SiteHeader } from "@/components/header/SiteHeader";
import { SectionDivider } from "@/components/layout/SectionDivider";
import { ProductShowcaseSection } from "@/components/product-showcase/ProductShowcaseSection";
import styles from "./ProductPage.module.css";

export const metadata: Metadata = {
  title: "Hair Elixir Oil-in-Serum",
  description:
    "Discover FA ÀURELLE Hair Elixir Oil-in-Serum for mirror-like shine, silk-touch softness, and weightless frizz control.",
};

const signatureBenefits: Array<{
  title: string;
  description: string;
  icon: ReactNode;
}> = [
  {
    title: "Instant Shine",
    description: "Boosts shine and mirror-like radiance instantly.",
    icon: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  },
  {
    title: "Frizz Control",
    description: "Helps tame flyaways and humidity-induced frizz.",
    icon: <><path d="M4 8c3.2 0 3.2-3 6.4-3s3.2 3 6.4 3S20 5 20 5" /><path d="M4 13c3.2 0 3.2-3 6.4-3s3.2 3 6.4 3S20 10 20 10" /><path d="M4 18c3.2 0 3.2-3 6.4-3s3.2 3 6.4 3S20 15 20 15" /></>,
  },
  {
    title: "Weightless Luxury",
    description: "Silky formula that won’t weigh hair down.",
    icon: <><path d="M5 19c6.2-.4 11-4.3 13-12-7.5.1-12.1 4.3-13 12Z" /><path d="M4 21c3.2-5.5 7.1-8.7 12.3-11.4" /></>,
  },
  {
    title: "Smooth & Soft",
    description: "Leaves hair feeling silky, soft, and beautifully refined.",
    icon: <><path d="M4 16.5C8 16.5 7.2 8 12 8s4 8.5 8 8.5" /><path d="M5 20c4.2 0 4.1-8.5 8.2-8.5 2.7 0 3.2 3.2 5.8 3.2" /></>,
  },
  {
    title: "Humidity Defence",
    description: "Helps defend against humidity for long-lasting smoothness.",
    icon: <><path d="M12 3 5.5 6v5.2c0 4.3 2.6 7.7 6.5 9.8 3.9-2.1 6.5-5.5 6.5-9.8V6L12 3Z" /><path d="M12 8.2c-1.5 2-2.3 3.2-2.3 4.4a2.3 2.3 0 0 0 4.6 0c0-1.2-.8-2.4-2.3-4.4Z" /></>,
  },
  {
    title: "All Hair Types",
    description: "Suitable for straight, wavy, curly, and coily hair.",
    icon: <><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" /></>,
  },
];

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

          <div className={styles.grid}>
            {signatureBenefits.map((benefit) => (
              <article key={benefit.title}>
                <div className={styles.icon}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">{benefit.icon}</svg>
                </div>
                <h2>{benefit.title}</h2>
                <p>{benefit.description}</p>
              </article>
            ))}
          </div>
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
            <h3>Silk Keys</h3>
            <div className={styles.silkKeys}>
              {silkKeys.map(([name, description]) => (
                <div key={name}>
                  <strong>{name}</strong>
                  <p>{description}</p>
                </div>
              ))}
            </div>
            <a href="/silk-botanique-fusion">Discover the fusion</a>
          </div>
          <div className={styles.poweredVisual}>
            <Image
              src="/images/products/best-seller-hair-elixir.png"
              alt="FA ÀURELLE Hair Elixir Oil-in-Serum"
              fill
              sizes="(max-width: 800px) 82vw, 42vw"
            />
          </div>
        </section>
      </main>
      <TrustDetailsSection />
      <SiteFooter />
    </>
  );
}

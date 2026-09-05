import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { TrustDetailsSection } from "@/components/closing/TrustDetailsSection";
import { SiteHeader } from "@/components/header/SiteHeader";
import styles from "./AboutPage.module.css";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Discover the science, botanicals, and performance philosophy behind FA ÀURELLE Hair Elixir.",
};

const benefits: Array<{ label: string; icon: ReactNode }> = [
  {
    label: "Mirror-like shine",
    icon: <><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  },
  {
    label: "Weightless feel",
    icon: <><path d="M6 19c5.8-.4 10.5-4.3 12-11-6.7.2-11.2 3.8-12 11Z" /><path d="M5 21c2.8-5.1 6.2-8 11-10.2" /></>,
  },
  {
    label: "Frizz control",
    icon: <><path d="M4 8c3.2 0 3.2-3 6.4-3s3.2 3 6.4 3S20 5 20 5" /><path d="M4 13c3.2 0 3.2-3 6.4-3s3.2 3 6.4 3S20 10 20 10" /><path d="M4 18c3.2 0 3.2-3 6.4-3s3.2 3 6.4 3S20 15 20 15" /></>,
  },
  {
    label: "Soft & smooth",
    icon: <><path d="M4 16.5C8 16.5 7.2 8 12 8s4 8.5 8 8.5" /><path d="M5 20c4.2 0 4.1-8.5 8.2-8.5 2.7 0 3.2 3.2 5.8 3.2" /></>,
  },
  {
    label: "Suitable for all",
    icon: <><circle cx="12" cy="8" r="3.25" /><path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" /></>,
  },
];

const shinePrinciples: Array<{ title: string; description: string; icon: ReactNode }> = [
  {
    title: "Refines hair surface",
    description: "Smooths and aligns the cuticle layer.",
    icon: <><path d="M4 8.5c3 0 3-2 6-2s3 2 6 2 3-2 4-2" /><path d="M4 12c3 0 3-2 6-2s3 2 6 2 3-2 4-2" /><path d="M4 15.5c3 0 3-2 6-2s3 2 6 2 3-2 4-2" /></>,
  },
  {
    title: "Enhances light reflection",
    description: "Helps hair reflect light evenly for exceptional brilliance.",
    icon: <><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" /></>,
  },
  {
    title: "Locks in softness",
    description: "Supports smoothness and a silky-touch finish.",
    icon: <><path d="M12 21s-7-4.2-7-10.2A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.8C19 16.8 12 21 12 21Z" /><path d="M8.5 12.3c1.6.2 2.6-.5 3.5-1.8" /></>,
  },
  {
    title: "Defends against humidity",
    description: "Helps tame frizz and flyaways throughout the day.",
    icon: <><path d="M12 3 5.5 6v5.2c0 4.3 2.6 7.7 6.5 9.8 3.9-2.1 6.5-5.5 6.5-9.8V6L12 3Z" /><path d="M12 8.2c-1.5 2-2.3 3.2-2.3 4.4a2.3 2.3 0 0 0 4.6 0c0-1.2-.8-2.4-2.3-4.4Z" /></>,
  },
];

const botanicals = [
  ["Argan oil", "Nourishes & softens", "/images/about/argan.png"],
  ["Jojoba oil", "Smooths & conditions", "/images/about/jojoba.png"],
  ["Camellia oil", "Enhances silky shine", "/images/about/camellia.png"],
];

const differences = [
  "Multi-dimensional shine",
  "Botanical-infused performance",
  "Frizz control",
  "Instant salon finish",
  "Weightless luxury",
  "Premium experience",
  "Designed for modern hair",
];

const formulaDetails = [
  {
    title: "Key actives",
    items: [
      "Argan Oil — deeply nourishes and enhances softness",
      "Jojoba Oil — supports smoothness and effortless manageability",
      "Camellia Oil — boosts natural shine and silky texture",
      "Vitamin E — provides antioxidant care for healthy-looking hair",
    ],
  },
  {
    title: "Free from",
    items: ["Heavy greasy residue", "Sticky finish", "Hair-weighing feel"],
  },
  {
    title: "Finish",
    items: ["Mirror-like shine", "Silk-touch softness", "Weightless elegance", "Humidity defence"],
  },
];

const moments = [
  "Before special occasions & celebrations",
  "After blow-drying or heat styling",
  "Reviving dull, lifeless hair",
  "Everyday luxury hair care ritual",
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.page}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>About</p>
            <h1>Where Nature Meets Science For Extraordinary Hair</h1>
            <p className={styles.heroDescription}>
              FA AURELLE is a luxurious hair elixir crafted to transform dull, frizzy hair into
              silky, luminous strands with mirror-like shine and effortless elegance. Powered by
              Silk Botanique Fusion™, it delivers a salon-finished look while preserving the
              natural movement and beauty of the hair.
            </p>
          </div>
          <div className={styles.heroVisual}>
            <Image
              src="/images/about/product-hero.jpeg"
              alt="FA ÀURELLE Hair Elixir with its presentation box"
              width={705}
              height={1536}
              priority
              sizes="(max-width: 800px) 100vw, 52vw"
            />
          </div>
        </section>

        <section className={styles.benefitStrip} aria-label="Product benefits">
          {benefits.map((benefit) => (
            <div key={benefit.label}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{benefit.icon}</svg>
              <p>{benefit.label}</p>
            </div>
          ))}
        </section>

        <section className={`${styles.section} ${styles.science}`}>
          <div className={styles.sectionCopy}>
            <p className={styles.eyebrow}>The science of</p>
            <h2>Shine</h2>
            <p className={styles.lead}>
              Beautiful hair reflects light evenly across its surface. When the cuticle becomes
              rough, light scatters unevenly, causing hair to appear dull and lifeless. <em>FA
              AURELLE</em> helps smooth the hair surface and enhance light reflection, revealing
              exceptional shine, softness, and a luminous glass-like finish.
            </p>
            <p>
              <em>FA AURELLE</em> helps refine the hair surface and enhance light reflection,
              creating a luminous, glass-like finish that makes hair appear smoother, healthier,
              and more radiant.
            </p>
            <div className={styles.principles}>
              {shinePrinciples.map(({ title, description, icon }) => (
                <article key={title}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">{icon}</svg>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.fusion}`}>
          <header className={styles.centeredHeader}>
            <p className={styles.eyebrow}>Silk Botanique Fusion</p>
            <h2>Nature. Science.<br />Silk. Perfected.</h2>
            <p>
              An exclusive blend of botanical oils and advanced shine-enhancing actives that
              smooth the hair surface, enhance light reflection, and deliver unparalleled
              softness and brilliance.
            </p>
          </header>
          <div className={styles.botanicalGrid}>
            {botanicals.map(([name, benefit, image]) => (
              <article key={name}>
                <div className={styles.botanicalImage}>
                  <Image src={image} alt="" fill sizes="(max-width: 700px) 90vw, 30vw" />
                </div>
                <p>{benefit}</p>
                <h3>{name}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.difference}`}>
          <div className={styles.differenceCopy}>
            <p className={styles.eyebrow}>The FA ÀURELLE difference</p>
            <h2>Crafted for performance.<br />Designed for elegance.</h2>
            <div className={styles.differenceList}>
              {differences.map((item, index) => (
                <div key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <p>{item}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.differenceVisual}>
            <Image
              src="/images/about/difference.png"
              alt="Golden serum drop infused with botanical oils"
              fill
              sizes="(max-width: 800px) 100vw, 48vw"
            />
          </div>
        </section>

        <section className={`${styles.section} ${styles.formula}`}>
          {formulaDetails.map((group) => (
            <article key={group.title}>
              <p className={styles.eyebrow}>{group.title}</p>
              <ul>
                {group.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          ))}
        </section>

        <section className={`${styles.section} ${styles.ritual}`}>
          <div className={styles.ritualVisual}>
            <Image
              src="/images/about/ritual.png"
              alt="Long, glossy hair representing the FA ÀURELLE finish"
              fill
              sizes="(max-width: 800px) 100vw, 50vw"
            />
          </div>
          <div className={styles.ritualCopy}>
            <p className={styles.eyebrow}>How to use</p>
            <h2>Made for every moment</h2>
            <ol>
              <li><span>01</span><p>Dispense a small amount into your palm.</p></li>
              <li><span>02</span><p>Warm gently between your hands.</p></li>
              <li><span>03</span><p>Smooth through mid-lengths and ends on dry or damp hair.</p></li>
            </ol>
            <div className={styles.moments}>
              {moments.map((moment) => <p key={moment}>{moment}</p>)}
            </div>
          </div>
        </section>
      </main>
      <TrustDetailsSection />
      <SiteFooter />
    </>
  );
}

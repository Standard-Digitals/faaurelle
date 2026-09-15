import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { BotanicalIngredientsSection } from "@/components/botanicals/BotanicalIngredientsSection";
import { InnerCircleSection } from "@/components/closing/InnerCircleSection";
import { SectionDivider } from "@/components/layout/SectionDivider";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { TrustDetailsSection } from "@/components/closing/TrustDetailsSection";
import { SiteHeader } from "@/components/header/SiteHeader";
import { AboutHero } from "./AboutHero";
import styles from "./AboutPage.module.css";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Discover the science, botanicals, and performance philosophy behind FA ÀURELLE Hair Elixir.",
};

const benefits: Array<{ label: string; icon: ReactNode }> = [
  {
    label: "Mirror-like shine",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
        <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
      </svg>
    ),
  },
  {
    label: "Weightless feel",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 19c5.8-.4 10.5-4.3 12-11-6.7.2-11.2 3.8-12 11Z" />
        <path d="M5 21c2.8-5.1 6.2-8 11-10.2" />
      </svg>
    ),
  },
  {
    label: "Frizz control",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.5S6.5 10 6.5 14.2a5.5 5.5 0 0 0 11 0C17.5 10 12 3.5 12 3.5Z" />
        <path d="M9.4 15.2a2.9 2.9 0 0 0 2.8 2.2" />
      </svg>
    ),
  },
  {
    label: "Soft & smooth",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 16.5C8 16.5 7.2 8 12 8s4 8.5 8 8.5" />
        <path d="M5 20c4.2 0 4.1-8.5 8.2-8.5 2.7 0 3.2 3.2 5.8 3.2" />
      </svg>
    ),
  },
  {
    label: "Suitable for all",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3.25" />
        <path d="M5.5 20c.7-4 2.9-6 6.5-6s5.8 2 6.5 6" />
      </svg>
    ),
  },
];

const botanicals = [
  {
    name: "Argan oil",
    description: "Nourishes & softens",
    image: "/images/ingredients/argan-oil.png",
  },
  {
    name: "Jojoba oil",
    description: "Smooths & conditions",
    image: "/images/ingredients/jojoba-oil.png",
  },
  {
    name: "Camellia oil",
    description: "Enhances silky shine",
    image: "/images/ingredients/camellia-oil.png",
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.page}>
        <AboutHero />

        <section className={styles.benefitStrip} aria-label="Product benefits">
          {benefits.map((benefit) => (
            <div key={benefit.label}>
              <span className={styles.benefitIcon}>{benefit.icon}</span>
              <p>{benefit.label}</p>
            </div>
          ))}
        </section>

        <SectionDivider />
        <section className={`${styles.section} ${styles.science}`} aria-labelledby="science-heading">
          <div className={styles.sectionCopy}>
            <h2 id="science-heading">The Science of Shine</h2>
            <p>It starts at the cuticle.</p>
            <p>
              Hair shine is a reflection of how light interacts with the hair surface. Damaged,
              lifted, and uneven cuticles scatter light, making hair appear dull, rough, and lifeless.
              <br />
              When the cuticle surface is refined, smoother, and more aligned, light reflects more
              evenly—creating the appearance of greater shine, softness, and smoothness.
              <br />
              FA AURELLE is designed to help refine the hair surface, transforming the look and feel
              of rough, unruly strands into a smoother, more polished finish.
            </p>
            <div className={styles.cuticleComparison}>
              <div>
                <h3>Damaged cuticles</h3>
                <p>Uneven surface → Scattered light → Dull appearance</p>
              </div>
              <div>
                <h3>Refined cuticles</h3>
                <p>Smoother surface → Even light reflection → Radiant shine</p>
              </div>
            </div>
          </div>
          <div className={styles.scienceVisual}>
            <Image
              src="/images/about/science-of-shine.png"
              alt="Magnified hair strands comparing a rough, lifted cuticle on the left with a smooth, aligned cuticle on the right"
              fill
              sizes="(max-width: 900px) 100vw, 48vw"
            />
          </div>
        </section>

        <SectionDivider />
        <section className={`${styles.section} ${styles.philosophy}`} aria-labelledby="philosophy-heading">
          <div className={styles.philosophyCopy}>
            <h2 id="philosophy-heading">Our Philosophy</h2>
            <p>Less Cover. More Care.</p>
            <p>
              At FA AURELLE, we believe truly beautiful hair doesn’t need to be hidden beneath
              layers of product—it needs the right care to reveal its natural potential.
            </p>
            <p>
              Our philosophy begins with understanding hair at its surface. When the hair cuticle
              is smoother and more aligned, it can reflect light more evenly, creating the
              appearance of greater shine, softness, and smoothness.
            </p>
            <p>That is why we focus on more than an instant glossy effect.</p>
          </div>
          <div className={styles.philosophyVisual}>
            <Image
              src="/images/about/our-philosophy.jpeg"
              alt="Long, smooth brunette hair with luminous highlights, viewed from behind"
              width={1279}
              height={1600}
              sizes="(max-width: 900px) 100vw, 40vw"
            />
          </div>
          <div className={styles.philosophyCopy}>
            <p>
              We strive to create hair care that refines, nourishes, protects, and enhances—turning
              everyday hair care into a sensorial ritual.
            </p>
            <p>
              We believe luxury isn’t about excess. It’s about precision, purpose, and beautifully
              considered details.
            </p>
            <p>
              From our formulations to the experience of using them, every element of FA AURELLE
              is created with one intention:
            </p>
            <p>To reveal the beauty that’s already there.</p>
          </div>
        </section>

        <SectionDivider />
        <BotanicalIngredientsSection
          eyebrow="Silk Botanique Fusion"
          heading={
            <>
              <span>Nature. Science.</span>
              <span>Silk. Perfected.</span>
            </>
          }
          description="An exclusive blend of botanical oils and advanced shine-enhancing actives that smooth the hair surface, enhance light reflection, and deliver unparalleled softness and brilliance."
          ingredients={botanicals}
        />

        <SectionDivider />
        <section className={`${styles.section} ${styles.precision}`} aria-labelledby="precision-title">
          <div className={styles.precisionCopy}>
            <h2 id="precision-title">Crafted with<br />precision</h2>
            <p className={styles.precisionLead}>To deliver the perfect drop.<br />Every time.</p>
            <p className={styles.precisionDescription}>
              Thoughtfully engineered for controlled and effortless application.
            </p>
            <ul className={styles.precisionBenefits}>
              <li>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Zm-3 12a3 3 0 0 0 3 3" /></svg>
                <span>Shine</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6c3-3 6 3 9 0s6 3 9 0M3 12c3-3 6 3 9 0s6 3 9 0M3 18c3-3 6 3 9 0s6 3 9 0" /></svg>
                <span>Smooth</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C4 9 10 4 20 3c0 10-5 17-15 16Zm-1 3L16 8" /></svg>
                <span>Nourish</span>
              </li>
            </ul>
          </div>
          <div className={styles.precisionVisual}>
            <div className={styles.precisionAssembly}>
              <div className={styles.precisionPump}>
                <Image src="/images/about/crafted-with-precision-pump.png" alt="Separated black pump head and gold collar" fill sizes="(max-width: 800px) 28vw, 20vw" />
              </div>
              <div className={styles.precisionMechanism}>
                <Image src="/images/about/crafted-with-precision-mechanism.png" alt="Internal dispensing spring and pump mechanism" fill sizes="(max-width: 800px) 35vw, 25vw" />
              </div>
              <div className={styles.precisionBottle}>
                <Image src="/images/about/crafted-with-precision-bottle.png" alt="FA ÀURELLE Hair Elixir bottle" fill sizes="(max-width: 800px) 45vw, 34vw" />
              </div>
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

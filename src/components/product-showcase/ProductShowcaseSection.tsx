"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import styles from "./ProductShowcaseSection.module.css";
import { productShowcase, productShowcaseImage } from "./product-showcase.data";

function Checkmark() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path d="m3.2 9.4 3.4 3.4 8.2-8.1" />
    </svg>
  );
}

export function ProductShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    const context = gsap.context(() => {
      const image = section.querySelector<HTMLElement>("[data-showcase-image]");
      const entranceItems = gsap.utils.toArray<HTMLElement>("[data-showcase-entrance]");
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        let hasEntered = false;
        let entranceTimeline: gsap.core.Timeline | undefined;
        gsap.set(image, { autoAlpha: 0, y: 28, scale: 0.96 });
        gsap.set(entranceItems, { autoAlpha: 0, y: 18 });

        const observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting || hasEntered) {
              return;
            }
            hasEntered = true;
            entranceTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
            entranceTimeline.to(image, { autoAlpha: 1, y: 0, scale: 1, duration: 1.15 }, 0);
            entranceItems.forEach((item, index) => {
              entranceTimeline?.to(
                item,
                { autoAlpha: 1, y: 0, duration: 0.62 },
                0.12 + index * 0.1,
              );
            });
            observer.disconnect();
          },
          { threshold: 0.25 },
        );
        observer.observe(section);

        return () => {
          observer.disconnect();
          entranceTimeline?.kill();
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(image, { autoAlpha: 1, y: 0, scale: 1 });
        gsap.set(entranceItems, { autoAlpha: 1, y: 0 });
      });

      return () => media.revert();
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section
      id="discover"
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="product-showcase-title"
    >
      <div className={styles.composition}>
        <div className={styles.galleryColumn}>
          <div className={styles.galleryStage}>
            <figure className={styles.productFigure} data-showcase-image>
              <Image
                src={`${basePath}${productShowcaseImage.image}`}
                alt={productShowcaseImage.alt}
                fill
                sizes="(max-width: 767px) 82vw, (max-width: 1100px) 48vw, 42vw"
                className={styles.productImage}
              />
            </figure>
          </div>
        </div>

        <div className={styles.productContent}>
          <p className={`${styles.eyebrow} type-eyebrow`} data-showcase-entrance>
            <span aria-hidden="true" />
            {productShowcase.eyebrow}
          </p>
          <h2
            id="product-showcase-title"
            className="type-editorial-heading"
            data-showcase-entrance
          >
            {productShowcase.name}
          </h2>
          <p className={`${styles.tagline} type-body`} data-showcase-entrance>
            {productShowcase.tagline}
          </p>
          <div
            className={styles.rating}
            aria-label={`Rated ${productShowcase.rating}`}
            data-showcase-entrance
          >
            <span className={styles.stars} aria-hidden="true">
              ★★★★★
            </span>
            <span>{productShowcase.rating}</span>
          </div>

          <ul className={styles.benefits} data-showcase-entrance>
            {productShowcase.benefits.map((benefit) => (
              <li key={benefit}>
                <Checkmark />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>

          <span className={styles.contentDivider} aria-hidden="true" data-showcase-entrance />

          <div className={styles.purchase} data-showcase-entrance>
            <div className={styles.priceBlock}>
              <p>{productShowcase.price}</p>
              <span>{productShowcase.taxNote}</span>
            </div>
            <span className={styles.purchaseRule} aria-hidden="true" />
          </div>

          <div className={styles.actions} data-showcase-entrance>
            {/* Commerce actions remain presentational until cart and checkout infrastructure exists. */}
            <button type="button" className={`${styles.addToCartButton} type-cta`}>
              {productShowcase.actions.addToCart}
            </button>
            <button type="button" className={`${styles.buyNowButton} type-cta`}>
              {productShowcase.actions.buyNow}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

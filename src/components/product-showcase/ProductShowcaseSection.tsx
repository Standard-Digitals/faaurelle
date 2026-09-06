"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
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
  const galleryRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const gallery = galleryRef.current;
    const content = contentRef.current;

    if (!section || !gallery || !content) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const travel = () => window.innerWidth + Math.max(gallery.offsetWidth, content.offsetWidth);

      gsap
        .timeline({
          defaults: { duration: 1.15, ease: "power4.out" },
          onComplete: () =>
            gsap.set([gallery, content], { clearProps: "transform,opacity,visibility" }),
        })
        .fromTo(content, { x: () => -travel(), autoAlpha: 0 }, { x: 0, autoAlpha: 1 }, 0)
        .fromTo(gallery, { x: () => travel(), autoAlpha: 0 }, { x: 0, autoAlpha: 1 }, 0.08);
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
        <div ref={galleryRef} className={styles.galleryColumn}>
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

        <div ref={contentRef} className={styles.productContent}>
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

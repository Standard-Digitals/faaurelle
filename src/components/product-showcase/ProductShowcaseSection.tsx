"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import styles from "./ProductShowcaseSection.module.css";
import { productShowcase, productShowcaseImages } from "./product-showcase.data";

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
  const sliderRef = useRef<HTMLDivElement>(null);
  const [activeImage, setActiveImage] = useState(0);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  const showImage = useCallback((index: number) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const next = (index + productShowcaseImages.length) % productShowcaseImages.length;
    slider.scrollTo({
      left: next * slider.clientWidth,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const gallery = galleryRef.current;
      if (!gallery || document.hidden || gallery.matches(":hover") || gallery.contains(document.activeElement)) return;
      const bounds = gallery.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      showImage(activeImage + 1);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [activeImage, showImage]);

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
          <div className={styles.galleryStage} role="region" aria-roledescription="carousel" aria-label="Hair Elixir photographs">
            <div ref={sliderRef} className={styles.slider} tabIndex={0} aria-label="Product images. Use left and right arrow keys to browse."
              onScroll={(event) => {
                const slider = event.currentTarget;
                setActiveImage(Math.round(slider.scrollLeft / slider.clientWidth));
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  showImage(activeImage + (event.key === "ArrowRight" ? 1 : -1));
                }
              }}>
            {productShowcaseImages.map((photo, index) => (
            <figure key={photo.image} className={styles.productFigure} data-showcase-image role="group" aria-roledescription="slide" aria-label={`${index + 1} of ${productShowcaseImages.length}`}>
              <Image
                src={`${basePath}${photo.image}`}
                alt={photo.alt}
                fill
                sizes="(max-width: 767px) 82vw, (max-width: 1100px) 48vw, 42vw"
                className={styles.productImage}
              />
            </figure>
            ))}
            </div>
            <div className={styles.galleryControls}>
              <button type="button" onClick={() => showImage(activeImage - 1)} aria-label="Previous image">←</button>
              <div className={styles.imageSelectors}>
                {productShowcaseImages.map((photo, index) => (
                  <button type="button" key={photo.image} onClick={() => showImage(index)} aria-label={`Show image ${index + 1}: ${photo.alt}`} aria-pressed={activeImage === index}>
                    <Image src={`${basePath}${photo.image}`} alt="" width={44} height={52} />
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => showImage(activeImage + 1)} aria-label="Next image">→</button>
              <span className="sr-only" aria-live="off">Image {activeImage + 1} of {productShowcaseImages.length}</span>
            </div>
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

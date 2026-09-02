"use client";

import Image from "next/image";
import gsap from "gsap";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import styles from "./TestimonialSection.module.css";
import { testimonialContent, testimonials } from "./testimonials.data";
import { product } from "@/config/product";

const DRAG_THRESHOLD = 42;
const FLICK_VELOCITY = 0.35;

type DragState = {
  pointerId: number;
  startX: number;
  startTime: number;
};

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d={
          direction === "previous"
            ? "m12.5 4.5-5.5 5.5 5.5 5.5"
            : "m7.5 4.5 5.5 5.5-5.5 5.5"
        }
      />
    </svg>
  );
}

export function TestimonialSection() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const activeIndexRef = useRef(0);
  const dragRef = useRef<DragState | null>(null);
  const directionRef = useRef(1);
  const hasNavigatedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const activeTestimonial = testimonials[activeIndex];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const context = gsap.context(() => {
      const reducedQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      reducedMotionRef.current = reducedQuery.matches;
      const updateReducedMotion = () => {
        reducedMotionRef.current = reducedQuery.matches;
      };
      reducedQuery.addEventListener("change", updateReducedMotion);

      let observer: IntersectionObserver | undefined;
      if (reducedQuery.matches) {
        gsap.set("[data-testimonial-entrance]", { autoAlpha: 1, y: 0 });
      } else {
        const entrance = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
        entrance
          .from("[data-testimonial-heading-group]", {
            autoAlpha: 0,
            y: 12,
            duration: 0.48,
          })
          .from("[data-testimonial-product]", {
            autoAlpha: 0,
            y: 16,
            duration: 0.58,
          }, "-=0.28")
          .from("[data-testimonial-review]", {
            autoAlpha: 0,
            y: 14,
            duration: 0.5,
          }, "-=0.4")
          .from("[data-testimonial-controls]", {
            autoAlpha: 0,
            y: 8,
            duration: 0.34,
          }, "-=0.28");

        observer = new IntersectionObserver(
          ([entry]) => {
            if (!entry.isIntersecting) return;
            entrance.play();
            observer?.disconnect();
          },
          { threshold: 0.16 },
        );
        observer.observe(section);
      }

      return () => {
        observer?.disconnect();
        reducedQuery.removeEventListener("change", updateReducedMotion);
      };
    }, section);

    return () => context.revert();
  }, []);

  useEffect(() => {
    const article = articleRef.current;
    if (!article || !hasNavigatedRef.current) return;
    if (reducedMotionRef.current) {
      gsap.set(article, { x: 0, autoAlpha: 1 });
      return;
    }

    gsap.fromTo(
      article,
      { x: directionRef.current * 16, autoAlpha: 0.25 },
      { x: 0, autoAlpha: 1, duration: 0.28, ease: "power3.out", overwrite: "auto" },
    );
  }, [activeIndex]);

  const navigateTo = useCallback((nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(testimonials.length - 1, nextIndex));
    const currentIndex = activeIndexRef.current;
    if (boundedIndex === currentIndex) {
      if (articleRef.current) {
        gsap.to(articleRef.current, {
          x: 0,
          autoAlpha: 1,
          duration: reducedMotionRef.current ? 0 : 0.2,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
      return;
    }

    directionRef.current = boundedIndex > currentIndex ? 1 : -1;
    hasNavigatedRef.current = true;
    activeIndexRef.current = boundedIndex;
    setActiveIndex(boundedIndex);
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigateTo(activeIndexRef.current - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      navigateTo(activeIndexRef.current + 1);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current || event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startTime: performance.now(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const article = articleRef.current;
    if (!drag || !article || drag.pointerId !== event.pointerId) return;

    let distance = event.clientX - drag.startX;
    const atStart = activeIndexRef.current === 0 && distance > 0;
    const atEnd = activeIndexRef.current === testimonials.length - 1 && distance < 0;
    if (atStart || atEnd) distance *= 0.32;
    gsap.set(article, {
      x: distance * 0.44,
      opacity: Math.max(0.58, 1 - Math.abs(distance) / 420),
    });
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = event.clientX - drag.startX;
    const elapsed = Math.max(1, performance.now() - drag.startTime);
    const velocity = Math.abs(distance) / elapsed;
    const shouldMove = Math.abs(distance) >= DRAG_THRESHOLD || velocity >= FLICK_VELOCITY;
    const direction = distance < 0 ? 1 : -1;
    dragRef.current = null;
    setIsDragging(false);
    navigateTo(activeIndexRef.current + (shouldMove ? direction : 0));
  };

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      aria-labelledby="customer-stories-title"
    >
      <div className={styles.shell}>
        <header
          className={styles.header}
          data-testimonial-heading-group
          data-testimonial-entrance
        >
          <p className={`${styles.eyebrow} type-eyebrow`}>{testimonialContent.eyebrow}</p>
          <h2 id="customer-stories-title" className="type-section-heading">
            {testimonialContent.heading.leading}{" "}
            <em>{testimonialContent.heading.emphasis}</em>
          </h2>
          <p className={`${styles.intro} type-body`}>{testimonialContent.body}</p>
        </header>

        <div className={styles.editorialLayout}>
          <div data-testimonial-product data-testimonial-entrance>
            <figure className={styles.productScene}>
              <Image
                src={`${basePath}/images/products/best-seller-hair-elixir.png`}
                alt={product.altText}
                fill
                sizes="(max-width: 767px) calc(100vw - 2.5rem), (max-width: 1100px) 48vw, 42vw"
                className={styles.productImage}
              />
            </figure>
          </div>

          <div className={styles.testimonialPanel}>
            <div
              ref={viewportRef}
              className={`${styles.testimonialViewport} ${isDragging ? styles.isDragging : ""}`}
              role="region"
              aria-roledescription="carousel"
              aria-label={`${product.accessibilityLabel} customer testimonials`}
              aria-describedby="testimonial-status"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
              data-testimonial-review
              data-testimonial-entrance
            >
              <article
                ref={articleRef}
                className={styles.activeTestimonial}
                aria-label={`Testimonial ${activeIndex + 1} of ${testimonials.length}`}
              >
                <div className={styles.rating}>
                  <span aria-label={`${activeTestimonial.rating} out of 5 stars`}>
                    <i aria-hidden="true">★★★★★</i>
                  </span>
                  {activeTestimonial.verified ? (
                    <small>Verified customer</small>
                  ) : null}
                </div>

                <blockquote className="type-quote">“{activeTestimonial.quote}”</blockquote>

                <footer className={styles.customerRow}>
                  <span className={styles.monogram} aria-hidden="true">
                    {activeTestimonial.initials}
                  </span>
                  <div className={styles.customer}>
                    <cite>{activeTestimonial.name}</cite>
                    <span>{activeTestimonial.profile}</span>
                  </div>
                  <span className={styles.tag}>{activeTestimonial.tag}</span>
                </footer>
              </article>
            </div>

            <div
              className={styles.controls}
              data-testimonial-controls
              data-testimonial-entrance
            >
              <div className={styles.navigation}>
                <button
                  type="button"
                  aria-label="Previous testimonial"
                  disabled={activeIndex === 0}
                  onClick={() => navigateTo(activeIndex - 1)}
                >
                  <ArrowIcon direction="previous" />
                </button>
                <button
                  type="button"
                  aria-label="Next testimonial"
                  disabled={activeIndex === testimonials.length - 1}
                  onClick={() => navigateTo(activeIndex + 1)}
                >
                  <ArrowIcon direction="next" />
                </button>
              </div>

              <div
                className={styles.progress}
                role="group"
                aria-label="Choose a testimonial"
              >
                {testimonials.map((testimonial, index) => (
                  <button
                    key={testimonial.name}
                    type="button"
                    className={index === activeIndex ? styles.activeProgress : ""}
                    aria-label={`Show testimonial ${index + 1} of ${testimonials.length}: ${testimonial.name}`}
                    aria-current={index === activeIndex ? "true" : undefined}
                    onClick={() => navigateTo(index)}
                  >
                    <span />
                  </button>
                ))}
              </div>

              <p
                id="testimonial-status"
                className={styles.status}
                aria-live="polite"
                aria-atomic="true"
              >
                <span>{String(activeIndex + 1).padStart(2, "0")}</span>
                <i aria-hidden="true" />
                <span className="sr-only">of</span>
                {String(testimonials.length).padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

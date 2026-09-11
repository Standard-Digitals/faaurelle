"use client";

import { gsap } from "gsap";
import { useEffect, useLayoutEffect, useRef } from "react";
import styles from "./SilkBotaniqueFusionPage.module.css";

export function SilkBotaniqueHero() {
  const rootRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const copy = copyRef.current;
    const visual = visualRef.current;

    if (!root || !copy || !visual) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const context = gsap.context(() => {
      const travel = () => window.innerWidth + Math.max(copy.offsetWidth, visual.offsetWidth);

      gsap
        .timeline({
          defaults: { duration: 1.15, ease: "power4.out" },
          onComplete: () => gsap.set([copy, visual], { clearProps: "transform,opacity,visibility" }),
        })
        .fromTo(copy, { x: () => -travel(), autoAlpha: 0 }, { x: 0, autoAlpha: 1 }, 0)
        .fromTo(visual, { x: () => travel(), autoAlpha: 0 }, { x: 0, autoAlpha: 1 }, 0.08);
    }, root);

    return () => context.revert();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      video.pause();
      return;
    }

    let isVisible = true;
    const syncPlayback = () => {
      if (document.hidden || !isVisible || video.ended) {
        video.pause();
        return;
      }

      void video.play().catch(() => undefined);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        syncPlayback();
      },
      { threshold: 0.1 },
    );

    observer.observe(video);
    document.addEventListener("visibilitychange", syncPlayback);
    syncPlayback();

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      video.pause();
    };
  }, []);

  return (
    <section ref={rootRef} className={styles.hero}>
      <div ref={copyRef} className={styles.heroCopy}>
        <p className={styles.eyebrow}>The heart of FA ÀURELLE</p>
        <h1>
          Nature. Science.
          <br />
          Luxurious Shine.
        </h1>
        <p className={styles.lead}>
          Silk Botanique Fusion™ is an exclusive blend of botanical oils and advanced
          shine-enhancing actives designed to transform dull, frizzy hair into silky, luminous
          strands with exceptional radiance.
        </p>
        <p>
          Inspired by the elegance of silk and the restorative power of nature, this lightweight
          fusion smooths the hair surface, enhances light reflection, and helps create a refined,
          glass-like finish without heaviness.
        </p>
      </div>
      <div ref={visualRef} className={styles.heroVisual}>
        <video
          ref={videoRef}
          className={styles.heroVideo}
          autoPlay
          muted
          playsInline
          preload="metadata"
          poster="/images/silk-botanique-fusion/fusion-hero-poster.jpg"
          aria-hidden="true"
        >
          <source src="/images/silk-botanique-fusion/fusion-hero-loop.mp4" type="video/mp4" />
        </video>
      </div>
    </section>
  );
}

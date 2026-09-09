"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import styles from "./AboutPage.module.css";

export function AboutHero() {
  const rootRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const copy = copyRef.current;
    const visual = visualRef.current;

    if (!root || !copy || !visual) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

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

  return (
    <section ref={rootRef} className={styles.hero}>
      <div ref={copyRef} className={styles.heroCopy}>
        <p className={styles.eyebrow}>About</p>
        <h1>
          <span className={styles.headingLine}>Where Nature Meets</span>
          <span className={styles.headingLine}>Science For</span>
          <span className={styles.headingLine}>Extraordinary Hair</span>
        </h1>
        <p className={styles.heroDescription}>
          FA AURELLE is a luxurious hair elixir crafted to transform dull, frizzy hair into silky,
          luminous strands with mirror-like shine and effortless elegance. Powered by Silk
          Botanique Fusion™, it delivers a salon-finished look while preserving the natural
          movement and beauty of the hair.
        </p>
      </div>
      <div ref={visualRef} className={styles.heroVisual}>
        <Image
          src="/images/products/elixir-bottle-and-box.jpeg"
          alt="FA ÀURELLE Hair Elixir with its presentation box"
          width={1145}
          height={1374}
          priority
          sizes="(max-width: 800px) 100vw, 52vw"
        />
      </div>
    </section>
  );
}

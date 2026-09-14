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
    <section ref={rootRef} className={styles.hero} aria-labelledby="founder-story-heading">
      <div ref={copyRef} className={styles.heroCopy}>
        <h1 id="founder-story-heading">Our Founder Story</h1>
        <div className={styles.heroDescription}>
          <p>FA AURELLE began with a simple belief: beautiful hair should feel as good as it looks.</p>
          <p>
            For our founder, the idea started with something familiar—the daily struggle with hair
            that looked dry, frizzy, or lacked the shine it once had. There were countless products
            promising instant transformation, yet many seemed focused on covering the problem
            rather than understanding the hair itself.
          </p>
          <p>That sparked a question:</p>
          <p>What if shine wasn’t something we simply added, but something we could help reveal?</p>
          <p>The journey behind FA AURELLE began with that thought.</p>
          <p>
            We looked beyond temporary gloss and explored the relationship between the hair surface,
            smoothness, and the way light interacts with each strand. This led to a philosophy centred
            around refining the hair surface, enhancing light reflection, and creating a beautifully
            smooth finish.
          </p>
          <p>
            FA AURELLE was created to bring that philosophy into an everyday ritual—combining
            thoughtful formulation with a refined, luxurious experience.
          </p>
          <p>Because for us, hair care isn’t about chasing perfection.</p>
          <p>It’s about helping your hair look smooth, radiant, soft, and beautifully you.</p>
        </div>
      </div>
      <div ref={visualRef} className={styles.heroVisual}>
        <Image
          src="/images/about/our-founder-story.jpeg"
          alt="FA ÀURELLE founder holding the Hair Elixir"
          width={799}
          height={1280}
          priority
          sizes="(max-width: 900px) 100vw, 34vw"
        />
      </div>
    </section>
  );
}

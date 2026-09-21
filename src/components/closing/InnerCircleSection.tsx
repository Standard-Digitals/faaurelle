"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./InnerCircleSection.module.css";
import { innerCircleContent } from "./closing.data";

export function InnerCircleSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        setEntered(true);
        observer.disconnect();
      },
      { threshold: 0.2 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="inner-circle"
      ref={sectionRef}
      className={`${styles.section} ${entered ? styles.entered : ""}`}
      aria-labelledby="inner-circle-title"
    >
      <div className={styles.illumination} aria-hidden="true" />

      <div className={styles.composition}>
        <div className={styles.introduction}>
          <p className={`${styles.eyebrow} type-eyebrow`}>{innerCircleContent.eyebrow}</p>
          <h2 id="inner-circle-title" className="type-editorial-heading">
            {innerCircleContent.heading}
          </h2>
        </div>

        <ul className={styles.benefits} aria-label={innerCircleContent.benefitsLabel}>
          {innerCircleContent.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
        </ul>

        <div className={styles.action}>
          <Link
            href="/about"
            className={`${styles.cta} type-cta`}
          >
            <span>{innerCircleContent.cta}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h13M13 7l5 5-5 5" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

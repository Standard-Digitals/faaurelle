"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import styles from "./CommunityShowcaseSection.module.css";
import {
  communityRows,
  communityShowcaseContent,
  type CommunityImage,
} from "./community-showcase.data";

function ImageSequence({ images }: { images: readonly CommunityImage[] }) {
  return (
    <div className={styles.sequence} aria-hidden="true">
      {images.map((image) => (
        <figure key={image.src} className={`${styles.tile} ${styles[image.shape]}`}>
          <Image
            src={image.src}
            alt=""
            fill
            sizes="(max-width: 767px) 68vw, (max-width: 1100px) 34vw, 25vw"
            className={styles.image}
          />
        </figure>
      ))}
    </div>
  );
}

export function CommunityShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const hasEnteredRef = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    let isIntersecting = false;
    const updateActivity = () => {
      setIsActive(isIntersecting && !document.hidden);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        if (entry.isIntersecting && !hasEnteredRef.current) {
          hasEnteredRef.current = true;
          setHasEntered(true);
        }
        updateActivity();
      },
      { threshold: 0.12 },
    );
    const handleVisibilityChange = () => updateActivity();

    observer.observe(section);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className={[styles.section, isActive ? styles.isActive : ""].join(" ")}
      aria-labelledby="community-showcase-title"
    >
      <div className={styles.collage} aria-hidden="true">
        {communityRows.map((row) => (
          <div key={row.id} className={`${styles.row} ${styles[row.id]}`}>
            <div
              className={`${styles.track} ${styles[row.direction]}`}
              style={{ animationDuration: `${row.duration}s` }}
            >
              <ImageSequence images={row.images} />
              <ImageSequence images={row.images} />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.opticalOverlay} aria-hidden="true" />
      <div className={styles.vignette} aria-hidden="true" />

      <div className={`${styles.content} ${hasEntered ? styles.contentEntered : ""}`}>
        <p className={`${styles.eyebrow} type-eyebrow`}>{communityShowcaseContent.eyebrow}</p>
        <h2 id="community-showcase-title" className="type-section-heading">
          {communityShowcaseContent.heading.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h2>
        <p className={`${styles.body} type-body-large`}>{communityShowcaseContent.body}</p>
        {/* Destination wiring is deferred until an approved ritual destination exists. */}
        <button type="button" className={`${styles.cta} type-cta`}>
          {communityShowcaseContent.cta}
        </button>
      </div>
    </section>
  );
}

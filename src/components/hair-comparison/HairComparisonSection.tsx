"use client";

import Image from "next/image";
import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { hairComparisonContent as content } from "./hair-comparison.data";
import styles from "./HairComparisonSection.module.css";

export function HairComparisonSection() {
  const [position, setPosition] = useState(50);

  const updatePositionFromPointer = (event: ReactPointerEvent<HTMLInputElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const nextPosition = ((event.clientX - bounds.left) / bounds.width) * 100;
    setPosition(Math.min(100, Math.max(0, nextPosition)));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLInputElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePositionFromPointer(event);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLInputElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      updatePositionFromPointer(event);
    }
  };

  return (
    <section
      id="transformations"
      className={styles.section}
      aria-labelledby="hair-comparison-title"
    >
      <h2 id="hair-comparison-title" className="sr-only">
        {content.heading}
      </h2>
      <div className={styles.container}>
        <div className={styles.comparison}>
          <div className={styles.visualLayer}>
            <Image
              src={content.after.image.src}
              alt={content.after.image.alt}
              fill
              sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1440px) calc(100vw - 5rem), 88rem"
              className={styles.image}
            />
          </div>

          <div
            className={styles.beforeLayer}
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          >
            <div className={styles.visualLayer}>
              <Image
                src={content.before.image.src}
                alt={content.before.image.alt}
                fill
                sizes="(max-width: 767px) calc(100vw - 2rem), (max-width: 1440px) calc(100vw - 5rem), 88rem"
                className={styles.image}
              />
            </div>
          </div>

          <input
            className={styles.range}
            type="range"
            min="0"
            max="100"
            step="1"
            value={position}
            aria-label={content.sliderLabel}
            aria-valuetext={`${Math.round(position)}% before and ${Math.round(100 - position)}% after`}
            onChange={(event) => setPosition(Number(event.currentTarget.value))}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
          />

          <div className={styles.divider} style={{ left: `${position}%` }} aria-hidden="true">
            <span className={styles.handle}>
              <span className={styles.arrow}>‹</span>
              <span className={styles.handleBar} />
              <span className={styles.arrow}>›</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

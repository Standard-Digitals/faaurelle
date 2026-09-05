"use client";

import { useEffect, useRef } from "react";
import styles from "./SectionDivider.module.css";

export function SectionDivider() {
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const divider = dividerRef.current;
    if (!divider) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        divider.dataset.visible = "true";
        observer.disconnect();
      },
      { threshold: 0.35 },
    );

    observer.observe(divider);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={dividerRef} className={styles.divider} aria-hidden="true">
      <span />
    </div>
  );
}

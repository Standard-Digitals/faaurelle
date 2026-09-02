"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { trustContent, trustDetails } from "./closing.data";
import styles from "./TrustDetailsSection.module.css";

function TrustIcon({ id }: { id: (typeof trustDetails)[number]["id"] }) {
  const paths: Record<typeof id, ReactNode> = {
    shipping: (
      <>
        <path d="M3.5 7.5h10v9h-10zM13.5 10.5h3.2l3 3v3h-6.2z" />
        <circle cx="7" cy="18" r="1.5" />
        <circle cx="17" cy="18" r="1.5" />
      </>
    ),
    payment: (
      <>
        <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
        <path d="M3.5 9.5h17M7 14h3" />
      </>
    ),
    returns: (
      <>
        <path d="M7.5 8H18v10H6V11" />
        <path d="m8 4-4 4 4 4" />
      </>
    ),
    quality: (
      <>
        <path d="M12 3.5 14.2 8l4.8.7-3.5 3.4.8 4.9-4.3-2.3L7.7 17l.8-4.9L5 8.7 9.8 8 12 3.5Z" />
        <circle cx="12" cy="11" r="1.7" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {paths[id]}
    </svg>
  );
}

export function TrustDetailsSection() {
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
      { threshold: 0.18 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className={`${styles.section} ${entered ? styles.entered : ""}`}
      aria-labelledby="trust-details-title"
    >
      <h2 id="trust-details-title" className="sr-only">
        {trustContent.heading}
      </h2>
      <div className={styles.inner}>
        {trustDetails.map((item, index) => (
          <article
            key={item.id}
            className={styles.item}
            style={{ "--trust-index": index } as CSSProperties}
          >
            <span className={styles.icon}>
              <TrustIcon id={item.id} />
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.copy}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

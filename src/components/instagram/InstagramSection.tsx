"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { ugcReels } from "./instagram.data";
import styles from "./InstagramSection.module.css";

function processEmbeds() {
  const instagram = (window as Window & {
    instgrm?: { Embeds?: { process: () => void } };
  }).instgrm;
  instagram?.Embeds?.process();
}

// "slider": one sideways row with previous/next buttons (product page).
// "grid": every Reel in wrapping rows (testimonials page).
export function InstagramSection({
  headingLevel = "h2",
  layout = "slider",
}: {
  headingLevel?: "h1" | "h2";
  layout?: "slider" | "grid";
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState({ back: false, forward: false });

  // Buttons only appear when the Reels overflow, and disable at either end.
  const updateScrollState = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScroll({ back: track.scrollLeft > 4, forward: track.scrollLeft < maxScroll - 4 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateScrollState();
    track.addEventListener("scroll", updateScrollState, { passive: true });
    // Instagram swaps each placeholder for an iframe, which changes widths.
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  // Moves by one Reel; the CSS scroll snap settles it on the card edge.
  const scrollByCard = (direction: -1 | 1) => {
    const track = trackRef.current;
    const card = track?.querySelector("li");
    if (!track || !card) return;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  };

  if (!ugcReels.length) return null;
  const Heading = headingLevel;
  const showControls = layout === "slider" && (canScroll.back || canScroll.forward);

  return (
    <section className={styles.section} aria-labelledby="instagram-title">
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>The Àurelle Community</p>
          <Heading id="instagram-title">Seen on Instagram</Heading>
        </header>
        <ul
          ref={trackRef}
          className={layout === "grid" ? `${styles.track} ${styles.grid}` : styles.track}
          data-count={ugcReels.length}
          aria-label="FA ÀURELLE Reel collection"
        >
          {ugcReels.map((reel, index) => (
            <li key={reel.id} className={styles.card}>
              {/* Instagram owns playback and height. Omit embed captions for a compact presentation. */}
              <blockquote
                className={`instagram-media ${styles.embed}`}
                data-instgrm-permalink={reel.url}
                data-instgrm-version="14"
              >
                <a href={reel.url} target="_blank" rel="noopener noreferrer">
                  View Reel {index + 1} on Instagram
                </a>
              </blockquote>
            </li>
          ))}
        </ul>
        {showControls ? (
          <div className={styles.controls} aria-label="Instagram Reels slider controls">
            <button type="button" onClick={() => scrollByCard(-1)} disabled={!canScroll.back} aria-label="Previous Reel">←</button>
            <button type="button" onClick={() => scrollByCard(1)} disabled={!canScroll.forward} aria-label="Next Reel">→</button>
          </div>
        ) : null}
      </div>
      <Script
        id="instagram-embed"
        src="https://www.instagram.com/embed.js"
        strategy="lazyOnload"
        onReady={processEmbeds}
      />
    </section>
  );
}

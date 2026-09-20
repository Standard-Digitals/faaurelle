"use client";

import Script from "next/script";
import { ugcReels } from "./instagram.data";
import styles from "./InstagramSection.module.css";

function processEmbeds() {
  const instagram = (window as Window & {
    instgrm?: { Embeds?: { process: () => void } };
  }).instgrm;
  instagram?.Embeds?.process();
}

export function InstagramSection() {
  if (!ugcReels.length) return null;

  return (
    <section className={styles.section} aria-labelledby="instagram-title">
      <div className={styles.inner}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>The Àurelle Community</p>
          <h2 id="instagram-title">Seen on Instagram</h2>
        </header>
        <ul className={styles.grid} data-count={ugcReels.length} aria-label="FA ÀURELLE Reel collection">
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

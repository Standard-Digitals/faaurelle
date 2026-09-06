"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type CarouselClasses = {
  root: string;
  viewport: string;
  track: string;
  controls: string;
};

type LoopingCardCarouselProps<T> = {
  items: readonly T[];
  getItemKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  classes: CarouselClasses;
  controlsLabel: string;
  previousLabel: string;
  nextLabel: string;
  intervalMs?: number;
};

export function LoopingCardCarousel<T>({
  items,
  getItemKey,
  renderItem,
  classes,
  controlsLabel,
  previousLabel,
  nextLabel,
  intervalMs = 1800,
}: LoopingCardCarouselProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const firstCardRef = useRef<HTMLElement>(null);
  const [index, setIndex] = useState(items.length);
  const [cardWidth, setCardWidth] = useState(0);
  const [transitioning, setTransitioning] = useState(true);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const loopedItems = [...items, ...items, ...items];

  const move = useCallback((direction: -1 | 1) => {
    setTransitioning(true);
    setIndex((current) => current + direction);
  }, []);

  useEffect(() => {
    const card = firstCardRef.current;
    if (!card) return;
    const measure = () => setCardWidth(card.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0.2,
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || paused || !inView || document.hidden) return;
    const timer = window.setInterval(() => move(1), intervalMs);
    return () => window.clearInterval(timer);
  }, [inView, intervalMs, move, paused]);

  const completeLoop = () => {
    let resetIndex: number | null = null;
    if (index >= items.length * 2) resetIndex = items.length;
    if (index < items.length) resetIndex = items.length * 2 - 1;
    if (resetIndex === null) return;
    setTransitioning(false);
    setIndex(resetIndex);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => setTransitioning(true)));
  };

  return (
    <div
      ref={rootRef}
      className={classes.root}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className={classes.viewport}>
        <div
          className={classes.track}
          style={{
            transform: `translate3d(${-index * cardWidth}px, 0, 0)`,
            transition: transitioning ? "transform 700ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
          }}
          onTransitionEnd={completeLoop}
        >
          {loopedItems.map((item, itemIndex) => (
            <article
              ref={itemIndex === 0 ? firstCardRef : undefined}
              key={`${itemIndex}-${getItemKey(item)}`}
            >
              {renderItem(item)}
            </article>
          ))}
        </div>
      </div>
      <div className={classes.controls} aria-label={controlsLabel}>
        <button type="button" onClick={() => move(-1)} aria-label={previousLabel}>←</button>
        <button type="button" onClick={() => move(1)} aria-label={nextLabel}>→</button>
      </div>
    </div>
  );
}

"use client";

import type { CSSProperties, ReactNode } from "react";
import { heroContent } from "@/config/hero-content";
import {
  editorialProductChapterTiming,
  moleculeMergeTiming,
  smoothStepBetween,
  type ProgressRange,
} from "@/lib/hero/hero-chapters";

type BenefitIconName = (typeof heroContent.chapterThree.benefits)[number]["icon"];

function BenefitIcon({ name }: { name: BenefitIconName }) {
  const icons: Record<BenefitIconName, ReactNode> = {
    botanical: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="m21.88 2.15-1.2.4a13.84 13.84 0 0 1-6.41.64 11.87 11.87 0 0 0-6.68.9A7.23 7.23 0 0 0 3.3 9.5a8.65 8.65 0 0 0 1.47 6.6c-.06.21-.12.42-.17.63A22.6 22.6 0 0 0 4 22h2a31 31 0 0 1 .59-4.32 9.25 9.25 0 0 0 4.52 1.11 11 11 0 0 0 4.28-.87C23 14.67 22 3.86 22 3.41zm-7.27 13.93c-2.61 1.11-5.73.92-7.48-.45a13.8 13.8 0 0 1 1.21-2.84A10.2 10.2 0 0 1 9.73 11a9 9 0 0 1 1.81-1.42A12 12 0 0 1 16 8V7a11.4 11.4 0 0 0-5.26 1.08 10.3 10.3 0 0 0-4.12 3.65 15 15 0 0 0-1 1.87 7 7 0 0 1-.38-3.73 5.24 5.24 0 0 1 3.14-4 8.9 8.9 0 0 1 3.82-.84c.62 0 1.23.06 1.87.11a16.2 16.2 0 0 0 6-.35C20 7.55 19.5 14 14.61 16.08"
        />
      </svg>
    ),
    lightweight: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M12 22c4.636 0 8-3.468 8-8.246C20 7.522 12.882 2.4 12.579 2.185a1 1 0 0 0-1.156-.001C11.12 2.397 4 7.503 4 13.75C4 18.53 7.364 22 12 22m-.001-17.74C13.604 5.55 18 9.474 18 13.754C18 17.432 15.532 20 12 20s-6-2.57-6-6.25c0-4.29 4.394-8.203 5.999-9.49"
        />
      </svg>
    ),
    shine: (
      <svg viewBox="0 0 480 512" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M471.99 334.43 336.06 256l135.93-78.43c7.66-4.42 10.28-14.2 5.86-21.86l-32.02-55.43c-4.42-7.65-14.21-10.28-21.87-5.86l-135.93 78.43V16c0-8.84-7.17-16-16.01-16h-64.04c-8.84 0-16.01 7.16-16.01 16v156.86L56.04 94.43c-7.66-4.42-17.45-1.79-21.87 5.86L2.15 155.71c-4.42 7.65-1.8 17.44 5.86 21.86L143.94 256 8.01 334.43c-7.66 4.42-10.28 14.21-5.86 21.86l32.02 55.43c4.42 7.65 14.21 10.27 21.87 5.86l135.93-78.43V496c0 8.84 7.17 16 16.01 16h64.04c8.84 0 16.01-7.16 16.01-16V339.14l135.93 78.43c7.66 4.42 17.45 1.8 21.87-5.86l32.02-55.43c4.42-7.65 1.8-17.43-5.86-21.85z" />
      </svg>
    ),
    strength: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M20.995 6.9a1 1 0 0 0-.548-.795l-8-4a1 1 0 0 0-.895 0l-8 4a1 1 0 0 0-.547.795c-.011.107-.961 10.767 8.589 15.014a1 1 0 0 0 .812 0c9.55-4.247 8.6-14.906 8.589-15.014M12 19.897C5.231 16.625 4.911 9.642 4.966 7.635L12 4.118l7.029 3.515c.037 1.989-.328 9.018-7.029 12.264" />
        <path fill="currentColor" d="m11 12.586-2.293-2.293-1.414 1.414L11 15.414l5.707-5.707-1.414-1.414z" />
      </svg>
    ),
    smooth: (
      <svg viewBox="0 0 576 512" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M218.92 336.39c34.89-34.89 44.2-59.7 54.05-86 10.61-28.29 21.59-57.54 61.37-97.34s69.05-50.77 97.35-61.38c23.88-9 46.64-17.68 76.79-45.37L470.81 8.91a31 31 0 0 0-40.18-2.83c-13.64 10.1-25.15 14.39-41 20.3C247 79.52 209.26 191.29 200.65 214.1c-29.75 78.83-89.55 94.68-98.72 98.09-24.86 9.26-54.73 20.38-91.07 50.36C-3 374-3.63 395 9.07 407.61l35.76 35.51C80 410.52 107 400.15 133 390.39c26.27-9.84 51.06-19.12 85.92-54zm348-232-35.75-35.51c-35.19 32.63-62.18 43-88.25 52.79-26.26 9.85-51.06 19.16-85.95 54s-44.19 59.69-54 86C292.33 290 281.34 319.22 241.55 359s-69 50.73-97.3 61.32c-23.86 9-46.61 17.66-76.72 45.33l37.68 37.43a31 31 0 0 0 40.18 2.82c13.6-10.06 25.09-14.34 40.94-20.24 142.2-53 180-164.1 188.94-187.69C405 219.18 464.8 203.3 474 199.86c24.87-9.27 54.74-20.4 91.11-50.41 13.89-11.4 14.52-32.45 1.82-45.05z" />
      </svg>
    ),
    heat: (
      <svg viewBox="0 0 512 512" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M464 128H272l-64-64H48a48 48 0 0 0-48 48v288a48 48 0 0 0 48 48h416a48 48 0 0 0 48-48V176a48 48 0 0 0-48-48M359.5 296a16 16 0 0 1-16 16h-64v64a16 16 0 0 1-16 16h-16a16 16 0 0 1-16-16v-64h-64a16 16 0 0 1-16-16v-16a16 16 0 0 1 16-16h64v-64a16 16 0 0 1 16-16h16a16 16 0 0 1 16 16v64h64a16 16 0 0 1 16 16Z" />
      </svg>
    ),
  };

  return icons[name];
}

function revealStyle(progress: number, range: readonly [number, number]): CSSProperties {
  const reveal = smoothStepBetween(progress, range);
  return {
    opacity: reveal,
    transform: `translate3d(0, ${12 * (1 - reveal)}px, 0)`,
  };
}

function Reveal({
  children,
  className,
  progress,
  range,
}: {
  children: ReactNode;
  className: string;
  progress: number;
  range: readonly [number, number];
}) {
  return (
    <div className={className} style={revealStyle(progress, range)}>
      {children}
    </div>
  );
}

export function EditorialProductChapter({
  progress,
  exitProgress,
  exitRange = moleculeMergeTiming.sectionThreeExit,
}: {
  progress: number;
  exitProgress: number;
  exitRange?: ProgressRange;
}) {
  const content = heroContent.chapterThree;
  const chapterExit = smoothStepBetween(exitProgress, exitRange);
  const ctaReveal = smoothStepBetween(progress, editorialProductChapterTiming.ctaReveal);

  return (
    <section
      className="editorial-product-chapter absolute inset-0 z-[15]"
      aria-labelledby="editorial-product-title"
      aria-hidden={progress <= editorialProductChapterTiming.whiteBeat[1] || chapterExit >= 1}
      style={{ opacity: 1 - chapterExit }}
    >
      <div className="editorial-product-content">
        <Reveal
          className="editorial-product-heading"
          progress={progress}
          range={editorialProductChapterTiming.headingReveal}
        >
          <h2 id="editorial-product-title">{content.supporting}</h2>
        </Reveal>

        <Reveal
          className="editorial-product-description"
          progress={progress}
          range={editorialProductChapterTiming.descriptionReveal}
        >
          <p className="type-body">{content.description}</p>
        </Reveal>

        <Reveal
          className="editorial-product-cta"
          progress={progress}
          range={editorialProductChapterTiming.ctaReveal}
        >
          <a href={content.cta.href} tabIndex={ctaReveal > 0.5 ? 0 : -1}>
            {content.cta.label}
          </a>
        </Reveal>

        <Reveal
          className="editorial-product-benefits"
          progress={progress}
          range={editorialProductChapterTiming.benefitsReveal}
        >
          <ul aria-label="Product benefits">
            {content.benefits.map((benefit) => (
              <li key={benefit.label}>
                <BenefitIcon name={benefit.icon} />
                <span>{benefit.label}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

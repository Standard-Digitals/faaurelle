"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { moleculeMergeTiming, smoothStepBetween } from "@/lib/hero/hero-chapters";
import { heroContent } from "@/config/hero-content";
import {
  ViscousSerumMerge,
  viscousSerumSequenceEndProgress,
} from "@/components/hero/chapter4/viscous-serum-merge/ViscousSerumMerge";

export function MoleculeMergeChapter({ progress }: { progress: number }) {
  const finalContentRef = useRef<HTMLDivElement>(null);
  const finalContentTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const content = heroContent.chapterFour;
  const chapterThreeExitEnd = moleculeMergeTiming.sectionThreeExit[1];
  const sceneProgress = smoothStepBetween(progress, [chapterThreeExitEnd, 0.3]);
  const copyProgress = smoothStepBetween(progress, [0.24, 0.34]);
  const finalContentProgress = smoothStepBetween(progress, [
    viscousSerumSequenceEndProgress,
    0.95,
  ]);

  useEffect(() => {
    const root = finalContentRef.current;
    if (!root) {
      return;
    }

    const context = gsap.context(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const timeline = gsap.timeline({
        paused: true,
        defaults: { duration: reduceMotion ? 0.01 : 0.52, ease: "power3.out" },
      });

      timeline
        .fromTo(
          ".silk-fusion-description, .silk-fusion-benefits",
          { autoAlpha: 0, y: 14 },
          {
            autoAlpha: 1,
            y: 0,
            duration: reduceMotion ? 0.01 : 0.46,
            stagger: reduceMotion ? 0 : 0.07,
          },
          0,
        )
        .fromTo(
          ".silk-fusion-description-rule",
          { scaleY: 0, transformOrigin: "top center" },
          { scaleY: 1 },
          0.1,
        )
        .fromTo(
          ".silk-fusion-description-copy",
          { autoAlpha: 0, x: -22 },
          { autoAlpha: 1, x: 0 },
          0.16,
        )
        .fromTo(
          ".silk-fusion-benefits-heading",
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0 },
          0.2,
        )
        .fromTo(
          ".silk-fusion-benefits li",
          { autoAlpha: 0, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: reduceMotion ? 0.01 : 0.42,
            stagger: reduceMotion ? 0 : 0.055,
          },
          0.28,
        );

      finalContentTimelineRef.current = timeline;
    }, root);

    return () => {
      finalContentTimelineRef.current = null;
      context.revert();
    };
  }, []);

  useEffect(() => {
    finalContentTimelineRef.current?.progress(finalContentProgress);
  }, [finalContentProgress]);

  return (
    <section
      className="silk-fusion-chapter molecule-merge-chapter absolute inset-0 z-[16]"
      aria-labelledby="molecule-merge-title"
      aria-hidden={sceneProgress <= 0}
      style={{ opacity: sceneProgress }}
    >
      <ViscousSerumMerge progress={progress} />
      <div className="silk-fusion-copy">
        <p
          className="silk-fusion-eyebrow type-eyebrow"
          style={{
            opacity: copyProgress,
            transform: `translate3d(0, ${10 * (1 - copyProgress)}px, 0)`,
          }}
        >
          {content.eyebrow}
        </p>
        <div className="silk-fusion-title-mask">
          <h2
            id="molecule-merge-title"
            className="type-editorial-heading"
            style={{
              opacity: copyProgress,
              transform: `translate3d(0, ${28 * (1 - copyProgress)}px, 0)`,
            }}
          >
            {content.heading.primary} <em>{content.heading.emphasis}</em>
          </h2>
        </div>
      </div>

      <div
        ref={finalContentRef}
        className="silk-fusion-final-content"
        data-revealed={finalContentProgress > 0 ? "true" : "false"}
        aria-hidden={finalContentProgress < 0.01}
      >
        <div className="silk-fusion-description">
          <span className="silk-fusion-description-rule" aria-hidden="true" />
          <div className="silk-fusion-description-copy">
            <p className="silk-fusion-description-lead">{content.description.lead}</p>
            <p className="silk-fusion-description-body">{content.description.body}</p>
          </div>
        </div>

        <div className="silk-fusion-benefits">
          <h3 className="silk-fusion-benefits-heading">
            <span>{content.benefitsHeading}</span>
          </h3>
          <ol>
            {content.benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

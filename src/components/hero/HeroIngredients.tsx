"use client";

import Image from "next/image";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { heroContent } from "@/config/hero-content";
import {
  chapterTwoLayoutEventName,
  resolveChapterTwoLayout,
  type ChapterTwoLabelOrientation,
  type ChapterTwoLayout,
} from "@/lib/hero/chapter-two-layout";
import { botanicalEssenceTiming, smoothStepBetween } from "@/lib/hero/hero-chapters";
import { quadraticBotanicalPoint } from "@/lib/hero/hero-botanical-paths";
import {
  heroResponsivePresets,
  resolveHeroResponsivePreset,
} from "@/lib/hero/hero-presets";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const ingredients = [
  {
    ...heroContent.chapterTwo.ingredients.argan,
    image: `${basePath}/images/ingredients/argan-oil.png`,
    rotation: -4,
  },
  {
    ...heroContent.chapterTwo.ingredients.jojoba,
    image: `${basePath}/images/ingredients/jojoba-oil.png`,
    rotation: 3,
  },
  {
    ...heroContent.chapterTwo.ingredients.camellia,
    image: `${basePath}/images/ingredients/camellia-oil.png`,
    rotation: 4,
  },
] as const;

type IngredientStyle = CSSProperties & {
  "--ingredient-x": string;
  "--ingredient-y": string;
  "--ingredient-size": string;
  "--ingredient-scale": number;
  "--ingredient-opacity": number;
  "--ingredient-rotation": string;
  "--label-opacity": number;
  "--label-gap": string;
  "--label-width": string;
  "--label-name-size": string;
  "--label-benefit-size": string;
  "--label-offset-x": string;
  "--label-offset-y": string;
};

type ChapterTwoSectionStyle = CSSProperties & {
  "--chapter-two-heading-top": string;
  "--chapter-two-heading-width": string;
  "--chapter-two-heading-size": string;
  "--chapter-two-eyebrow-size": string;
};

function resolveCurrentLayout(measuredHeadingHeight?: number) {
  const presetName = resolveHeroResponsivePreset();
  const preset = heroResponsivePresets[presetName];
  return resolveChapterTwoLayout(
    typeof window === "undefined" ? 1440 : window.innerWidth,
    typeof window === "undefined" ? 880 : window.innerHeight,
    presetName,
    preset,
    presetName === "desktopLandscape" ? undefined : measuredHeadingHeight,
  );
}

function formatLabelOrientation(orientation: ChapterTwoLabelOrientation) {
  return orientation.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function HeroIngredients({ progress }: { progress: number }) {
  const headingRef = useRef<HTMLElement>(null);
  const [layout, setLayout] = useState<ChapterTwoLayout>(() =>
    resolveChapterTwoLayout(
      1440,
      880,
      "desktopLandscape",
      heroResponsivePresets.desktopLandscape,
    ),
  );

  useLayoutEffect(() => {
    const updateLayout = () => {
      setLayout(resolveCurrentLayout(headingRef.current?.getBoundingClientRect().height));
    };
    window.addEventListener(chapterTwoLayoutEventName, updateLayout);
    const initialLayoutFrame = window.requestAnimationFrame(() => {
      updateLayout();
    });
    const headingObserver = new ResizeObserver(updateLayout);
    if (headingRef.current) {
      headingObserver.observe(headingRef.current);
    }
    return () => {
      window.cancelAnimationFrame(initialLayoutFrame);
      headingObserver.disconnect();
      window.removeEventListener(chapterTwoLayoutEventName, updateLayout);
    };
  }, []);

  const sectionEnter = smoothStepBetween(progress, botanicalEssenceTiming.sectionFadeIn);
  const sectionExit = smoothStepBetween(progress, botanicalEssenceTiming.sectionFadeOut);
  const sectionOpacity = sectionEnter * (1 - sectionExit);
  const headingProgress = smoothStepBetween(progress, botanicalEssenceTiming.headingReveal);
  const emergenceGlow =
    smoothStepBetween(progress, botanicalEssenceTiming.glowReveal) *
    (1 - smoothStepBetween(progress, botanicalEssenceTiming.glowEmergenceResolve));
  const absorptionGlow =
    smoothStepBetween(progress, botanicalEssenceTiming.glowAbsorptionReveal) *
    (1 - smoothStepBetween(progress, botanicalEssenceTiming.glowResolve));
  const glowStrength = Math.max(emergenceGlow, absorptionGlow);
  const sectionStyle: ChapterTwoSectionStyle = {
    opacity: sectionOpacity,
    "--chapter-two-heading-top": `${layout.headingTop}px`,
    "--chapter-two-heading-width": `${layout.headingWidth}px`,
    "--chapter-two-heading-size": `${layout.headingFontSize}px`,
    "--chapter-two-eyebrow-size": `${layout.eyebrowFontSize}px`,
  };

  return (
    <section
      className="hero-botanical-chapter absolute inset-0 z-10"
      style={sectionStyle}
      aria-labelledby="botanical-essence-title"
      aria-hidden={sectionOpacity < 0.01}
    >
      <header
        ref={headingRef}
        className="hero-botanical-heading"
        style={{
          opacity: headingProgress,
          transform: `translate3d(-50%, ${14 * (1 - headingProgress)}px, 0)`,
        }}
      >
        <p className="type-eyebrow">{heroContent.chapterTwo.eyebrow}</p>
        <h2 id="botanical-essence-title">
          {heroContent.chapterTwo.heading.primary}{" "}
          <em>{heroContent.chapterTwo.heading.emphasis}</em>
        </h2>
      </header>

      <div
        className="hero-botanical-glow"
        aria-hidden="true"
        style={{
          left: `${layout.origin[0]}%`,
          top: `${layout.origin[1]}%`,
          opacity: glowStrength,
          transform: `translate3d(-50%, -50%, 0) scale(${0.72 + glowStrength * 0.28})`,
        }}
      />

      <div className="hero-botanical-ingredients">
        {ingredients.map((ingredient, index) => {
          const itemLayout = layout.ingredients[index];
          const enterStart = botanicalEssenceTiming.ingredientReveal[0] + index * 0.055;
          const enterEnd = enterStart + 0.16;
          const returnStart = botanicalEssenceTiming.ingredientReturn[0] + index * 0.035;
          const returnEnd = returnStart + 0.18;
          const enter = smoothStepBetween(progress, [enterStart, enterEnd]);
          const returning = smoothStepBetween(progress, [returnStart, returnEnd]);
          const travel = enter * (1 - returning);
          const [x, y] = quadraticBotanicalPoint(
            layout.origin,
            itemLayout.control,
            itemLayout.final,
            travel,
          );
          const labelStart = botanicalEssenceTiming.labelReveal[0] + index * 0.045;
          const labelProgress =
            smoothStepBetween(progress, [labelStart, labelStart + 0.1]) * (1 - returning);
          const opacity = enter * (1 - returning);
          const style: IngredientStyle = {
            "--ingredient-x": `${x}%`,
            "--ingredient-y": `${y}%`,
            "--ingredient-size": `${itemLayout.size}px`,
            "--ingredient-scale": 0.36 + travel * 0.64,
            "--ingredient-opacity": opacity,
            "--ingredient-rotation": `${ingredient.rotation * travel}deg`,
            "--label-opacity": labelProgress,
            "--label-gap": `${itemLayout.labelGap}px`,
            "--label-width": `${layout.labelWidth}px`,
            "--label-name-size": `${layout.labelNameSize}px`,
            "--label-benefit-size": `${layout.labelBenefitSize}px`,
            "--label-offset-x": `${itemLayout.labelOffset[0]}px`,
            "--label-offset-y": `${itemLayout.labelOffset[1]}px`,
          };

          return (
            <figure
              key={ingredient.name}
              className={`hero-botanical-ingredient hero-botanical-ingredient--${formatLabelOrientation(itemLayout.labelOrientation)}`}
              style={style}
            >
              <div className="hero-botanical-ingredient__visual">
                <Image
                  src={ingredient.image}
                  alt=""
                  fill
                  sizes="(max-width: 767px) 26vw, (max-width: 1100px) 28vw, 20vw"
                  className="object-contain"
                />
              </div>
              <figcaption>
                <span>{ingredient.name}</span>
                <small>{ingredient.benefit}</small>
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

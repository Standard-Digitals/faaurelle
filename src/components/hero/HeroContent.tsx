"use client";

import { BotanicalEssenceChapter } from "@/components/hero/chapters/BotanicalEssenceChapter";
import { EditorialProductChapter } from "@/components/hero/chapters/EditorialProductChapter";
import { HeroChapter } from "@/components/hero/chapters/HeroChapter";
import { MoleculeMergeChapter } from "@/components/hero/chapters/MoleculeMergeChapter";
import { brand } from "@/config/brand";
import {
  botanicalEssenceTiming,
  chapterConfig,
  getHeroChapterProgress,
  moleculeMergeTiming,
  phoneChapterConfig,
  smoothStepBetween,
} from "@/lib/hero/hero-chapters";
import {
  isPhoneHeroMode,
  type HeroExperienceMode,
} from "@/lib/responsive";

export function HeroContent({
  mode = "production",
  progress,
  experienceMode,
  activeChapterIndex,
  debugMode,
  onToggleDebug,
}: {
  mode?: "production" | "review";
  progress: number;
  experienceMode: HeroExperienceMode;
  activeChapterIndex: number;
  debugMode?: boolean;
  onToggleDebug?: () => void;
}) {
  if (mode === "production") {
    const heroProgress = getHeroChapterProgress(progress, "hero", experienceMode);
    const rawBotanicalProgress = getHeroChapterProgress(
      progress,
      "botanicalEssence",
      experienceMode,
    );
    const sectionTwoHasOwnership =
      isPhoneHeroMode(experienceMode) || heroProgress >= 1;
    const botanicalProgress = sectionTwoHasOwnership ? rawBotanicalProgress : 0;
    const keyIngredientsProgress = getHeroChapterProgress(
      progress,
      "keyIngredients",
      experienceMode,
    );
    const silkFusionProgress = getHeroChapterProgress(
      progress,
      "silkBotaniqueFusion",
      experienceMode,
    );
    const chapterThreeExitRange = moleculeMergeTiming.sectionThreeExit;
    const sectionThreeChromeOpacity =
      1 - smoothStepBetween(keyIngredientsProgress, [0.02, 0.14]);
    const progressPercent = `${Math.round(progress * 100)}%`;
    const heroTextExitRange = isPhoneHeroMode(experienceMode)
      ? [
          phoneChapterConfig.botanicalEssence.start -
            (phoneChapterConfig.hero.outroOverlap ?? 0),
          phoneChapterConfig.botanicalEssence.start,
        ] as const
      : [
          chapterConfig.hero.end - (chapterConfig.hero.outroOverlap ?? 0),
          chapterConfig.hero.end,
        ] as const;
    const heroTextExitProgress = smoothStepBetween(progress, heroTextExitRange);

    return (
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden text-foreground">
        <div
          className="contents"
          aria-hidden={activeChapterIndex !== 1}
          inert={activeChapterIndex !== 1}
        >
          <BotanicalEssenceChapter
            progress={botanicalProgress}
          />
        </div>
        <div
          className="contents"
          aria-hidden={activeChapterIndex !== 2}
          inert={activeChapterIndex !== 2}
        >
          <EditorialProductChapter
            progress={keyIngredientsProgress}
            exitProgress={silkFusionProgress}
            exitRange={chapterThreeExitRange}
          />
        </div>
        <div
          className="contents"
          aria-hidden={activeChapterIndex !== 3}
          inert={activeChapterIndex !== 3}
        >
          <MoleculeMergeChapter progress={silkFusionProgress} />
        </div>

        <div
          className="contents"
          aria-hidden={activeChapterIndex !== 0}
          inert={activeChapterIndex !== 0}
        >
          <HeroChapter exitProgress={heroTextExitProgress} />
        </div>

        <div
          className="bg-amber/10 absolute bottom-7 right-layout-x top-24 z-20 hidden w-px sm:block"
          style={{ opacity: sectionThreeChromeOpacity }}
        >
          <span
            className="absolute left-0 top-0 w-px bg-gold transition-[height] duration-100"
            style={{ height: progressPercent }}
          />
        </div>

      </div>
    );
  }

  const botanicalProgress = getHeroChapterProgress(
    progress,
    "botanicalEssence",
    experienceMode,
  );
  const ctaVisible = botanicalProgress > botanicalEssenceTiming.reviewCtaReveal;

  return (
    <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-content flex-col justify-between px-layout-x py-section-y">
      <header className="flex items-center justify-between gap-5 text-base uppercase tracking-[0.18em] text-muted">
        <span>{brand.displayName}</span>
        {mode === "review" ? (
          <button
            type="button"
            className="border-amber/20 bg-background/80 pointer-events-auto border px-3 py-2 text-base text-foreground"
            onClick={onToggleDebug}
          >
            {debugMode ? "Hide Debug" : "Show Debug"}
          </button>
        ) : null}
      </header>

      <div className="max-w-[34rem]">
        <p className="mb-4 text-base uppercase tracking-[0.22em] text-gold">Live GLB review</p>
        <h1 className="font-serif text-5xl leading-none text-foreground sm:text-7xl">
          {brand.displayName}
        </h1>
        <p className="mt-6 max-w-[29rem] text-base leading-7 text-muted">
          Hair elixir hero prototype rendered as live Three.js geometry with scroll-driven assembly.
        </p>
        <a
          href="#review-notes"
          className={[
            "border-amber/30 bg-background/80 pointer-events-auto mt-8 inline-flex border px-5 py-3 text-base uppercase tracking-[0.18em] text-foreground transition",
            ctaVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          ].join(" ")}
        >
          Review Notes
        </a>
      </div>
    </div>
  );
}

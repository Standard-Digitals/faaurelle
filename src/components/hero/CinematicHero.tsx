"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import { HeroContent } from "@/components/hero/HeroContent";
import { HeroLoader } from "@/components/hero/HeroLoader";
import { HeroStaticFallback } from "@/components/hero/HeroStaticFallback";
import {
  chapterConfig,
  getHeroScrollHeightVh,
  phoneChapterConfig,
} from "@/lib/hero/hero-chapters";
import { useHeroExperienceMode } from "@/lib/hero/use-hero-experience-mode";
import { useHeroResponsivePreset } from "@/lib/hero/use-hero-responsive-preset";
import { useHeroReducedMotionPreference, useHeroWebGLStatus } from "@/lib/hero/hero-webgl";
import { isPhoneHeroMode } from "@/lib/responsive";

const HeroScene = dynamic(() => import("@/components/hero/HeroScene").then((mod) => mod.HeroScene), {
  ssr: false,
  loading: () => <HeroLoader />,
});

export function CinematicHero({
  mode = "production",
  scrollRootClassName = "hero-3d-production-scroll",
}: {
  mode?: "production" | "review";
  scrollRootClassName?: string;
}) {
  const reducedMotion = useHeroReducedMotionPreference();
  const experienceMode = useHeroExperienceMode();
  const responsivePresetName = useHeroResponsivePreset();
  const { checkedWebgl, webglReady } = useHeroWebGLStatus();
  const [debugMode, setDebugMode] = useState(mode === "review");
  const [progress, setProgress] = useState(0);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const progressBucketRef = useRef(-1);

  const showStaticFallback = checkedWebgl && (!webglReady || reducedMotion);
  const fallbackReason = useMemo(() => {
    if (!checkedWebgl) {
      return undefined;
    }

    if (!webglReady) {
      return "Static approved render";
    }

    if (reducedMotion) {
      return "Reduced motion render";
    }

    return undefined;
  }, [checkedWebgl, reducedMotion, webglReady]);

  const handleProgress = useCallback((nextProgress: number) => {
    const bucket = Math.round(nextProgress * (isPhoneHeroMode(experienceMode) ? 120 : 1000));
    if (bucket === progressBucketRef.current) {
      return;
    }

    progressBucketRef.current = bucket;
    setProgress(nextProgress);
  }, [experienceMode]);

  const handleActiveChapterChange = useCallback((nextChapterIndex: number) => {
    setActiveChapterIndex((current) =>
      current === nextChapterIndex ? current : nextChapterIndex,
    );
  }, []);

  const silkFusionStart = isPhoneHeroMode(experienceMode)
    ? phoneChapterConfig.silkBotaniqueFusion.start
    : chapterConfig.silkBotaniqueFusion.start;

  return (
    <section
      className={`${scrollRootClassName} relative bg-background`}
      data-hero-mode={experienceMode}
      data-hero-preset={responsivePresetName}
      style={{ minHeight: `${getHeroScrollHeightVh(experienceMode)}vh` }}
    >
      <span
        id="silk-botanique-fusion"
        className="pointer-events-none absolute left-0 h-px w-px"
        style={{
          top: `calc(${silkFusionStart * 100}% - ${silkFusionStart * 100}svh + var(--site-header-total-height) + 1rem)`,
          scrollMarginTop: "calc(var(--site-header-total-height) + 1rem)",
        }}
        aria-hidden="true"
      />
      <div className="viewport-screen sticky top-0 overflow-hidden bg-background-bright">
        <div className="absolute inset-0">
          {!checkedWebgl ? (
            <HeroLoader />
          ) : showStaticFallback ? (
            <HeroStaticFallback
              reason={mode === "review" ? fallbackReason : undefined}
              priority
              composition={mode !== "production" ? "default" : "moleculeMerge"}
            />
          ) : (
            <HeroScene
              debugMode={mode === "review" && debugMode}
              experienceMode={experienceMode}
              activeChapterIndex={activeChapterIndex}
              scrollRootClassName={scrollRootClassName}
              onProgress={handleProgress}
              onActiveChapterChange={handleActiveChapterChange}
            />
          )}
        </div>

        {!showStaticFallback ? (
          <HeroContent
            mode={mode}
            progress={progress}
            experienceMode={experienceMode}
            activeChapterIndex={activeChapterIndex}
            debugMode={debugMode}
            onToggleDebug={() => setDebugMode((current) => !current)}
          />
        ) : null}
      </div>
    </section>
  );
}

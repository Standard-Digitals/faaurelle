"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState, type CSSProperties } from "react";
import { HeroContent } from "@/components/hero/HeroContent";
import { HeroLoader } from "@/components/hero/HeroLoader";
import { chapterConfig, getHeroScrollHeightVh, phoneChapterConfig } from "@/lib/hero/hero-chapters";
import { useHeroExperienceMode } from "@/lib/hero/use-hero-experience-mode";
import { useHeroResponsivePreset } from "@/lib/hero/use-hero-responsive-preset";
import { useHeroReducedMotionPreference, useHeroWebGLStatus } from "@/lib/hero/hero-webgl";
import { isPhoneHeroMode } from "@/lib/responsive";

const HeroScene = dynamic(
  () => import("@/components/hero/HeroScene").then((mod) => mod.HeroScene),
  {
    ssr: false,
    loading: () => <HeroLoader />,
  },
);

export function CinematicHero({
  mode = "production",
  scrollRootClassName = "hero-3d-production-scroll",
}: {
  mode?: "production" | "review";
  scrollRootClassName?: string;
}) {
  const { checkedReducedMotion, reducedMotion } = useHeroReducedMotionPreference();
  const experienceMode = useHeroExperienceMode();
  const responsivePresetName = useHeroResponsivePreset();
  const { checkedWebgl, webglReady } = useHeroWebGLStatus();
  const [sceneReady, setSceneReady] = useState(false);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);
  const [sceneFailed, setSceneFailed] = useState(false);
  const handleSceneError = useCallback(() => setSceneFailed(true), []);
  const [debugMode, setDebugMode] = useState(mode === "review");
  const [progress, setProgress] = useState(0);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const progressBucketRef = useRef(-1);
  const checkedHeroCapabilities = checkedWebgl && checkedReducedMotion;
  const showImageFallback =
    checkedHeroCapabilities && (!webglReady || sceneFailed);
  const handleProgress = useCallback(
    (nextProgress: number) => {
      const bucket = Math.round(nextProgress * (isPhoneHeroMode(experienceMode) ? 120 : 1000));
      if (bucket === progressBucketRef.current) {
        return;
      }

      progressBucketRef.current = bucket;
      setProgress(nextProgress);
    },
    [experienceMode],
  );

  const handleActiveChapterChange = useCallback((nextChapterIndex: number) => {
    setActiveChapterIndex((current) => (current === nextChapterIndex ? current : nextChapterIndex));
  }, []);

  const silkFusionStart = isPhoneHeroMode(experienceMode)
    ? phoneChapterConfig.silkBotaniqueFusion.start
    : chapterConfig.silkBotaniqueFusion.start;

  return (
    <section
      className={`${scrollRootClassName} relative bg-background`}
      data-hero-mode={experienceMode}
      data-hero-preset={responsivePresetName}
      data-hero-loading={!sceneReady && !showImageFallback ? "true" : "false"}
      data-hero-renderer={showImageFallback ? "static" : "webgl"}
      style={{
        minHeight: showImageFallback || reducedMotion ? undefined : `${getHeroScrollHeightVh(experienceMode)}vh`,
      }}
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
      <div
        style={{ "--opening-stack-offset": `${Math.max(0, Math.min(1, (progress - 0.07) / 0.12)) * 65}svh` } as CSSProperties}
        data-opening-stack={mode === "production" && (showImageFallback || activeChapterIndex === 0) ? "true" : "false"}
        className="hero-viewport viewport-screen sticky top-0 overflow-hidden bg-background-bright"
      >
        <div className="hero-scene-layer absolute inset-0">
          {!checkedHeroCapabilities || showImageFallback ? (
            <HeroLoader loading={!showImageFallback} />
          ) : (
            <HeroScene
              onReady={handleSceneReady}
              reducedMotion={reducedMotion}
              onError={handleSceneError}
              debugMode={mode === "review" && debugMode}
              experienceMode={experienceMode}
              activeChapterIndex={activeChapterIndex}
              scrollRootClassName={scrollRootClassName}
              onProgress={handleProgress}
              onActiveChapterChange={handleActiveChapterChange}
            />
          )}
        </div>
        <HeroContent
          mode={mode}
          progress={showImageFallback ? 0 : progress}
          experienceMode={experienceMode}
          activeChapterIndex={showImageFallback ? 0 : activeChapterIndex}
          debugMode={debugMode}
          onToggleDebug={() => setDebugMode((current) => !current)}
        />
      </div>
    </section>
  );
}

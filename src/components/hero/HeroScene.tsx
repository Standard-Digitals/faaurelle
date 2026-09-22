"use client";

import { Canvas } from "@react-three/fiber";
import { Component, type ErrorInfo, type ReactNode, useCallback, useState } from "react";
import * as THREE from "three";
import { HeroDebugControls } from "@/components/hero/HeroDebugControls";
import { HeroLoader } from "@/components/hero/HeroLoader";
import { HeroProductModel } from "@/components/hero/HeroProductModel";
import type { HeroExperienceMode } from "@/lib/responsive";

class HeroSceneErrorBoundary extends Component<
  { children: ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    void errorInfo;
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

export function HeroScene({
  debugMode = false,
  experienceMode,
  activeChapterIndex,
  scrollRootClassName,
  onReady,
  reducedMotion = false,
  onError,
  onProgress,
  onActiveChapterChange,
}: {
  debugMode?: boolean;
  experienceMode: HeroExperienceMode;
  activeChapterIndex: number;
  scrollRootClassName: string;
  onReady: () => void;
  reducedMotion?: boolean;
  onError: () => void;
  onProgress: (progress: number) => void;
  onActiveChapterChange: (index: number) => void;
}) {
  const [modelReady, setModelReady] = useState(false);
  const [debugState, setDebugState] = useState("Initializing scene");

  const handleReady = useCallback(() => {
    setModelReady(true);
    onReady();
  }, [onReady]);

  const handleError = useCallback(() => {
    setModelReady(false);
    onError();
  }, [onError]);

  return (
    <div
      className={[
        "hero-scene relative h-full w-full",
        activeChapterIndex === 1 ? "hero-scene--ingredients-focus" : "",
      ].join(" ")}
    >
      {!modelReady ? (
        <div className="pointer-events-none absolute inset-0 z-[1]">
          <HeroLoader />
        </div>
      ) : null}
      <HeroSceneErrorBoundary onError={handleError}>
        <Canvas
          aria-hidden="true"
          className={[
            "transition-opacity duration-300",
            modelReady ? "opacity-100" : "opacity-0",
          ].join(" ")}
          shadows
          frameloop="demand"
          dpr={[1, 1.65]}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          onCreated={({ gl, scene }) => {
            gl.domElement.addEventListener("webglcontextlost", handleError, { once: true });
            gl.setClearColor("#ffffff", 1);
            scene.background = new THREE.Color("#ffffff");
          }}
        >
          <HeroSceneErrorBoundary onError={handleError}>
            <HeroProductModel
              debugMode={debugMode}
              experienceMode={experienceMode}
              scrollRootClassName={scrollRootClassName}
              timelineEnabled={!reducedMotion}
              onReady={handleReady}
              onProgress={onProgress}
              onActiveChapterChange={onActiveChapterChange}
              onDebug={setDebugState}
            />
          </HeroSceneErrorBoundary>
        </Canvas>
      </HeroSceneErrorBoundary>
      {debugMode ? <HeroDebugControls debugState={debugState} /> : null}
    </div>
  );
}

"use client";

import { Canvas } from "@react-three/fiber";
import { Component, type ErrorInfo, type ReactNode, Suspense, useCallback, useState } from "react";
import * as THREE from "three";
import { HeroDebugControls } from "@/components/hero/HeroDebugControls";
import { HeroLoader } from "@/components/hero/HeroLoader";
import { HeroProductModel } from "@/components/hero/HeroProductModel";
import { HeroStaticFallback } from "@/components/hero/HeroStaticFallback";
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
  onProgress,
  onActiveChapterChange,
}: {
  debugMode?: boolean;
  experienceMode: HeroExperienceMode;
  activeChapterIndex: number;
  scrollRootClassName: string;
  onProgress: (progress: number) => void;
  onActiveChapterChange: (index: number) => void;
}) {
  const [modelReady, setModelReady] = useState(false);
  const [debugState, setDebugState] = useState("Initializing scene");
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleReady = useCallback(() => {
    setModelReady(true);
    setLoadError(null);
  }, []);

  const handleError = useCallback((error: Error) => {
    setLoadError(error.message);
    setModelReady(false);
  }, []);

  if (loadError) {
    return <HeroStaticFallback reason="Static approved render" priority />;
  }

  return (
    <div
      className={[
        "hero-scene relative h-full w-full",
        activeChapterIndex === 1 ? "hero-scene--ingredients-focus" : "",
      ].join(" ")}
    >
      <div
        className={[
          "pointer-events-none absolute inset-0 transition-opacity duration-500",
          modelReady ? "opacity-0" : "opacity-100",
        ].join(" ")}
        aria-hidden={modelReady}
      >
        <HeroLoader />
      </div>
      <Canvas
        aria-hidden="true"
        className={modelReady ? "opacity-100" : "opacity-0"}
        shadows
        frameloop="demand"
        dpr={[1, 1.65]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: "high-performance",
        }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor("#ffffff", 1);
          scene.background = new THREE.Color("#ffffff");
        }}
      >
        <Suspense fallback={null}>
          <HeroSceneErrorBoundary onError={handleError}>
            <HeroProductModel
              debugMode={debugMode}
              experienceMode={experienceMode}
              scrollRootClassName={scrollRootClassName}
              timelineEnabled
              onReady={handleReady}
              onProgress={onProgress}
              onActiveChapterChange={onActiveChapterChange}
              onDebug={setDebugState}
            />
          </HeroSceneErrorBoundary>
        </Suspense>
      </Canvas>
      {debugMode ? <HeroDebugControls debugState={debugState} /> : null}
    </div>
  );
}

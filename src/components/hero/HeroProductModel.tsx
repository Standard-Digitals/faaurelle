"use client";

import { Environment, Lightformer, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useHeroTimeline } from "@/components/hero/HeroTimeline";
import {
  CanonicalProductModel,
  type NewBottleParts,
} from "@/components/product-3d/ApprovedProductModel";
import {
  heroEnvironmentPath,
  heroResponsivePresets,
  resolveHeroResponsivePreset,
} from "@/lib/hero/hero-presets";
import { setHeroProductRoll } from "@/lib/hero/hero-timeline";
import type { HeroExperienceMode } from "@/lib/responsive";

export function HeroProductModel({
  debugMode,
  experienceMode,
  scrollRootClassName,
  timelineEnabled,
  onReady,
  onProgress,
  onActiveChapterChange,
  onDebug,
}: {
  debugMode: boolean;
  experienceMode: HeroExperienceMode;
  scrollRootClassName: string;
  timelineEnabled: boolean;
  onReady: () => void;
  onProgress: (progress: number) => void;
  onActiveChapterChange: (index: number) => void;
  onDebug: (state: string) => void;
}) {
  const { camera, invalidate } = useThree();
  const initialResponsivePreset = heroResponsivePresets[resolveHeroResponsivePreset()];
  const [product, setProduct] = useState<THREE.Group | null>(null);
  const [productParts, setProductParts] = useState<NewBottleParts | null>(null);
  const [lightSweep, setLightSweep] = useState<THREE.DirectionalLight | null>(null);
  const [pointLight, setPointLight] = useState<THREE.PointLight | null>(null);

  useEffect(() => {
    onReady();
  }, [onReady]);

  const handleProductRef = useCallback((node: THREE.Group | null) => {
    if (node) {
      const preset = heroResponsivePresets[resolveHeroResponsivePreset()];
      node.position.set(...preset.openingPosition);
      setHeroProductRoll(
        node,
        preset.openingRotation[0],
        preset.openingRotation[1],
        preset.openingRotation[2],
      );
      node.scale.setScalar(preset.openingScale);
    }
    setProduct(node);
  }, []);

  const handleInitialCameraRef = useCallback(
    (initialCamera: THREE.PerspectiveCamera | null) => {
      initialCamera?.lookAt(...initialResponsivePreset.openingCamera.target);
    },
    [initialResponsivePreset],
  );

  const handleLightSweepRef = useCallback((node: THREE.DirectionalLight | null) => {
    setLightSweep(node);
  }, []);

  const handlePointLightRef = useCallback((node: THREE.PointLight | null) => {
    setPointLight(node);
  }, []);

  const timelineObjects = useMemo(
    () => ({
      product,
      lightSweep,
      pointLight,
      camera,
      invalidate,
    }),
    [camera, invalidate, lightSweep, pointLight, product],
  );

  const { recordFrame } = useHeroTimeline({
    enabled: timelineEnabled && Boolean(product && productParts && lightSweep),
    scrollRootClassName,
    experienceMode,
    debugEnabled: debugMode,
    objects: timelineObjects,
    onProgress,
    onActiveChapterChange,
    onDebug,
  });

  useFrame(recordFrame);

  return (
    <>
      <PerspectiveCamera
        ref={handleInitialCameraRef}
        makeDefault
        position={initialResponsivePreset.openingCamera.position}
        fov={initialResponsivePreset.openingCamera.fov}
      />
      <ambientLight color="#fff4e6" intensity={0.4} />
      <directionalLight
        ref={handleLightSweepRef}
        castShadow
        position={[5.5, 7, 3.2]}
        intensity={0.35}
      />
      <pointLight
        ref={handlePointLightRef}
        position={[1.45, 1.85, 2.1]}
        intensity={6.5}
        distance={5}
        decay={0.5}
        color="#ffe8cf"
      />
      <CanonicalProductModel ref={handleProductRef} onPrepared={setProductParts} />
      <Environment
        files={heroEnvironmentPath}
        background={false}
        resolution={256}
        environmentIntensity={0.65}
      >
        <Lightformer
          form="rect"
          color="#fff2dc"
          intensity={2.2}
          position={[5.5, 7, 4]}
          scale={[3, 4, 1]}
          onUpdate={(light) => light.lookAt(0, 1, 0)}
        />
        <Lightformer
          form="rect"
          color="#e8c99f"
          intensity={1.35}
          position={[3.5, 5, -5]}
          scale={[2.5, 3.5, 1]}
          onUpdate={(light) => light.lookAt(0, 1, 0)}
        />
      </Environment>
      {debugMode ? <OrbitControls makeDefault enableDamping target={[0, 1.3, 0]} /> : null}
    </>
  );
}

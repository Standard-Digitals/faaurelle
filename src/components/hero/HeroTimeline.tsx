"use client";

import { useCallback, useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import * as THREE from "three";
import {
  resolveChapterOneLayout,
  type ChapterOneLayout,
} from "@/lib/hero/chapter-one-layout";
import {
  chapterTwoLayoutEventName,
  resolveChapterTwoLayout,
  type ChapterTwoLayout,
} from "@/lib/hero/chapter-two-layout";
import {
  botanicalEssenceTiming,
  editorialProductChapterTiming,
  getHeroActiveChapterIndex,
  getHeroChapterProgress,
  heroChapterTiming,
  moleculeMergeTiming,
  smoothStepBetween,
} from "@/lib/hero/hero-chapters";
import {
  heroCameraPresets,
  heroResponsivePresets,
  resolveHeroResponsivePreset,
  type HeroCameraPreset,
  type HeroCameraPresetName,
  type HeroResponsivePresetName,
  type HeroVector3,
} from "@/lib/hero/hero-presets";
import {
  formatHeroVector,
  mixHeroVector,
  setHeroProductRoll,
} from "@/lib/hero/hero-timeline";
import { isPhoneHeroMode, type HeroExperienceMode } from "@/lib/responsive";

/* eslint-disable react-hooks/immutability -- Three.js cameras, lights, and scene nodes are imperative render objects. */

export type HeroTimelineObjects = {
  product: THREE.Group | null;
  lightSweep: THREE.DirectionalLight | null;
  pointLight: THREE.PointLight | null;
  camera: THREE.Camera;
  invalidate: () => void;
};

const productFadeColor = new THREE.Color("#ffffff");
const rearFacingProductRotationY = Math.PI;
const completedFrontProductRotationY = Math.PI * 2;
const editorialReferenceViewports: Record<
  HeroResponsivePresetName,
  { width: number; height: number }
> = {
  desktopLandscape: { width: 1895, height: 934 },
  tablet: { width: 1024, height: 800 },
  mobilePortrait: { width: 430, height: 820 },
  mobileLandscape: { width: 850, height: 480 },
};

function resolveChapterThreeEditorialPosition(
  position: HeroVector3,
  presetName: HeroResponsivePresetName,
  viewportAspect: number,
  productHalfWidth: number,
): HeroVector3 {
  if (productHalfWidth <= 0) {
    return position;
  }

  const referenceViewport = editorialReferenceViewports[presetName];
  const referenceAspect = referenceViewport.width / referenceViewport.height;

  return [
    productHalfWidth +
      (position[0] - productHalfWidth) * (viewportAspect / referenceAspect),
    position[1],
    position[2],
  ];
}

function applyOpeningRotation(
  object: THREE.Object3D,
  openingRotation: readonly [number, number, number],
  rearFacingProgress: number,
  frontFacingProgress: number,
) {
  const rearFacingY = THREE.MathUtils.lerp(
    openingRotation[1],
    rearFacingProductRotationY,
    rearFacingProgress,
  );
  setHeroProductRoll(
    object,
    THREE.MathUtils.lerp(openingRotation[0], 0, frontFacingProgress),
    THREE.MathUtils.lerp(rearFacingY, completedFrontProductRotationY, frontFacingProgress),
    THREE.MathUtils.lerp(openingRotation[2], 0, frontFacingProgress),
  );
}

export function useHeroTimeline({
  enabled,
  experienceMode,
  debugEnabled,
  scrollRootClassName,
  objects,
  onProgress,
  onActiveChapterChange,
  onDebug,
}: {
  enabled: boolean;
  experienceMode: HeroExperienceMode;
  debugEnabled: boolean;
  scrollRootClassName: string;
  objects: HeroTimelineObjects;
  onProgress: (progress: number) => void;
  onActiveChapterChange: (index: number) => void;
  onDebug: (state: string) => void;
}) {
  const progressRef = useRef(0);
  const presetRef = useRef<HeroResponsivePresetName>("desktopLandscape");
  const lastFrameRef = useRef(0);
  const fpsRef = useRef(0);
  const chapterThreeBoundsRef = useRef(new THREE.Box3());
  const chapterThreeUnitHalfWidthRef = useRef(new Map<HeroResponsivePresetName, number>());
  const productMaterialOpacityRef = useRef(new WeakMap<THREE.Material, number>());
  const productMaterialColorRef = useRef(new WeakMap<THREE.Material, THREE.Color>());
  const productMaterialEmissiveRef = useRef(new WeakMap<THREE.Material, THREE.Color>());
  const productMaterialEmissiveIntensityRef = useRef(new WeakMap<THREE.Material, number>());

  const applyCamera = useCallback(
    (preset: HeroCameraPreset, shouldInvalidate = true) => {
      objects.camera.position.set(...preset.position);
      objects.camera.lookAt(...preset.target);
      if (objects.camera instanceof THREE.PerspectiveCamera) {
        objects.camera.fov = preset.fov;
        objects.camera.updateProjectionMatrix();
      }
      if (shouldInvalidate) {
        objects.invalidate();
      }
    },
    [objects],
  );

  const applyResponsivePreset = useCallback(() => {
    const presetName = resolveHeroResponsivePreset();
    presetRef.current = presetName;
    const preset = heroResponsivePresets[presetName];
    const responsiveChapterOneLayout =
      presetName === "desktopLandscape"
        ? null
        : resolveChapterOneLayout(
            window.innerWidth,
            window.innerHeight,
            presetName,
            preset,
          );
    const chapterTwoLayout = resolveChapterTwoLayout(
      window.innerWidth,
      window.innerHeight,
      presetName,
      preset,
    );
    const heroProgress = getHeroChapterProgress(progressRef.current, "hero", experienceMode);
    const rearFacing = smoothStepBetween(heroProgress, heroChapterTiming.rearFacingTurn);
    const frontFacing = smoothStepBetween(heroProgress, heroChapterTiming.frontFacingSettle);
    const chapterTwoSettle = smoothStepBetween(heroProgress, heroChapterTiming.chapterTwoSettle);
    const openingPosition = responsiveChapterOneLayout?.openingPosition ?? preset.openingPosition;
    const settledPosition =
      responsiveChapterOneLayout?.settledPosition ?? preset.initialPosition;
    const openingScale = responsiveChapterOneLayout?.openingScale ?? preset.openingScale;
    const settledScale = responsiveChapterOneLayout?.settledScale ?? preset.settledScale;
    if (objects.product) {
      objects.product.position.set(
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(openingPosition[0], settledPosition[0], frontFacing),
          chapterTwoLayout.bottlePosition[0],
          chapterTwoSettle,
        ),
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(openingPosition[1], settledPosition[1], frontFacing),
          chapterTwoLayout.bottlePosition[1],
          chapterTwoSettle,
        ),
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(openingPosition[2], settledPosition[2], frontFacing),
          chapterTwoLayout.bottlePosition[2],
          chapterTwoSettle,
        ),
      );
      applyOpeningRotation(objects.product, preset.openingRotation, rearFacing, frontFacing);
      objects.product.scale.setScalar(
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(openingScale, settledScale, frontFacing),
          chapterTwoLayout.bottleScale,
          chapterTwoSettle,
        ),
      );
    }
    window.dispatchEvent(
      new CustomEvent<ChapterTwoLayout>(chapterTwoLayoutEventName, { detail: chapterTwoLayout }),
    );
    const openingCamera = responsiveChapterOneLayout?.openingCamera ?? preset.openingCamera;
    const introCamera = responsiveChapterOneLayout?.introCamera ?? preset.introCamera;
    const settledCamera = {
      label: frontFacing > 0 ? introCamera.label : openingCamera.label,
      position: mixHeroVector(
        openingCamera.position,
        introCamera.position,
        frontFacing,
      ),
      target: mixHeroVector(openingCamera.target, introCamera.target, frontFacing),
      fov: THREE.MathUtils.lerp(openingCamera.fov, introCamera.fov, frontFacing),
    };
    applyCamera(settledCamera);
  }, [applyCamera, experienceMode, objects]);

  useEffect(() => {
    objects.product?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        if (!productMaterialOpacityRef.current.has(material)) {
          productMaterialOpacityRef.current.set(material, material.opacity);
        }
        if (material instanceof THREE.MeshStandardMaterial) {
          if (!productMaterialColorRef.current.has(material)) {
            productMaterialColorRef.current.set(material, material.color.clone());
          }
          if (!productMaterialEmissiveRef.current.has(material)) {
            productMaterialEmissiveRef.current.set(material, material.emissive.clone());
            productMaterialEmissiveIntensityRef.current.set(material, material.emissiveIntensity);
          }
        }
      });
    });
    applyResponsivePreset();
  }, [applyResponsivePreset, objects]);

  useEffect(() => {
    const handleCameraPreset = (event: Event) => {
      const detail = (event as CustomEvent<HeroCameraPresetName>).detail;
      const preset = heroCameraPresets[detail];
      if (!preset) {
        return;
      }

      applyCamera(preset);
      if (debugEnabled) {
        onDebug(
          [
            `preset: manual ${detail}`,
            `camera: ${preset.position.map((value) => value.toFixed(2)).join(", ")}`,
            `target: ${preset.target.map((value) => value.toFixed(2)).join(", ")}`,
            `progress: ${progressRef.current.toFixed(3)}`,
            `fps: ${Math.round(fpsRef.current)}`,
          ].join("\n"),
        );
      }
    };

    window.addEventListener("hero-3d-camera-preset", handleCameraPreset);

    return () => window.removeEventListener("hero-3d-camera-preset", handleCameraPreset);
  }, [applyCamera, debugEnabled, onDebug]);

  useEffect(() => {
    if (!enabled || !objects.product || !objects.lightSweep) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    const setProductOpacity = (opacity: number) => {
      if (!objects.product) {
        return;
      }
      objects.product.visible = opacity > 0.002;
      objects.product.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) {
          return;
        }
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          const baseOpacity = productMaterialOpacityRef.current.get(material) ?? 1;
          material.transparent = baseOpacity < 1;
          material.opacity = baseOpacity;
          if (material instanceof THREE.MeshStandardMaterial) {
            const baseColor = productMaterialColorRef.current.get(material);
            const baseEmissive = productMaterialEmissiveRef.current.get(material);
            if (baseColor) {
              material.color.copy(baseColor).lerp(productFadeColor, 1 - opacity);
            }
            if (baseEmissive) {
              material.emissive.copy(baseEmissive).lerp(productFadeColor, 1 - opacity);
              material.emissiveIntensity = THREE.MathUtils.lerp(
                productMaterialEmissiveIntensityRef.current.get(material) ?? 1,
                1,
                1 - opacity,
              );
            }
          }
          material.needsUpdate = true;
        });
      });
    };

    const updateHeroChapter = (
      heroProgress: number,
      presetName: HeroResponsivePresetName,
      preset: (typeof heroResponsivePresets)[HeroResponsivePresetName],
      chapterTwoLayout: ChapterTwoLayout,
    ) => {
      const responsiveChapterOneLayout: ChapterOneLayout | null =
        presetName === "desktopLandscape"
          ? null
          : resolveChapterOneLayout(
              window.innerWidth,
              window.innerHeight,
              presetName,
              preset,
            );
      const rearFacing = smoothStepBetween(heroProgress, heroChapterTiming.rearFacingTurn);
      const frontFacing = smoothStepBetween(heroProgress, heroChapterTiming.frontFacingSettle);
      const chapterTwoSettle = smoothStepBetween(heroProgress, heroChapterTiming.chapterTwoSettle);
      const openingPosition = responsiveChapterOneLayout?.openingPosition ?? preset.openingPosition;
      const settledPosition =
        responsiveChapterOneLayout?.settledPosition ?? preset.initialPosition;
      const openingScale = responsiveChapterOneLayout?.openingScale ?? preset.openingScale;
      const settledScale = responsiveChapterOneLayout?.settledScale ?? preset.settledScale;
      const productPosition = [
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(openingPosition[0], settledPosition[0], frontFacing),
          chapterTwoLayout.bottlePosition[0],
          chapterTwoSettle,
        ),
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(openingPosition[1], settledPosition[1], frontFacing),
          chapterTwoLayout.bottlePosition[1],
          chapterTwoSettle,
        ),
        THREE.MathUtils.lerp(
          THREE.MathUtils.lerp(openingPosition[2], settledPosition[2], frontFacing),
          chapterTwoLayout.bottlePosition[2],
          chapterTwoSettle,
        ),
      ] as const;
      const introScale = THREE.MathUtils.lerp(
        openingScale,
        settledScale,
        frontFacing,
      );
      const productScale = THREE.MathUtils.lerp(
        introScale,
        chapterTwoLayout.bottleScale,
        chapterTwoSettle,
      );

      objects.product?.position.set(...productPosition);
      if (objects.product) {
        applyOpeningRotation(objects.product, preset.openingRotation, rearFacing, frontFacing);
      }
      objects.product?.scale.setScalar(productScale);
      setProductOpacity(1);

      objects.lightSweep!.intensity = 0.35;
      objects.lightSweep!.position.x = 5.5;

      const openingCamera = responsiveChapterOneLayout?.openingCamera ?? preset.openingCamera;
      const resolvedIntroCamera = responsiveChapterOneLayout?.introCamera ?? preset.introCamera;
      const introCamera = {
        label: frontFacing > 0 ? resolvedIntroCamera.label : openingCamera.label,
        position: mixHeroVector(
          openingCamera.position,
          resolvedIntroCamera.position,
          frontFacing,
        ),
        target: mixHeroVector(openingCamera.target, resolvedIntroCamera.target, frontFacing),
        fov: THREE.MathUtils.lerp(openingCamera.fov, resolvedIntroCamera.fov, frontFacing),
      };
      return {
        camera: {
          label: chapterTwoSettle > 0 ? preset.chapterTwoCamera.label : introCamera.label,
          position: mixHeroVector(
            introCamera.position,
            preset.chapterTwoCamera.position,
            chapterTwoSettle,
          ),
          target: mixHeroVector(
            introCamera.target,
            preset.chapterTwoCamera.target,
            chapterTwoSettle,
          ),
          fov: THREE.MathUtils.lerp(introCamera.fov, preset.chapterTwoCamera.fov, chapterTwoSettle),
        },
      };
    };

    const updateBotanicalChapterHandoff = (
      botanicalProgress: number,
      chapterTwoLayout: ChapterTwoLayout,
      currentCamera: HeroCameraPreset,
    ) => {
      const productFadeOut = smoothStepBetween(
        botanicalProgress,
        botanicalEssenceTiming.productFadeOut,
      );
      objects.product?.position.set(...chapterTwoLayout.bottlePosition);
      objects.product?.scale.setScalar(chapterTwoLayout.bottleScale);
      setProductOpacity(1 - productFadeOut);

      return currentCamera;
    };

    const updateEditorialProductChapter = (
      chapterProgress: number,
      presetName: HeroResponsivePresetName,
      preset: (typeof heroResponsivePresets)[HeroResponsivePresetName],
      currentCamera: HeroCameraPreset,
    ) => {
      if (chapterProgress <= 0) {
        return currentCamera;
      }

      const entrance = smoothStepBetween(
        chapterProgress,
        editorialProductChapterTiming.bottleEntrance,
      );
      const fadeIn = smoothStepBetween(chapterProgress, editorialProductChapterTiming.bottleFadeIn);
      const cameraSettle = smoothStepBetween(
        chapterProgress,
        editorialProductChapterTiming.cameraSettle,
      );

      const productScale = THREE.MathUtils.lerp(
        preset.chapterThreeEditorialScale * 0.94,
        preset.chapterThreeEditorialScale,
        entrance,
      );
      let productHalfWidth = 0;
      if (objects.product) {
        setHeroProductRoll(
          objects.product,
          preset.chapterThreeEditorialRotation[0],
          preset.chapterThreeEditorialRotation[1],
          preset.chapterThreeEditorialRotation[2],
        );
        objects.product.scale.setScalar(productScale);

        let unitHalfWidth = chapterThreeUnitHalfWidthRef.current.get(presetName);
        if (unitHalfWidth === undefined) {
          objects.product.updateWorldMatrix(true, true);
          const bounds = chapterThreeBoundsRef.current.setFromObject(objects.product);
          const measuredHalfWidth = (bounds.max.x - bounds.min.x) / (2 * productScale);
          if (Number.isFinite(measuredHalfWidth) && measuredHalfWidth > 0) {
            unitHalfWidth = measuredHalfWidth;
            chapterThreeUnitHalfWidthRef.current.set(presetName, measuredHalfWidth);
          }
        }
        productHalfWidth = (unitHalfWidth ?? 0) * productScale;
      }

      const viewportAspect = Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight);
      const entryPosition = resolveChapterThreeEditorialPosition(
        preset.chapterThreeEditorialEntryPosition,
        presetName,
        viewportAspect,
        productHalfWidth,
      );
      const settledPosition = resolveChapterThreeEditorialPosition(
        preset.chapterThreeEditorialPosition,
        presetName,
        viewportAspect,
        productHalfWidth,
      );
      objects.product?.position.set(...mixHeroVector(entryPosition, settledPosition, entrance));
      setProductOpacity(fadeIn);

      return {
        label: entrance > 0 ? preset.chapterThreeEditorialCamera.label : currentCamera.label,
        position: mixHeroVector(
          currentCamera.position,
          preset.chapterThreeEditorialCamera.position,
          cameraSettle,
        ),
        target: mixHeroVector(
          currentCamera.target,
          preset.chapterThreeEditorialCamera.target,
          cameraSettle,
        ),
        fov: THREE.MathUtils.lerp(
          currentCamera.fov,
          preset.chapterThreeEditorialCamera.fov,
          cameraSettle,
        ),
      };
    };

    const updateMoleculeMergeChapter = (mergeProgress: number) => {
      const sectionThreeExit = smoothStepBetween(
        mergeProgress,
        moleculeMergeTiming.sectionThreeExit,
      );
      setProductOpacity(1 - sectionThreeExit);
      const sceneReveal = smoothStepBetween(mergeProgress, moleculeMergeTiming.sceneReveal);
      if (objects.pointLight) {
        objects.pointLight.intensity = 6.5 * (1 - sceneReveal);
      }
      if (objects.lightSweep) {
        objects.lightSweep.intensity = 0.35 * (1 - sceneReveal);
      }
      return sectionThreeExit;
    };

    const updateExperience = (scrollProgress: number) => {
      const presetName = presetRef.current;
      const preset = heroResponsivePresets[presetName];
      const chapterTwoLayout = resolveChapterTwoLayout(
        window.innerWidth,
        window.innerHeight,
        presetName,
        preset,
      );
      const heroProgress = getHeroChapterProgress(scrollProgress, "hero", experienceMode);
      const rawBotanicalProgress = getHeroChapterProgress(
        scrollProgress,
        "botanicalEssence",
        experienceMode,
      );
      const botanicalProgress =
        isPhoneHeroMode(experienceMode) || heroProgress >= 1 ? rawBotanicalProgress : 0;
      const keyIngredientsProgress = getHeroChapterProgress(
        scrollProgress,
        "keyIngredients",
        experienceMode,
      );
      const silkFusionProgress = getHeroChapterProgress(
        scrollProgress,
        "silkBotaniqueFusion",
        experienceMode,
      );

      progressRef.current = scrollProgress;
      const heroState = updateHeroChapter(heroProgress, presetName, preset, chapterTwoLayout);
      const botanicalCamera =
        heroProgress < 1
          ? heroState.camera
          : updateBotanicalChapterHandoff(botanicalProgress, chapterTwoLayout, heroState.camera);
      const activeCamera = updateEditorialProductChapter(
        keyIngredientsProgress,
        presetName,
        preset,
        botanicalCamera,
      );
      updateMoleculeMergeChapter(silkFusionProgress);
      applyCamera(activeCamera, false);
      onProgress(scrollProgress);
      const resolvedChapterIndex = getHeroActiveChapterIndex(scrollProgress, experienceMode);
      const activeChapterIndex = isPhoneHeroMode(experienceMode)
        ? resolvedChapterIndex
        : heroProgress < 1
          ? 0
          : resolvedChapterIndex;
      onActiveChapterChange(activeChapterIndex);
      if (debugEnabled) {
        onDebug(
          [
            `preset: ${presetRef.current}`,
            `camera: ${formatHeroVector(objects.camera.position)}`,
            `target: ${activeCamera.target.map((value) => value.toFixed(2)).join(", ")}`,
            `product pos: ${objects.product ? formatHeroVector(objects.product.position) : "missing"}`,
            `product rot: ${objects.product ? formatHeroVector(objects.product.rotation) : "missing"}`,
            `scroll: ${scrollProgress.toFixed(3)}`,
            `hero: ${heroProgress.toFixed(3)}`,
            `botanical: ${botanicalProgress.toFixed(3)}`,
            `key ingredients: ${keyIngredientsProgress.toFixed(3)}`,
            `silk fusion: ${silkFusionProgress.toFixed(3)}`,
            `fps: ${Math.round(fpsRef.current)}`,
          ].join("\n"),
        );
      }
      objects.invalidate();
    };

    const usesNativeScroll =
      isPhoneHeroMode(experienceMode) || window.matchMedia("(pointer: coarse)").matches;
    const lenis = usesNativeScroll
      ? null
      : new Lenis({
          duration: 0.72,
          lerp: 0.18,
          smoothWheel: true,
        });
    const updateLenis = (time: number) => {
      lenis?.raf(time * 1000);
    };
    if (lenis) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(updateLenis);
      gsap.ticker.lagSmoothing(0);
    }

    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: `.${scrollRootClassName}`,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => updateExperience(self.progress),
      },
    });
    timeline.to({ value: 0 }, { value: 1, duration: 1 });
    updateExperience(0);

    const handleResize = () => {
      applyResponsivePreset();
      updateExperience(progressRef.current);
      ScrollTrigger.refresh();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      timeline.scrollTrigger?.kill();
      timeline.kill();
      if (lenis) {
        gsap.ticker.remove(updateLenis);
        lenis.destroy();
      }
    };
  }, [
    applyCamera,
    applyResponsivePreset,
    debugEnabled,
    enabled,
    experienceMode,
    objects,
    onActiveChapterChange,
    onDebug,
    onProgress,
    scrollRootClassName,
  ]);

  const recordFrame = useCallback(() => {
    if (!debugEnabled) {
      return;
    }
    const now = performance.now();
    if (lastFrameRef.current === 0) {
      lastFrameRef.current = now;
      return;
    }

    const delta = now - lastFrameRef.current;
    if (delta > 0) {
      fpsRef.current = 1000 / delta;
    }
    lastFrameRef.current = now;
  }, [debugEnabled]);

  return { recordFrame };
}

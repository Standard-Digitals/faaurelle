"use client";

import {
  Environment,
  Lightformer,
  OrbitControls,
  PerspectiveCamera,
  useEnvironment,
} from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

function collectMaterials(scene: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) =>
        materials.add(material),
      );
    }
  });
  return [...materials];
}

// Compiles every shader variant the first frame uses without blocking the main thread:
// the on-screen pass, then the glass transmission pass, which draws into an offscreen
// linear target without tone mapping and renders double-sided glass back faces only.
async function precompileHeroShaders(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  await renderer.compileAsync(scene, camera);

  const materials = collectMaterials(scene);
  const doubleSidedGlass = materials.filter(
    (material) =>
      material instanceof THREE.MeshPhysicalMaterial &&
      material.transmission > 0 &&
      material.side === THREE.DoubleSide,
  );
  if (
    !materials.some(
      (material) => material instanceof THREE.MeshPhysicalMaterial && material.transmission > 0,
    )
  ) {
    return;
  }

  const transmissionTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const previousTarget = renderer.getRenderTarget();
  doubleSidedGlass.forEach((material) => {
    material.side = THREE.BackSide;
  });
  renderer.setRenderTarget(transmissionTarget);
  const transmissionPass = renderer.compileAsync(scene, camera);
  renderer.setRenderTarget(previousTarget);
  doubleSidedGlass.forEach((material) => {
    material.side = THREE.DoubleSide;
  });
  try {
    await transmissionPass;
  } finally {
    transmissionTarget.dispose();
    // Each material now points at its offscreen variant; make the next render look its
    // on-screen program up again (it is cached, so nothing recompiles).
    materials.forEach((material) => {
      material.needsUpdate = true;
    });
  }
}

function HeroEnvironment({ onReady }: { onReady: () => void }) {
  // Resolve the HDR before mounting the environment capture portal.
  useEnvironment({ files: heroEnvironmentPath });
  useEffect(() => {
    onReady();
  }, [onReady]);

  return (
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
  );
}

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
  const { camera, gl, invalidate, scene } = useThree();
  const initialResponsivePreset = heroResponsivePresets[resolveHeroResponsivePreset()];
  const [product, setProduct] = useState<THREE.Group | null>(null);
  const [productParts, setProductParts] = useState<NewBottleParts | null>(null);
  const [lightSweep, setLightSweep] = useState<THREE.DirectionalLight | null>(null);
  const [pointLight, setPointLight] = useState<THREE.PointLight | null>(null);
  const [environmentReady, setEnvironmentReady] = useState(false);
  // A ref, not state: the frame requested below can run before React re-renders, and a
  // stale "not ready" there would end the on-demand frame loop for good.
  const shadersReadyRef = useRef(false);

  const readyFrames = useRef(0);
  const readyNotified = useRef(false);

  useEffect(() => {
    if (!productParts || !environmentReady) {
      return;
    }

    // Linking the bottle's physical materials blocks the main thread for seconds on
    // Windows/ANGLE when it happens inside the first render. Compile them in parallel
    // while the poster is still showing, and hold rendering until they are linked.
    let cancelled = false;
    precompileHeroShaders(gl, scene, camera)
      .catch(() => undefined)
      .then(() => {
        if (cancelled) {
          return;
        }
        shadersReadyRef.current = true;
        invalidate();
      });
    return () => {
      cancelled = true;
    };
  }, [camera, environmentReady, gl, invalidate, productParts, scene]);

  // A positive priority hands rendering to this callback, so nothing is drawn (and no
  // shader is linked synchronously) until the parallel compile above has finished.
  useFrame(({ gl: renderer, scene: frameScene, camera: frameCamera }) => {
    if (shadersReadyRef.current) {
      renderer.render(frameScene, frameCamera);
    }
  }, 1);

  useFrame(() => {
    if (!productParts || !environmentReady || !shadersReadyRef.current || readyNotified.current) {
      return;
    }

    // Allow one fully lit frame to render before revealing the canvas.
    readyFrames.current += 1;
    if (readyFrames.current < 2) {
      invalidate();
      return;
    }

    readyNotified.current = true;
    onReady();
  });

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

  const handleProductPrepared = useCallback((parts: NewBottleParts | null) => {
    setProductParts(parts);
  }, []);

  const handleEnvironmentReady = useCallback(() => {
    setEnvironmentReady(true);
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
    enabled: timelineEnabled && environmentReady && Boolean(product && productParts && lightSweep),
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
      <Suspense fallback={null}>
        <CanonicalProductModel ref={handleProductRef} onPrepared={handleProductPrepared} />
      </Suspense>
      <Suspense fallback={null}>
        <HeroEnvironment onReady={handleEnvironmentReady} />
      </Suspense>
      {debugMode ? <OrbitControls makeDefault enableDamping target={[0, 1.3, 0]} /> : null}
    </>
  );
}

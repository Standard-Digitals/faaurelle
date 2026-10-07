import * as THREE from "three";
import type {
  HeroCameraPreset,
  HeroResponsivePreset,
  HeroResponsivePresetName,
  HeroVector3,
} from "@/lib/hero/hero-presets";

export type ChapterOneLayout = {
  openingCamera: HeroCameraPreset;
  introCamera: HeroCameraPreset;
  openingPosition: HeroVector3;
  settledPosition: HeroVector3;
  openingScale: number;
  settledScale: number;
};

type ChapterOneFitConfig = {
  referencePortrait: readonly [width: number, height: number];
  referenceLandscape: readonly [width: number, height: number];
  minimumScaleFactor: number;
  textZoneRatio: number;
  minimumGap: number;
  bottomClearance: number;
  maximumVerticalCorrection: number;
};

export const chapterOneFitConfig: Record<Exclude<HeroResponsivePresetName, "desktopLandscape">, ChapterOneFitConfig> = {
  tablet: {
    referencePortrait: [768, 1024],
    referenceLandscape: [1024, 768],
    minimumScaleFactor: 0.82,
    textZoneRatio: 0.4,
    minimumGap: 48,
    bottomClearance: 40,
    maximumVerticalCorrection: 0.18,
  },
  mobilePortrait: {
    referencePortrait: [430, 820],
    referenceLandscape: [430, 820],
    minimumScaleFactor: 0.82,
    textZoneRatio: 0.43,
    minimumGap: 40,
    bottomClearance: 28,
    maximumVerticalCorrection: 0.22,
  },
  mobileLandscape: {
    referencePortrait: [850, 480],
    referenceLandscape: [850, 480],
    minimumScaleFactor: 0.76,
    textZoneRatio: 0.48,
    minimumGap: 28,
    bottomClearance: 20,
    maximumVerticalCorrection: 0.24,
  },
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

// Matches canonicalProductHeight: the settled bottle stands upright with its base at its origin.
const settledBottleHeight = 4;
const projectionCamera = new THREE.PerspectiveCamera();
const projectedPoint = new THREE.Vector3();

function projectToViewportY(point: HeroVector3, viewportHeight: number) {
  projectedPoint.set(...point).project(projectionCamera);
  return ((1 - projectedPoint.y) / 2) * viewportHeight;
}

// Phone copy has a fixed pixel height, so on tall screens a height-relative bottle
// grows up into the "Shop the elixir" button. Push the upright bottle below the
// measured copy, and shrink it only when it would otherwise run off the bottom.
function fitSettledBottleBelowCopy(
  width: number,
  height: number,
  copyBottom: number,
  config: ChapterOneFitConfig,
  camera: HeroCameraPreset,
  position: HeroVector3,
  scale: number,
): { position: HeroVector3; scale: number } {
  projectionCamera.fov = camera.fov;
  projectionCamera.aspect = width / height;
  projectionCamera.position.set(...camera.position);
  projectionCamera.lookAt(...camera.target);
  projectionCamera.updateProjectionMatrix();
  projectionCamera.updateMatrixWorld(true);

  const minimumTop = copyBottom + config.minimumGap;
  const maximumBottom = height - config.bottomClearance;
  const [x, , z] = position;
  let y = position[1];
  let fittedScale = scale;

  for (let pass = 0; pass < 3; pass += 1) {
    const top = projectToViewportY([x, y + settledBottleHeight * fittedScale, z], height);
    const base = projectToViewportY([x, y, z], height);
    const pixelsPerUnit = (base - top) / (settledBottleHeight * fittedScale);
    if (top >= minimumTop - 0.5 || pixelsPerUnit <= 0) {
      break;
    }

    const roomAvailable = maximumBottom - minimumTop;
    if (base - top > roomAvailable) {
      fittedScale = Math.max(scale * config.minimumScaleFactor, fittedScale * (roomAvailable / (base - top)));
    }
    const fittedTop = projectToViewportY([x, y + settledBottleHeight * fittedScale, z], height);
    y -= (minimumTop - fittedTop) / pixelsPerUnit;
  }

  return { position: [x, y, z], scale: fittedScale };
}

// Corners of the pump tip in the product's local space (base at origin, height 4).
const pumpTipCorners = [-0.45, 0.45].flatMap((x) =>
  [-0.45, 0.45].map((z) => new THREE.Vector3(x, settledBottleHeight, z)),
);
const worldCorner = new THREE.Vector3();

// While the bottle turns from its diagonal opening pose to upright it is briefly
// larger than either end pose. Returns how far (in world units, <= 0) to lower it
// so the pump tip stays below the phone copy.
export function resolveCopyClearanceShift(
  width: number,
  height: number,
  copyBottom: number,
  camera: HeroCameraPreset,
  product: THREE.Object3D,
) {
  projectionCamera.fov = camera.fov;
  projectionCamera.aspect = width / height;
  projectionCamera.position.set(...camera.position);
  projectionCamera.lookAt(...camera.target);
  projectionCamera.updateProjectionMatrix();
  projectionCamera.updateMatrixWorld(true);
  product.updateMatrixWorld(true);

  const minimumTop = copyBottom + chapterOneFitConfig.mobilePortrait.minimumGap;
  let highest = Infinity;
  let highestWorld: HeroVector3 = [0, 0, 0];
  for (const corner of pumpTipCorners) {
    worldCorner.copy(corner).applyMatrix4(product.matrixWorld);
    const y = projectToViewportY([worldCorner.x, worldCorner.y, worldCorner.z], height);
    if (y < highest) {
      highest = y;
      highestWorld = [worldCorner.x, worldCorner.y, worldCorner.z];
    }
  }
  if (highest >= minimumTop) {
    return 0;
  }

  const lowered = projectToViewportY([highestWorld[0], highestWorld[1] - 1, highestWorld[2]], height);
  const pixelsPerUnit = lowered - highest;
  return pixelsPerUnit > 0 ? -(minimumTop - highest) / pixelsPerUnit : 0;
}

function offsetCamera(camera: HeroCameraPreset, offsetX: number, offsetY: number): HeroCameraPreset {
  return {
    ...camera,
    position: [camera.position[0] + offsetX, camera.position[1] + offsetY, camera.position[2]],
    target: [camera.target[0] + offsetX, camera.target[1] + offsetY, camera.target[2]],
  };
}

export function resolveChapterOneLayout(
  viewportWidth: number,
  viewportHeight: number,
  presetName: Exclude<HeroResponsivePresetName, "desktopLandscape">,
  preset: HeroResponsivePreset,
  copyBottom?: number | null,
): ChapterOneLayout {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const config = chapterOneFitConfig[presetName];
  const reference =
    height >= width ? config.referencePortrait : config.referenceLandscape;
  const widthFit = width / reference[0];
  const availableBottleHeight = Math.max(
    1,
    height - height * config.textZoneRatio - config.minimumGap - config.bottomClearance,
  );
  const referenceBottleHeight =
    reference[1] -
    reference[1] * config.textZoneRatio -
    config.minimumGap -
    config.bottomClearance;
  const heightFit = availableBottleHeight / referenceBottleHeight;
  const scaleFactor = clamp(
    Math.min(widthFit, heightFit, 1),
    config.minimumScaleFactor,
    1,
  );
  const shortViewportPressure = clamp(1 - height / reference[1], 0, 1);
  const aspect = width / height;
  const referenceAspect = reference[0] / reference[1];
  const horizontalFit = clamp(aspect / referenceAspect, 0.82, 1.08);
  const verticalCorrection = Math.min(
    config.maximumVerticalCorrection,
    shortViewportPressure * config.maximumVerticalCorrection,
  );

  const openingPosition: HeroVector3 = [
    preset.openingPosition[0] * horizontalFit,
    preset.openingPosition[1] - verticalCorrection,
    preset.openingPosition[2],
  ];
  let settledPosition: HeroVector3 = [
    preset.initialPosition[0] * horizontalFit,
    preset.initialPosition[1] - verticalCorrection * 0.72,
    preset.initialPosition[2],
  ];
  let settledScale = preset.settledScale * scaleFactor;
  const cameraOffsetX = preset.openingPosition[0] * (horizontalFit - 1) * 0.35;
  const cameraOffsetY = -verticalCorrection * 0.2;
  const introCamera = offsetCamera(preset.introCamera, cameraOffsetX * 0.45, cameraOffsetY);

  if (presetName === "mobilePortrait" && copyBottom != null && copyBottom > 0) {
    ({ position: settledPosition, scale: settledScale } = fitSettledBottleBelowCopy(
      width,
      height,
      copyBottom,
      config,
      introCamera,
      settledPosition,
      settledScale,
    ));
  }

  return {
    openingCamera: offsetCamera(preset.openingCamera, cameraOffsetX, cameraOffsetY),
    introCamera,
    openingPosition,
    settledPosition,
    openingScale: preset.openingScale * scaleFactor,
    settledScale,
  };
}

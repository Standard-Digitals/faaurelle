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

const fitConfig: Record<Exclude<HeroResponsivePresetName, "desktopLandscape">, ChapterOneFitConfig> = {
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
): ChapterOneLayout {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const config = fitConfig[presetName];
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
  const settledPosition: HeroVector3 = [
    preset.initialPosition[0] * horizontalFit,
    preset.initialPosition[1] - verticalCorrection * 0.72,
    preset.initialPosition[2],
  ];
  const cameraOffsetX = preset.openingPosition[0] * (horizontalFit - 1) * 0.35;
  const cameraOffsetY = -verticalCorrection * 0.2;

  return {
    openingCamera: offsetCamera(preset.openingCamera, cameraOffsetX, cameraOffsetY),
    introCamera: offsetCamera(preset.introCamera, cameraOffsetX * 0.45, cameraOffsetY),
    openingPosition,
    settledPosition,
    openingScale: preset.openingScale * scaleFactor,
    settledScale: preset.settledScale * scaleFactor,
  };
}

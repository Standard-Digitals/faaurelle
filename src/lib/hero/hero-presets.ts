import { responsiveBreakpoints } from "@/lib/responsive";

export type HeroCameraPresetName = "front" | "threeQuarter" | "side" | "labelCloseup";
export type HeroResponsivePresetName =
  "desktopLandscape" | "tablet" | "mobilePortrait" | "mobileLandscape";

export type HeroVector3 = [number, number, number];

export type HeroCameraPreset = {
  label: string;
  position: HeroVector3;
  target: HeroVector3;
  fov: number;
};

export type HeroResponsivePreset = {
  openingCamera: HeroCameraPreset;
  introCamera: HeroCameraPreset;
  labelFramingCamera: HeroCameraPreset;
  chapterTwoCamera: HeroCameraPreset;
  chapterThreeEditorialCamera: HeroCameraPreset;
  camera: HeroCameraPreset;
  openingPosition: HeroVector3;
  openingRotation: HeroVector3;
  openingScale: number;
  settledScale: number;
  chapterTwoScale: number;
  bottleScale: number;
  centerScale: number;
  focusScale: number;
  chapterTwoPosition: HeroVector3;
  chapterThreeEditorialEntryPosition: HeroVector3;
  chapterThreeEditorialPosition: HeroVector3;
  chapterThreeEditorialRotation: HeroVector3;
  chapterThreeEditorialScale: number;
  bottlePosition: HeroVector3;
  initialPosition: HeroVector3;
  labelCamera: HeroCameraPreset;
};

const heroBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const heroModelPath = `${heroBasePath}/models/hero/fa-aurelle-new-bottle-runtime-v7.glb`;
export const heroEnvironmentPath = `${heroBasePath}/environments/hero/fa-aurelle-serum-studio-v1.hdr`;
export const heroStaticFallbackPath = `${heroBasePath}/images/products/best-seller-hair-elixir.png`;
export const moleculeMergeStaticFallbackPath = `${heroBasePath}/images/sections/viscous-serum-merge/serum-blob.png`;

export const heroCameraPresets: Record<HeroCameraPresetName, HeroCameraPreset> = {
  front: {
    label: "Front",
    position: [0, 1.68, 6.2],
    target: [0, 1.35, 0],
    fov: 34,
  },
  threeQuarter: {
    label: "Three-quarter",
    position: [3.2, 1.74, 5.25],
    target: [0, 1.35, 0],
    fov: 35,
  },
  side: {
    label: "Side",
    position: [5.6, 1.7, 0.1],
    target: [0, 1.35, 0],
    fov: 35,
  },
  labelCloseup: {
    label: "Label close-up",
    position: [0, 0.33, 4],
    target: [0, 0.23, 0.3],
    fov: 28,
  },
};

export const heroResponsivePresets: Record<HeroResponsivePresetName, HeroResponsivePreset> = {
  desktopLandscape: {
    openingCamera: {
      label: "Desktop diagonal opening",
      position: [1.38, -0.5, 3.25],
      target: [1.38, 0.9, 0],
      fov: 33,
    },
    openingPosition: [0.95, -0.35, 0],
    openingRotation: [-0.24, 0.25, -0.65],
    openingScale: 0.65,

    introCamera: {
      label: "Desktop opening front",
      position: [1.3, 1.27, 6.13],
      target: [1.3, 0.94, 0],
      fov: 34,
    },
    labelFramingCamera: {
      label: "Desktop label framing",
      position: [0.3, 0.72, 5.15],
      target: [0.18, 0.28, 0.2],
      fov: 31,
    },
    chapterTwoCamera: {
      label: "Desktop botanical composition",
      position: [0, 1.25, 7.5],
      target: [0, 1.25, 0],
      fov: 34,
    },
    chapterThreeEditorialCamera: {
      label: "Desktop editorial product macro",
      position: [0, 1.25, 7.5],
      target: [0, 1.1, 0],
      fov: 34,
    },
    camera: {
      label: "Desktop Chapter 3 start",
      position: [0, 1.25, 7.5],
      target: [0, 1.25, 0],
      fov: 34,
    },
    settledScale: 0.68,
    chapterTwoScale: 0.7,
    bottleScale: 0.9,
    centerScale: 0.9,
    focusScale: 0.94,
    chapterTwoPosition: [0, -0.6, -1.2],
    chapterThreeEditorialEntryPosition: [10, 1, 0],
    chapterThreeEditorialPosition: [6.9, 1, 0],
    chapterThreeEditorialRotation: [0, 0.35, 1.5707963267948966],
    chapterThreeEditorialScale: 1.48,
    bottlePosition: [0, -0.72, 0],
    initialPosition: [1.3, -0.52, 0],
    labelCamera: {
      label: "Desktop label emphasis",
      position: [0.1, 0.48, 4.85],
      target: [0.08, 0.08, 0.2],
      fov: 31,
    },
  },
  tablet: {
    openingCamera: {
      label: "Tablet diagonal opening",
      position: [0.12, 0.76, 5.72],
      target: [0.12, 0.25, 0],
      fov: 38,
    },
    introCamera: {
      label: "Tablet opening front",
      position: [0.08, 0.79, 5.57],
      target: [0.08, 0.34, 0],
      fov: 38,
    },
    labelFramingCamera: {
      label: "Tablet label framing",
      position: [0.18, 0.25, 4.85],
      target: [0.12, -0.18, 0.22],
      fov: 33,
    },
    chapterTwoCamera: {
      label: "Tablet botanical composition",
      position: [0, 0.85, 6.8],
      target: [0, 0.4, 0],
      fov: 38,
    },
    chapterThreeEditorialCamera: {
      label: "Tablet editorial product macro",
      position: [0, 0.85, 6.8],
      target: [0, 0.35, 0],
      fov: 38,
    },
    camera: {
      label: "Tablet Chapter 3 start",
      position: [0, 0.85, 6.8],
      target: [0, 0.4, 0],
      fov: 38,
    },
    openingPosition: [-0.3, -1.5, 0],
    openingRotation: [-0.9, 0.2, -0.65],
    openingScale: 0.68,
    settledScale: 0.53,
    chapterTwoScale: 0.7,
    bottleScale: 0.92,
    centerScale: 1.2,
    focusScale: 0.94,
    chapterTwoPosition: [0, -0.61, 0],
    chapterThreeEditorialEntryPosition: [4.5, -0.25, 0],
    chapterThreeEditorialPosition: [2.55, -0.25, 0],
    chapterThreeEditorialRotation: [0, 0.35, 1.5707963267948966],
    chapterThreeEditorialScale: 1.18,
    bottlePosition: [0, -1.36, 0],
    initialPosition: [0.04, -1.38, 0],
    labelCamera: {
      label: "Tablet label",
      position: [0, -0.29, 4],
      target: [0, -0.39, 0.3],
      fov: 29,
    },
  },
  mobilePortrait: {
    openingCamera: {
      label: "Mobile portrait diagonal opening",
      position: [0.08, 0.48, 4.95],
      target: [0.08, 0.02, 0],
      fov: 43,
    },
    introCamera: {
      label: "Mobile portrait opening front",
      position: [0.04, 0.56, 4.54],
      target: [0.04, 0.11, 0],
      fov: 42,
    },
    labelFramingCamera: {
      label: "Mobile portrait label framing",
      position: [0.12, -0.05, 4.35],
      target: [0.1, -0.42, 0.2],
      fov: 37,
    },
    chapterTwoCamera: {
      label: "Mobile portrait botanical composition",
      position: [0, 0.62, 5.2],
      target: [0, 0.17, 0],
      fov: 42,
    },
    chapterThreeEditorialCamera: {
      label: "Mobile portrait editorial product macro",
      position: [0, 0.62, 5.2],
      target: [0, -0.05, 0],
      fov: 42,
    },
    camera: {
      label: "Mobile portrait Chapter 3 start",
      position: [0, 0.62, 5.2],
      target: [0, 0.17, 0],
      fov: 42,
    },
    openingPosition: [-0.35, -1.7, 0],
    openingRotation: [-0.9, 0.2, -0.65],
    openingScale: 0.68,
    settledScale: 0.53,
    chapterTwoScale: 0.5,
    bottleScale: 0.78,
    centerScale: 1.2,
    focusScale: 0.64,
    chapterTwoPosition: [0, -0.55, 0],
    chapterThreeEditorialEntryPosition: [3.2, -1.05, 0],
    chapterThreeEditorialPosition: [1.45, -1.05, 0],
    chapterThreeEditorialRotation: [0, 0.35, 1.5707963267948966],
    chapterThreeEditorialScale: 0.86,
    bottlePosition: [0, -1.32, 0],
    initialPosition: [0.04, -1.5, 0],
    labelCamera: {
      label: "Mobile label",
      position: [0.05, -0.18, 3.95],
      target: [0.04, -0.48, 0.24],
      fov: 34,
    },
  },
  mobileLandscape: {
    openingCamera: {
      label: "Mobile landscape diagonal opening",
      position: [0.1, 0.25, 5.05],
      target: [0.1, -0.12, 0],
      fov: 37,
    },
    introCamera: {
      label: "Mobile landscape opening front",
      position: [0.08, 0.31, 4.78],
      target: [0.08, -0.06, 0],
      fov: 36,
    },
    labelFramingCamera: {
      label: "Mobile landscape label framing",
      position: [0.32, 0.02, 4.65],
      target: [0.3, -0.3, 0.2],
      fov: 34,
    },
    chapterTwoCamera: {
      label: "Mobile landscape botanical composition",
      position: [0.18, 0.43, 6.2],
      target: [0.18, 0.06, 0],
      fov: 36,
    },
    chapterThreeEditorialCamera: {
      label: "Mobile landscape editorial product macro",
      position: [0, 0.43, 6.2],
      target: [0, -0.12, 0],
      fov: 36,
    },
    camera: {
      label: "Mobile landscape Chapter 3 start",
      position: [0.18, 0.43, 6.2],
      target: [0.18, 0.06, 0],
      fov: 36,
    },
    openingPosition: [-0.3, -1.65, 0],
    openingRotation: [-0.9, 0.2, -0.65],
    openingScale: 0.56,
    settledScale: 0.49,
    chapterTwoScale: 0.48,
    bottleScale: 0.74,
    centerScale: 1.2,
    focusScale: 0.6,
    chapterTwoPosition: [0, -0.63, 0],
    chapterThreeEditorialEntryPosition: [4.2, -0.5, 0],
    chapterThreeEditorialPosition: [2.15, -0.5, 0],
    chapterThreeEditorialRotation: [0, 0.35, 1.5707963267948966],
    chapterThreeEditorialScale: 1,
    bottlePosition: [0.18, -1.35, 0],
    initialPosition: [0.04, -1.45, 0],
    labelCamera: {
      label: "Mobile landscape label",
      position: [0.22, -0.08, 4.25],
      target: [0.22, -0.36, 0.24],
      fov: 33,
    },
  },
};

export function resolveHeroResponsivePreset(): HeroResponsivePresetName {
  if (typeof window === "undefined") {
    return "desktopLandscape";
  }

  const { innerWidth: width, innerHeight: height } = window;
  if (width < responsiveBreakpoints.mobile && height >= width) {
    return "mobilePortrait";
  }

  if (width < responsiveBreakpoints.mobileLandscape && width > height) {
    return "mobileLandscape";
  }

  if (width <= responsiveBreakpoints.tablet) {
    return "tablet";
  }

  return "desktopLandscape";
}

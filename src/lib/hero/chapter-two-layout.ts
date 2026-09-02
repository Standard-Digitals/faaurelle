import type {
  HeroResponsivePreset,
  HeroResponsivePresetName,
  HeroVector3,
} from "@/lib/hero/hero-presets";

export type ChapterTwoPoint = readonly [number, number];
export type ChapterTwoLabelOrientation =
  "left" | "right" | "upperLeft" | "lowerLeft" | "upperRight";

export type ChapterTwoIngredientLayout = {
  final: ChapterTwoPoint;
  control: ChapterTwoPoint;
  size: number;
  labelOrientation: ChapterTwoLabelOrientation;
  labelGap: number;
};

export type ChapterTwoLayout = {
  bottleScale: number;
  bottlePosition: HeroVector3;
  headingTop: number;
  headingWidth: number;
  headingFontSize: number;
  eyebrowFontSize: number;
  labelNameSize: number;
  labelBenefitSize: number;
  labelWidth: number;
  safeInsetX: number;
  safeInsetBottom: number;
  origin: ChapterTwoPoint;
  ingredients: readonly [
    ChapterTwoIngredientLayout,
    ChapterTwoIngredientLayout,
    ChapterTwoIngredientLayout,
  ];
};

export const chapterTwoLayoutEventName = "hero-chapter-two-layout";

type ModeLayoutConfig = {
  referenceWidth: number;
  referenceHeight: number;
  minimumBottleScale: number;
  minimumViewportFactor: number;
  ingredientMin: number;
  ingredientMax: number;
  ingredientRatio: number;
  safeInsetMin: number;
  safeInsetMax: number;
  labelWidthMin: number;
  labelWidthMax: number;
  headingTopMin: number;
  headingTopMax: number;
  headingWidthRatio: number;
  headingWidthMax: number;
  headingFontMin: number;
  headingFontMax: number;
  eyebrowFontMin: number;
  eyebrowFontMax: number;
  labelNameMin: number;
  labelNameMax: number;
  labelBenefitMin: number;
  labelBenefitMax: number;
  basePositions: readonly [ChapterTwoPoint, ChapterTwoPoint, ChapterTwoPoint];
  labelOrientations: readonly [
    ChapterTwoLabelOrientation,
    ChapterTwoLabelOrientation,
    ChapterTwoLabelOrientation,
  ];
};

const modeLayoutConfig: Record<HeroResponsivePresetName, ModeLayoutConfig> = {
  desktopLandscape: {
    // Approved Chapter 2 desktop composition. Keep these values as the desktop source of truth.
    referenceWidth: 1440,
    referenceHeight: 880,
    minimumBottleScale: 0.62,
    minimumViewportFactor: 0.775,
    ingredientMin: 220,
    ingredientMax: 450,
    ingredientRatio: 0.42,
    safeInsetMin: 28,
    safeInsetMax: 64,
    labelWidthMin: 150,
    labelWidthMax: 210,
    headingTopMin: 88,
    headingTopMax: 116,
    headingWidthRatio: 0.58,
    headingWidthMax: 736,
    headingFontMin: 40,
    headingFontMax: 72,
    eyebrowFontMin: 16,
    eyebrowFontMax: 18,
    labelNameMin: 24,
    labelNameMax: 36,
    labelBenefitMin: 16,
    labelBenefitMax: 18,
    basePositions: [
      [40, 55],
      [52, 83],
      [60, 45],
    ],
    labelOrientations: ["left", "right", "right"],
  },
  tablet: {
    referenceWidth: 1024,
    referenceHeight: 800,
    minimumBottleScale: 0.55,
    minimumViewportFactor: 0.785,
    ingredientMin: 170,
    ingredientMax: 300,
    ingredientRatio: 0.32,
    safeInsetMin: 24,
    safeInsetMax: 44,
    labelWidthMin: 126,
    labelWidthMax: 172,
    headingTopMin: 78,
    headingTopMax: 104,
    headingWidthRatio: 0.68,
    headingWidthMax: 620,
    headingFontMin: 34,
    headingFontMax: 56,
    eyebrowFontMin: 16,
    eyebrowFontMax: 17,
    labelNameMin: 20,
    labelNameMax: 28,
    labelBenefitMin: 16,
    labelBenefitMax: 17,
    basePositions: [
      [36, 50],
      [52, 75],
      [64, 47],
    ],
    labelOrientations: ["left", "right", "right"],
  },
  mobilePortrait: {
    referenceWidth: 430,
    referenceHeight: 820,
    minimumBottleScale: 0.44,
    minimumViewportFactor: 0.88,
    ingredientMin: 104,
    ingredientMax: 138,
    ingredientRatio: 0.3,
    safeInsetMin: 16,
    safeInsetMax: 24,
    labelWidthMin: 88,
    labelWidthMax: 112,
    headingTopMin: 72,
    headingTopMax: 94,
    headingWidthRatio: 0.82,
    headingWidthMax: 350,
    headingFontMin: 28,
    headingFontMax: 38,
    eyebrowFontMin: 16,
    eyebrowFontMax: 16,
    labelNameMin: 16,
    labelNameMax: 20,
    labelBenefitMin: 16,
    labelBenefitMax: 16,
    basePositions: [
      [29, 42],
      [54, 82],
      [71, 47],
    ],
    labelOrientations: ["upperLeft", "upperRight", "upperRight"],
  },
  mobileLandscape: {
    referenceWidth: 850,
    referenceHeight: 480,
    minimumBottleScale: 0.42,
    minimumViewportFactor: 0.875,
    ingredientMin: 104,
    ingredientMax: 136,
    ingredientRatio: 0.27,
    safeInsetMin: 16,
    safeInsetMax: 28,
    labelWidthMin: 96,
    labelWidthMax: 128,
    headingTopMin: 58,
    headingTopMax: 76,
    headingWidthRatio: 0.58,
    headingWidthMax: 440,
    headingFontMin: 24,
    headingFontMax: 34,
    eyebrowFontMin: 16,
    eyebrowFontMax: 16,
    labelNameMin: 16,
    labelNameMax: 20,
    labelBenefitMin: 16,
    labelBenefitMax: 16,
    basePositions: [
      [33, 49],
      [55, 79],
      [67, 48],
    ],
    labelOrientations: ["left", "right", "right"],
  },
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;

function resolveSharedHeroHeadingSize(
  width: number,
  height: number,
  presetName: HeroResponsivePresetName,
) {
  if (presetName === "mobilePortrait") {
    return height <= 700
      ? clamp(width * 0.075, 28, 36.8)
      : clamp(width * 0.08, 28.8, 40);
  }

  if (presetName === "mobileLandscape") {
    return clamp(width * 0.041, 24.8, 34.4);
  }

  return clamp(width * 0.042, 47.2, 82.4);
}

export function resolveChapterTwoLayout(
  viewportWidth: number,
  viewportHeight: number,
  presetName: HeroResponsivePresetName,
  preset: HeroResponsivePreset,
): ChapterTwoLayout {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const shorterDimension = Math.min(width, height);
  const config = modeLayoutConfig[presetName];
  const widthFactor = clamp(width / config.referenceWidth, config.minimumViewportFactor, 1);
  const heightFactor = clamp(height / config.referenceHeight, config.minimumViewportFactor, 1);
  const viewportFactor = Math.min(widthFactor, heightFactor);
  const bottleScale = clamp(
    preset.chapterTwoScale * viewportFactor,
    config.minimumBottleScale,
    preset.chapterTwoScale,
  );
  const bottleScaleReduction = preset.chapterTwoScale - bottleScale;
  const bottlePosition: HeroVector3 = [
    preset.chapterTwoPosition[0],
    preset.chapterTwoPosition[1] - bottleScaleReduction * 1.7,
    preset.chapterTwoPosition[2],
  ];

  const safeInsetX = clamp(width * 0.035, config.safeInsetMin, config.safeInsetMax);
  const safeInsetBottom = clamp(height * 0.045, 18, 44);
  const labelWidth = clamp(width * 0.14, config.labelWidthMin, config.labelWidthMax);
  const headingTop = clamp(height * 0.105, config.headingTopMin, config.headingTopMax);
  const headingWidth = Math.min(width * config.headingWidthRatio, config.headingWidthMax);
  const headingFontSize = resolveSharedHeroHeadingSize(width, height, presetName);
  const eyebrowFontSize = clamp(
    shorterDimension * 0.021,
    config.eyebrowFontMin,
    config.eyebrowFontMax,
  );
  const labelNameSize = clamp(shorterDimension * 0.037, config.labelNameMin, config.labelNameMax);
  const labelBenefitSize = clamp(
    shorterDimension * 0.02,
    config.labelBenefitMin,
    config.labelBenefitMax,
  );
  const baseIngredientSize = clamp(
    shorterDimension * config.ingredientRatio,
    config.ingredientMin,
    config.ingredientMax,
  );
  const ingredientSizes = [baseIngredientSize, baseIngredientSize, baseIngredientSize] as const;
  const labelGap = clamp(shorterDimension * 0.025, 10, 24);
  const headingBottom = headingTop + eyebrowFontSize + 12 + headingFontSize * 0.96;
  const origin: ChapterTwoPoint = [50, clamp(59 + (1 - heightFactor) * 3, 59, 62)];
  const bottleHalfWidth = shorterDimension * 0.115 * (bottleScale / preset.chapterTwoScale);

  const resolvedPositions: ChapterTwoPoint[] = [];
  config.basePositions.forEach((basePosition, index) => {
    const size = ingredientSizes[index];
    const orientation = config.labelOrientations[index];
    const horizontalLabelReserve =
      orientation === "left" || orientation === "right" ? labelWidth + labelGap : labelWidth * 0.28;
    const minimumCenterX = ((safeInsetX + size / 2 + horizontalLabelReserve) / width) * 100;
    const maximumCenterX = 100 - minimumCenterX;
    const upperLabelReserve =
      orientation === "upperLeft" || orientation === "upperRight"
        ? labelNameSize + labelBenefitSize * 1.35 + labelGap * 2
        : labelGap;
    const headingClearanceY = ((headingBottom + size / 2 + upperLabelReserve) / height) * 100;
    const bottomReserve = orientation === "lowerLeft" ? labelBenefitSize * 3 : 0;
    const maximumCenterY =
      index === 1 ? 95 : 100 - ((safeInsetBottom + size / 2 + bottomReserve) / height) * 100;
    const bottleClearance = ((bottleHalfWidth + size / 2 + labelGap) / width) * 100;
    const bottleSafeX =
      index === 0
        ? Math.min(basePosition[0], 50 - bottleClearance)
        : index === 1
          ? basePosition[0]
          : Math.max(basePosition[0], 50 + bottleClearance);
    const x = clamp(bottleSafeX, minimumCenterX, maximumCenterX);
    const y = clamp(basePosition[1], headingClearanceY, maximumCenterY);
    resolvedPositions.push([x, y]);
  });

  const createIngredientLayout = (index: 0 | 1 | 2): ChapterTwoIngredientLayout => {
    const final = resolvedPositions[index];
    return {
      final,
      control: [lerp(origin[0], final[0], 0.55), lerp(origin[1], final[1], 0.38)],
      size: ingredientSizes[index],
      labelOrientation: config.labelOrientations[index],
      labelGap,
    };
  };
  const ingredients: ChapterTwoLayout["ingredients"] = [
    createIngredientLayout(0),
    createIngredientLayout(1),
    createIngredientLayout(2),
  ];

  return {
    bottleScale,
    bottlePosition,
    headingTop,
    headingWidth,
    headingFontSize,
    eyebrowFontSize,
    labelNameSize,
    labelBenefitSize,
    labelWidth,
    safeInsetX,
    safeInsetBottom,
    origin,
    ingredients,
  };
}

import type {
  HeroResponsivePreset,
  HeroResponsivePresetName,
  HeroVector3,
} from "@/lib/hero/hero-presets";

export type ChapterTwoPoint = readonly [number, number];
export type ChapterTwoLabelOrientation =
  "left" | "right" | "upperLeft" | "lowerLeft" | "upperRight" | "bottom";

export type ChapterTwoIngredientLayout = {
  final: ChapterTwoPoint;
  control: ChapterTwoPoint;
  size: number;
  labelOrientation: ChapterTwoLabelOrientation;
  labelGap: number;
  labelOffset: ChapterTwoPoint;
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
  labelGapMin: number;
  labelGapMax: number;
  headingTopMin: number;
  headingTopMax: number;
  headingWidthRatio: number;
  headingWidthMax: number;
  headingFontMin: number;
  headingFontMax: number;
  headingIngredientGap: number;
  stageBottomReserve: number;
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
  labelOffsets: readonly [ChapterTwoPoint, ChapterTwoPoint, ChapterTwoPoint];
  reserveLabelBesideImage: readonly [boolean, boolean, boolean];
  reserveHeadingCaptionSpace: readonly [boolean, boolean, boolean];
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
    labelGapMin: 10,
    labelGapMax: 24,
    headingTopMin: 88,
    headingTopMax: 116,
    headingWidthRatio: 0.58,
    headingWidthMax: 736,
    headingFontMin: 40,
    headingFontMax: 72,
    headingIngredientGap: 0,
    stageBottomReserve: 0,
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
    labelOffsets: [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    reserveLabelBesideImage: [true, true, true],
    reserveHeadingCaptionSpace: [false, false, false],
  },
  tablet: {
    referenceWidth: 1024,
    referenceHeight: 800,
    minimumBottleScale: 0.55,
    minimumViewportFactor: 0.785,
    ingredientMin: 160,
    ingredientMax: 270,
    ingredientRatio: 0.29,
    safeInsetMin: 24,
    safeInsetMax: 44,
    labelWidthMin: 136,
    labelWidthMax: 184,
    labelGapMin: 14,
    labelGapMax: 20,
    headingTopMin: 76,
    headingTopMax: 100,
    headingWidthRatio: 0.72,
    headingWidthMax: 620,
    headingFontMin: 34,
    headingFontMax: 56,
    headingIngredientGap: 14,
    stageBottomReserve: 52,
    eyebrowFontMin: 16,
    eyebrowFontMax: 17,
    labelNameMin: 18,
    labelNameMax: 22,
    labelBenefitMin: 16,
    labelBenefitMax: 16,
    basePositions: [
      [28, 18],
      [26, 68],
      [74, 38],
    ],
    labelOrientations: ["bottom", "bottom", "bottom"],
    labelOffsets: [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    reserveLabelBesideImage: [false, false, false],
    reserveHeadingCaptionSpace: [true, false, true],
  },
  mobilePortrait: {
    referenceWidth: 430,
    referenceHeight: 820,
    minimumBottleScale: 0.44,
    minimumViewportFactor: 0.88,
    ingredientMin: 104,
    ingredientMax: 138,
    ingredientRatio: 0.28,
    safeInsetMin: 16,
    safeInsetMax: 24,
    labelWidthMin: 96,
    labelWidthMax: 116,
    labelGapMin: 8,
    labelGapMax: 12,
    headingTopMin: 68,
    headingTopMax: 90,
    headingWidthRatio: 0.88,
    headingWidthMax: 378,
    headingFontMin: 28,
    headingFontMax: 38,
    headingIngredientGap: 12,
    stageBottomReserve: 58,
    eyebrowFontMin: 16,
    eyebrowFontMax: 16,
    labelNameMin: 16,
    labelNameMax: 18,
    labelBenefitMin: 16,
    labelBenefitMax: 16,
    basePositions: [
      [25, 12],
      [23, 68],
      [75, 35],
    ],
    labelOrientations: ["bottom", "bottom", "bottom"],
    labelOffsets: [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    reserveLabelBesideImage: [false, false, false],
    reserveHeadingCaptionSpace: [true, false, true],
  },
  mobileLandscape: {
    referenceWidth: 850,
    referenceHeight: 480,
    minimumBottleScale: 0.42,
    minimumViewportFactor: 0.875,
    ingredientMin: 104,
    ingredientMax: 136,
    ingredientRatio: 0.25,
    safeInsetMin: 16,
    safeInsetMax: 28,
    labelWidthMin: 104,
    labelWidthMax: 136,
    labelGapMin: 8,
    labelGapMax: 10,
    headingTopMin: 58,
    headingTopMax: 76,
    headingWidthRatio: 0.58,
    headingWidthMax: 440,
    headingFontMin: 24,
    headingFontMax: 34,
    headingIngredientGap: 8,
    stageBottomReserve: 36,
    eyebrowFontMin: 16,
    eyebrowFontMax: 16,
    labelNameMin: 16,
    labelNameMax: 17,
    labelBenefitMin: 16,
    labelBenefitMax: 16,
    basePositions: [
      [27, 14],
      [27, 72],
      [73, 41],
    ],
    labelOrientations: ["bottom", "bottom", "bottom"],
    labelOffsets: [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    reserveLabelBesideImage: [true, false, true],
    reserveHeadingCaptionSpace: [false, false, false],
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
    return height <= 700 ? clamp(width * 0.075, 28, 36.8) : clamp(width * 0.08, 28.8, 40);
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
  measuredHeadingHeight?: number,
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
  const viewportLabelWidth = clamp(width * 0.14, config.labelWidthMin, config.labelWidthMax);
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
  const labelGap = clamp(shorterDimension * 0.025, config.labelGapMin, config.labelGapMax);
  const isDesktop = presetName === "desktopLandscape";
  const labelWidth = isDesktop
    ? viewportLabelWidth
    : clamp(baseIngredientSize * 0.82, config.labelWidthMin, config.labelWidthMax);
  const fallbackHeadingHeight = eyebrowFontSize + 12 + headingFontSize * (isDesktop ? 0.96 : 1.92);
  const headingBottom = headingTop + (measuredHeadingHeight ?? fallbackHeadingHeight);
  const origin: ChapterTwoPoint = [50, clamp(59 + (1 - heightFactor) * 3, 59, 62)];
  const bottleHalfWidth = shorterDimension * 0.115 * (bottleScale / preset.chapterTwoScale);
  const stageTop = headingBottom + config.headingIngredientGap;
  const stageBottom = Math.max(
    stageTop + baseIngredientSize,
    height - safeInsetBottom - config.stageBottomReserve,
  );

  const resolvedPositions: ChapterTwoPoint[] = [];
  config.basePositions.forEach((basePosition, index) => {
    const size = ingredientSizes[index];
    const orientation = config.labelOrientations[index];
    const horizontalLabelReserve = config.reserveLabelBesideImage[index]
      ? labelWidth + labelGap
      : 0;
    const minimumCenterX = ((safeInsetX + size / 2 + horizontalLabelReserve) / width) * 100;
    const maximumCenterX = 100 - minimumCenterX;
    const upperLabelReserve = config.reserveHeadingCaptionSpace[index]
      ? labelNameSize + labelBenefitSize * 1.35 + labelGap * 2
      : labelGap;
    const headingClearanceY = ((stageTop + size / 2 + upperLabelReserve) / height) * 100;
    const bottomReserve =
      orientation === "bottom"
        ? labelGap + labelNameSize * 1.05 + labelBenefitSize * 2.7 + 10
        : orientation === "lowerLeft"
          ? labelBenefitSize * 3
          : 0;
    const maximumCenterY = isDesktop
      ? index === 1
        ? 95
        : 100 - ((safeInsetBottom + size / 2 + bottomReserve) / height) * 100
      : ((stageBottom - size / 2 - bottomReserve) / height) * 100;
    const stagedY = isDesktop
      ? basePosition[1]
      : ((stageTop + ((stageBottom - stageTop) * basePosition[1]) / 100) / height) * 100;
    const bottleClearance = ((bottleHalfWidth + size / 2 + labelGap) / width) * 100;
    const bottleSafeX =
      index === 0
        ? Math.min(basePosition[0], 50 - bottleClearance)
        : index === 1
          ? basePosition[0]
          : Math.max(basePosition[0], 50 + bottleClearance);
    let x = clamp(bottleSafeX, minimumCenterX, maximumCenterX);
    const y = clamp(stagedY, headingClearanceY, maximumCenterY);

    if (!isDesktop) {
      const imageHalfWidthPercent = (size / 2 / width) * 100;
      const imageHalfHeightPercent = (size / 2 / height) * 100;
      const gapPercent = (labelGap / width) * 100;
      const exclusionZones = [
        { top: 30, bottom: 57, halfWidth: 9 },
        { top: 48, bottom: 88, halfWidth: 14 },
      ] as const;
      const side = index === 2 ? 1 : -1;

      exclusionZones.forEach((zone) => {
        const overlapsVertically =
          y + imageHalfHeightPercent > zone.top && y - imageHalfHeightPercent < zone.bottom;
        if (!overlapsVertically) {
          return;
        }
        const requiredCenterX = 50 + side * (zone.halfWidth + imageHalfWidthPercent + gapPercent);
        x = side < 0 ? Math.min(x, requiredCenterX) : Math.max(x, requiredCenterX);
      });
      x = clamp(x, minimumCenterX, maximumCenterX);
    }
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
      labelOffset: config.labelOffsets[index],
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

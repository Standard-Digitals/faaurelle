import { isPhoneHeroMode, type HeroExperienceMode } from "@/lib/responsive";
import { heroContent } from "@/config/hero-content";

export const chapterIds = [
  "hero",
  "botanicalEssence",
  "keyIngredients",
  "silkBotaniqueFusion",
] as const;

export type ChapterId = (typeof chapterIds)[number];
export type ProgressRange = readonly [start: number, end: number];

export type ChapterDefinition = {
  id: ChapterId;
  label: string;
  start: number;
  end: number;
  introOverlap?: number;
  outroOverlap?: number;
};

const previousChapterViewportAllocationVh = 360;
const previousExperienceScrollHeightVh = chapterIds.length * previousChapterViewportAllocationVh;
const previousSection4Start = 0.88;
export const section4ScrollAllocationMultiplier = 1.4;
const previousSection4AllocationVh = previousExperienceScrollHeightVh * (1 - previousSection4Start);
export const section4ScrollAllocationVh =
  previousSection4AllocationVh * section4ScrollAllocationMultiplier;
export const experienceScrollHeightVh =
  previousExperienceScrollHeightVh - previousSection4AllocationVh + section4ScrollAllocationVh;
const preservedChapterProgressScale = previousExperienceScrollHeightVh / experienceScrollHeightVh;
const preservePreviousScrollPosition = (progress: number) =>
  progress * preservedChapterProgressScale;

export const chapterConfig: Record<ChapterId, ChapterDefinition> = {
  hero: {
    id: "hero",
    label: heroContent.chapterOne.label,
    start: 0,
    end: preservePreviousScrollPosition(0.46),
    outroOverlap: preservePreviousScrollPosition(0.04),
  },
  botanicalEssence: {
    id: "botanicalEssence",
    label: heroContent.chapterTwo.label,
    start: preservePreviousScrollPosition(0.42),
    end: preservePreviousScrollPosition(0.677),
    introOverlap: preservePreviousScrollPosition(0.04),
    outroOverlap: preservePreviousScrollPosition(0.03),
  },
  keyIngredients: {
    id: "keyIngredients",
    label: heroContent.chapterThree.label,
    start: preservePreviousScrollPosition(0.677),
    end: preservePreviousScrollPosition(previousSection4Start),
    outroOverlap: preservePreviousScrollPosition(0.03),
  },
  silkBotaniqueFusion: {
    id: "silkBotaniqueFusion",
    label: heroContent.chapterFour.label,
    start: preservePreviousScrollPosition(previousSection4Start),
    end: 1,
  },
};

export const chapters = chapterIds.map((id) => chapterConfig[id]);

export const phoneHeroScrollHeightVh = {
  phonePortrait: 560,
  phoneLandscape: 420,
} as const;

export const phoneChapterConfig: Record<ChapterId, ChapterDefinition> = {
  hero: {
    id: "hero",
    label: heroContent.chapterOne.label,
    start: 0,
    end: 0.27,
    outroOverlap: 0.03,
  },
  botanicalEssence: {
    id: "botanicalEssence",
    label: heroContent.chapterTwo.label,
    start: 0.24,
    end: 0.47,
    introOverlap: 0.03,
    outroOverlap: 0.03,
  },
  keyIngredients: {
    id: "keyIngredients",
    label: heroContent.chapterThree.label,
    start: 0.47,
    end: 0.76,
    introOverlap: 0.03,
    outroOverlap: 0.03,
  },
  silkBotaniqueFusion: {
    id: "silkBotaniqueFusion",
    label: heroContent.chapterFour.label,
    start: 0.73,
    end: 1,
    introOverlap: 0.03,
  },
};

const phonePlaybackStops: Record<
  ChapterId,
  ReadonlyArray<readonly [phoneProgress: number, choreographyProgress: number]>
> = {
  hero: [
    [0, 0],
    [0.16, 0.18],
    [0.34, 0.39],
    [0.52, 0.58],
    [0.7, 0.76],
    [0.84, 0.9],
    [1, 1],
  ],
  botanicalEssence: [
    [0, 0],
    [0.18, 0.27],
    [0.4, 0.48],
    [0.64, 0.69],
    [0.84, 0.84],
    [1, 1],
  ],
  keyIngredients: [
    [0, 0],
    [0.18, 0.24],
    [0.38, 0.5],
    [0.64, 0.7],
    [0.84, 0.84],
    [1, 1],
  ],
  silkBotaniqueFusion: [
    [0, 0],
    [0.12, 0.285],
    [0.46, 0.64],
    [0.7, 0.78],
    [0.9, 0.9],
    [1, 1],
  ],
};

function remapPhoneChapterProgress(progress: number, chapterId: ChapterId) {
  const stops = phonePlaybackStops[chapterId];
  const clamped = clampProgress(progress);

  for (let index = 1; index < stops.length; index += 1) {
    const previous = stops[index - 1];
    const next = stops[index];
    if (clamped <= next[0]) {
      return interpolate(previous[1], next[1], progressBetween(clamped, previous[0], next[0]));
    }
  }

  return 1;
}

export function getHeroScrollHeightVh(mode: HeroExperienceMode) {
  return mode === "phonePortrait"
    ? phoneHeroScrollHeightVh.phonePortrait
    : mode === "phoneLandscape"
      ? phoneHeroScrollHeightVh.phoneLandscape
      : experienceScrollHeightVh;
}

export function getHeroChapterProgress(
  globalProgress: number,
  chapterId: ChapterId,
  mode: HeroExperienceMode,
) {
  if (!isPhoneHeroMode(mode)) {
    return getChapterProgress(globalProgress, chapterId);
  }

  const chapter = phoneChapterConfig[chapterId];
  return remapPhoneChapterProgress(
    progressBetween(globalProgress, chapter.start, chapter.end),
    chapterId,
  );
}

export function getHeroActiveChapterIndex(globalProgress: number, mode: HeroExperienceMode) {
  if (!isPhoneHeroMode(mode)) {
    return getActiveChapterIndex(globalProgress);
  }

  let activeIndex = 0;
  chapterIds.forEach((chapterId, index) => {
    if (globalProgress >= phoneChapterConfig[chapterId].start) {
      activeIndex = index;
    }
  });
  return activeIndex;
}

// Retained as the established base allocation for Sections 1–3. Section 4 adds
// its own breathing room through `experienceScrollHeightVh` above.
export const chapterViewportAllocationVh = previousChapterViewportAllocationVh;

export function clampProgress(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function progressBetween(progress: number, start: number, end: number) {
  if (start === end) {
    return progress >= end ? 1 : 0;
  }

  return clampProgress((progress - start) / (end - start));
}

export function getChapterProgress(globalProgress: number, chapterId: ChapterId) {
  const chapter = chapterConfig[chapterId];
  return progressBetween(globalProgress, chapter.start, chapter.end);
}

export function isChapterActive(globalProgress: number, chapterId: ChapterId) {
  const chapter = chapterConfig[chapterId];
  return globalProgress >= chapter.start && globalProgress <= chapter.end;
}

export function getChapterOverlapProgress(
  globalProgress: number,
  chapterId: ChapterId,
  edge: "intro" | "outro",
) {
  const chapter = chapterConfig[chapterId];
  const overlap = edge === "intro" ? chapter.introOverlap : chapter.outroOverlap;

  if (!overlap) {
    return edge === "intro"
      ? Number(globalProgress >= chapter.start)
      : Number(globalProgress >= chapter.end);
  }

  const range: ProgressRange =
    edge === "intro"
      ? [chapter.start, chapter.start + overlap]
      : [chapter.end - overlap, chapter.end];
  return progressBetween(globalProgress, range[0], range[1]);
}

export function getActiveChapterIndex(globalProgress: number) {
  let activeIndex = 0;
  chapters.forEach((chapter, index) => {
    if (globalProgress >= chapter.start) {
      activeIndex = index;
    }
  });
  return activeIndex;
}

export function formatChapterNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function formatChapterCount(count: number) {
  return String(count).padStart(2, "0");
}

export function smoothStep(progress: number) {
  const value = clampProgress(progress);
  return value * value * (3 - 2 * value);
}

export function smoothStepBetween(progress: number, range: ProgressRange) {
  return smoothStep(progressBetween(progress, range[0], range[1]));
}

export function interpolate(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

export function enterExitOpacity(
  progress: number,
  enterRange: ProgressRange,
  exitRange: ProgressRange,
) {
  return Math.min(
    progressBetween(progress, enterRange[0], enterRange[1]),
    1 - progressBetween(progress, exitRange[0], exitRange[1]),
  );
}

export const heroChapterTiming = {
  openingHold: [0, 0.025],
  rearFacingTurn: [0.025, 0.12],
  frontFacingSettle: [0.12, 0.26],
  chapterTwoSettle: [0.72, 1],
  scrollCueExit: [0.04, 0.12],
} as const satisfies Record<string, ProgressRange | number>;

export const botanicalEssenceTiming = {
  sectionFadeIn: [0, 0.08],
  headingReveal: [0.03, 0.13],
  glowReveal: [0.07, 0.15],
  glowEmergenceResolve: [0.32, 0.42],
  glowAbsorptionReveal: [0.58, 0.68],
  glowResolve: [0.78, 0.86],
  sectionFadeOut: [0.8, 0.88],
  reviewCtaReveal: 0.18,
  ingredientReveal: [0.12, 0.42],
  labelReveal: [0.28, 0.48],
  compositionHold: [0.46, 0.56],
  ingredientReturn: [0.58, 0.83],
  productFadeOut: [0.87, 0.95],
} as const satisfies Record<string, ProgressRange | number>;

export const editorialProductChapterTiming = {
  whiteBeat: [0, 0.05],
  bottleEntrance: [0.05, 0.34],
  bottleFadeIn: [0.08, 0.27],
  cameraSettle: [0.05, 0.3],
  eyebrowReveal: [0.32, 0.4],
  headingReveal: [0.37, 0.47],
  dividerReveal: [0.44, 0.52],
  productNameReveal: [0.49, 0.57],
  supportingReveal: [0.54, 0.63],
  descriptionReveal: [0.6, 0.7],
  ctaReveal: [0.66, 0.75],
  benefitsReveal: [0.72, 0.84],
  compositionHold: [0.7, 1],
} as const satisfies Record<string, ProgressRange | number>;

export const moleculeMergeTiming = {
  sectionThreeExit: [0.08, 0.22],
  sceneReveal: [0.12, 0.24],
} as const satisfies Record<string, ProgressRange>;

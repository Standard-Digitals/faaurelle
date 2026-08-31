export const responsiveBreakpoints = {
  mobile: 768,
  mobileLandscape: 900,
  tablet: 1100,
} as const;

export const mobileViewportQuery = `(max-width: ${responsiveBreakpoints.mobile - 1}px)`;
export const mobileLandscapeViewportQuery = `(max-width: ${responsiveBreakpoints.mobileLandscape - 1}px) and (orientation: landscape)`;

export type HeroExperienceMode = "cinematic" | "phonePortrait" | "phoneLandscape";

export const cinematicHeroMode: HeroExperienceMode = "cinematic";

export function isPhoneHeroMode(mode: HeroExperienceMode) {
  return mode !== cinematicHeroMode;
}

export function resolveHeroExperienceMode(): HeroExperienceMode {
  if (typeof window === "undefined") {
    return cinematicHeroMode;
  }

  if (window.matchMedia(mobileLandscapeViewportQuery).matches) {
    return "phoneLandscape";
  }

  return window.matchMedia(mobileViewportQuery).matches ? "phonePortrait" : cinematicHeroMode;
}

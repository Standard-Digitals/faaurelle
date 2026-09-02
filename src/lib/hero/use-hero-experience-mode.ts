"use client";

import { useEffect, useState } from "react";
import {
  cinematicHeroMode,
  mobileLandscapeViewportQuery,
  mobileViewportQuery,
  resolveHeroExperienceMode,
} from "@/lib/responsive";

export function useHeroExperienceMode() {
  const [mode, setMode] = useState(cinematicHeroMode);

  useEffect(() => {
    const phoneQuery = window.matchMedia(mobileViewportQuery);
    const landscapePhoneQuery = window.matchMedia(mobileLandscapeViewportQuery);
    const updateMode = () => setMode(resolveHeroExperienceMode());
    updateMode();
    phoneQuery.addEventListener("change", updateMode);
    landscapePhoneQuery.addEventListener("change", updateMode);

    return () => {
      phoneQuery.removeEventListener("change", updateMode);
      landscapePhoneQuery.removeEventListener("change", updateMode);
    };
  }, []);

  return mode;
}

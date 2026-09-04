"use client";

import { useEffect, useState } from "react";
import {
  resolveHeroResponsivePreset,
  type HeroResponsivePresetName,
} from "@/lib/hero/hero-presets";

export function useHeroResponsivePreset() {
  const [presetName, setPresetName] = useState<HeroResponsivePresetName>("desktopLandscape");

  useEffect(() => {
    const updatePreset = () => setPresetName(resolveHeroResponsivePreset());
    updatePreset();
    window.addEventListener("resize", updatePreset);
    return () => window.removeEventListener("resize", updatePreset);
  }, []);

  return presetName;
}

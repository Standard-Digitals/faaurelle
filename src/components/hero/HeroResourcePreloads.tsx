"use client";

import { preload } from "react-dom";
import { heroEnvironmentPath, heroModelPath } from "@/lib/hero/hero-presets";

export function HeroResourcePreloads() {
  preload(heroModelPath, {
    as: "fetch",
    crossOrigin: "anonymous",
    fetchPriority: "high",
    type: "model/gltf-binary",
  });
  preload(heroEnvironmentPath, {
    as: "fetch",
    crossOrigin: "anonymous",
    fetchPriority: "low",
    type: "application/octet-stream",
  });

  return null;
}

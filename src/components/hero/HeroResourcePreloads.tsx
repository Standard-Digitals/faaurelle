"use client";

import { preload } from "react-dom";
import { heroDracoDecoderPath, heroEnvironmentPath, heroModelPath } from "@/lib/hero/hero-presets";

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
    fetchPriority: "high",
    type: "application/octet-stream",
  });
  preload(`${heroDracoDecoderPath}draco_wasm_wrapper.js`, {
    as: "fetch",
    crossOrigin: "anonymous",
  });
  preload(`${heroDracoDecoderPath}draco_decoder.wasm`, {
    as: "fetch",
    crossOrigin: "anonymous",
    type: "application/wasm",
  });

  return null;
}

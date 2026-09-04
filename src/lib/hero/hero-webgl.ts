"use client";

import { useEffect, useState } from "react";

export function supportsHeroWebGL() {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function useHeroReducedMotionPreference() {
  const [reduced, setReduced] = useState(true);
  const [checkedReducedMotion, setCheckedReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setReduced(query.matches);
      setCheckedReducedMotion(true);
    };
    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return { checkedReducedMotion, reducedMotion: reduced };
}

export function useHeroWebGLStatus() {
  const [webglReady, setWebglReady] = useState(false);
  const [checkedWebgl, setCheckedWebgl] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setWebglReady(supportsHeroWebGL());
      setCheckedWebgl(true);
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  return { checkedWebgl, webglReady };
}

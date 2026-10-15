"use client";

import { createContext, useContext } from "react";

// Later hero chapters sit inside the sticky viewport, so the browser fetches their
// images immediately even though they are invisible. Hold them back until the 3D
// bottle is ready so they do not compete with the model and lighting downloads.
const HeroDeferredMediaContext = createContext(true);

export const HeroDeferredMediaProvider = HeroDeferredMediaContext.Provider;

export function useHeroDeferredMediaReady() {
  return useContext(HeroDeferredMediaContext);
}

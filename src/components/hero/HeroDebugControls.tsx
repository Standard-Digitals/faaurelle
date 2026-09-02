"use client";

import {
  heroCameraPresets,
  type HeroCameraPresetName,
} from "@/lib/hero/hero-presets";

export function HeroDebugControls({ debugState }: { debugState: string }) {
  return (
    <div className="pointer-events-auto absolute right-4 top-20 z-20 w-[min(22rem,calc(100vw-2rem))] border border-amber/15 bg-background/90 p-4 text-base text-foreground shadow-sm backdrop-blur">
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(heroCameraPresets) as HeroCameraPresetName[]).map((presetName) => (
          <button
            key={presetName}
            type="button"
            className="border border-amber/20 bg-background px-3 py-2 text-base uppercase tracking-[0.1em] text-muted transition hover:text-foreground focus:text-foreground"
            onClick={() => {
              const event = new CustomEvent("hero-3d-camera-preset", { detail: presetName });
              window.dispatchEvent(event);
            }}
          >
            {heroCameraPresets[presetName].label}
          </button>
        ))}
      </div>
      <pre className="max-h-52 overflow-auto whitespace-pre-wrap font-mono text-base leading-5 text-muted">
        {debugState}
      </pre>
    </div>
  );
}

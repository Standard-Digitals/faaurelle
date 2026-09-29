"use client";

import Image from "next/image";
import { useLayoutEffect, useRef } from "react";
import { brand } from "@/config/brand";
import {
  heroPosterData,
  heroPosterFallbackSrc,
  heroPosterSources,
  placeHeroPoster,
} from "@/lib/hero/hero-poster";
import { heroStaticFallbackPath } from "@/lib/hero/hero-presets";

// Places the server-rendered poster before first paint, ahead of hydration.
const placeHeroPosterScript = `(${placeHeroPoster.toString()})(${JSON.stringify(heroPosterData)}, document.currentScript.parentElement)`;

function HeroPoster() {
  const posterRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const poster = posterRef.current;
    if (!poster) {
      return;
    }

    const place = () => placeHeroPoster(heroPosterData, poster);
    place();
    window.addEventListener("resize", place);

    return () => window.removeEventListener("resize", place);
  }, []);

  return (
    <div ref={posterRef} className="hero-poster" data-hero-poster suppressHydrationWarning>
      <picture>
        {heroPosterSources.map((source) => (
          <source key={source.media} media={source.media} srcSet={source.src} type="image/webp" />
        ))}
        {/* Sized and positioned by placeHeroPoster, which next/image cannot express. */}
        <img src={heroPosterFallbackSrc} alt="" fetchPriority="high" decoding="async" />
      </picture>
      <script dangerouslySetInnerHTML={{ __html: placeHeroPosterScript }} />
    </div>
  );
}

export function HeroLoader({ loading = true }: { loading?: boolean }) {
  return (
    <div
      className="pointer-events-none relative h-full w-full"
      role={loading ? "status" : undefined}
      aria-live={loading ? "polite" : undefined}
      aria-label={loading ? `Loading ${brand.accessibilityLabel} experience` : undefined}
    >
      {loading ? (
        <>
          <HeroPoster />
          <div className="hero-loading-indicator">
            <span className="hero-loading-spinner" aria-hidden="true" />
            <span>Preparing your elixir…</span>
          </div>
        </>
      ) : <Image
        src={heroStaticFallbackPath}
        alt=""
        fill
        priority
        sizes="(max-width: 767px) 70vw, 40vw"
        className="hero-loading-bottle object-contain"
      />}
    </div>
  );
}

import Image from "next/image";
import { brand } from "@/config/brand";
import { heroStaticFallbackPath } from "@/lib/hero/hero-presets";

export function HeroLoader({ loading = true }: { loading?: boolean }) {
  return (
    <div
      className="pointer-events-none relative h-full w-full"
      role={loading ? "status" : undefined}
      aria-live={loading ? "polite" : undefined}
      aria-label={loading ? `Loading ${brand.accessibilityLabel} experience` : undefined}
    >
      {loading ? (
        <div className="hero-loading-indicator">
          <span className="hero-loading-spinner" aria-hidden="true" />
          <span>Preparing your elixir…</span>
        </div>
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

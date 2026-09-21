import { brand } from "@/config/brand";
import Image from "next/image";
import { heroStaticFallbackPath } from "@/lib/hero/hero-presets";

export function HeroLoader() {
  return (
    <div
      className="pointer-events-none relative h-full w-full"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${brand.accessibilityLabel} experience`}
    >
      <Image
        src={heroStaticFallbackPath}
        alt=""
        fill
        priority
        sizes="(max-width: 767px) 70vw, 40vw"
        className="hero-loading-bottle object-contain"
      />
    </div>
  );
}

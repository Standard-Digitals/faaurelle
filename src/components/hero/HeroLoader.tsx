import { brand } from "@/config/brand";

export function HeroLoader() {
  return (
    <div
      className="viewport-min flex h-full w-full items-center justify-center bg-background-bright"
      role="status"
      aria-live="polite"
      aria-label={`Loading ${brand.accessibilityLabel} experience`}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-12 w-12" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-gold/20" />
          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-gold" />
          <div className="absolute inset-[7px] rounded-full border border-gold/35" />
        </div>
        <div className="text-center">
          <p className="font-serif text-lg tracking-[0.24em] text-foreground">{brand.displayName}</p>
          <p className="mt-2 text-base uppercase tracking-[0.22em] text-muted">
            Loading experience
          </p>
        </div>
      </div>
    </div>
  );
}

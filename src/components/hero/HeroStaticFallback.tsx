import Image from "next/image";
import {
  heroStaticFallbackPath,
  moleculeMergeStaticFallbackPath,
} from "@/lib/hero/hero-presets";
import { heroContent } from "@/config/hero-content";
import { product } from "@/config/product";

export function HeroStaticFallback({
  reason,
  priority = false,
  composition = "default",
}: {
  reason?: string;
  priority?: boolean;
  composition?: "default" | "moleculeMerge";
}) {
  const imagePath =
    composition === "moleculeMerge" ? moleculeMergeStaticFallbackPath : heroStaticFallbackPath;

  return (
    <div className="viewport-min relative h-full w-full bg-background-bright">
      <div className="sr-only">
        <h1>{heroContent.chapterOne.heading}</h1>
        <p>{product.formalName}. {heroContent.chapterOne.body}</p>
      </div>
      <Image
        src={imagePath}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className={[
          "object-contain px-6 py-16",
          composition === "moleculeMerge" ? "hero-static-fallback-molecule-merge" : "",
        ].join(" ")}
      />
      {reason ? (
        <div className="absolute bottom-6 left-6 bg-background/85 px-3 py-2 text-base uppercase tracking-[0.18em] text-muted">
          {reason}
        </div>
      ) : null}
    </div>
  );
}

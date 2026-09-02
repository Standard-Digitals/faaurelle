import { heroContent } from "@/config/hero-content";

export function HeroChapter({ exitProgress }: { exitProgress: number }) {
  const content = heroContent.chapterOne;
  return (
    <div className="hero-copy-intro absolute left-layout-x top-1/2 z-20 w-[min(52vw,52rem)] -translate-y-1/2">
      <div
        className="hero-copy"
        style={{
          opacity: 1 - exitProgress,
          transform: `translate3d(0, ${-12 * exitProgress}px, 0)`,
        }}
      >
        <h1 className="type-display max-w-[15ch] text-foreground">
          {content.heading}
        </h1>
        <p className="hero-description type-body border-gold/50 mt-7 max-w-[30rem] border-l pl-5 text-muted">
          {content.body}
        </p>
      </div>
    </div>
  );
}

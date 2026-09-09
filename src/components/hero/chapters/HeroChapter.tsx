import { heroContent } from "@/config/hero-content";
import Link from "next/link";

function BenefitIcon({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {label === "Shine" ? (
        <><path d="m16 6 2.5 7.5L26 16l-7.5 2.5L16 26l-2.5-7.5L6 16l7.5-2.5Z" /><path d="M24 5v5m-2.5-2.5h5" /></>
      ) : label === "Smooth" ? (
        <><path d="M12 6c10 8-10 12 0 20M17 5c10 8-10 14 0 22M22 6c10 8-10 12 0 20" /></>
      ) : (
        <><path d="M9 24C3 12 16 6 25 6c0 10-2 21-13 18" /><path d="M8 28 21 11m-7 10v-7m0 7 7-1" /></>
      )}
    </svg>
  );
}

export function HeroChapter({ exitProgress }: { exitProgress: number }) {
  const content = heroContent.chapterOne;
  return (
    <>
    <div className="hero-copy-intro absolute left-layout-x top-1/2 z-20 w-[min(32vw,32rem)] -translate-y-1/2">
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
        <Link href="/product" className="hero-shop-link pointer-events-auto">Shop the elixir <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
    <aside className="hero-opening-benefits" aria-labelledby="hero-benefits-heading" style={{ opacity: 1 - exitProgress, transform: `translateY(calc(-50% - ${12 * exitProgress}px))` }}>
      <h2 id="hero-benefits-heading" className="hero-opening-benefits-heading">The Elixir Difference.</h2>
      <div className="hero-opening-benefits-list">
      {content.benefits.map((benefit) => (
        <div className="hero-opening-benefit" key={benefit.label}>
          <span className="hero-opening-benefit-icon"><BenefitIcon label={benefit.label} /></span>
          <div><h3>{benefit.label}</h3><p>{benefit.description}</p></div>
        </div>
      ))}
      </div>
    </aside>
    </>
  );
}

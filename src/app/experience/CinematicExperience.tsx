import { CinematicHero } from "@/components/hero/CinematicHero";
import { ClosingExperience } from "@/components/closing/ClosingExperience";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { CommunityShowcaseSection } from "@/components/community-showcase/CommunityShowcaseSection";
import { SiteHeader } from "@/components/header/SiteHeader";
import { HairComparisonSection } from "@/components/hair-comparison/HairComparisonSection";
import { ProductShowcaseSection } from "@/components/product-showcase/ProductShowcaseSection";
import { TestimonialSection } from "@/components/testimonials/TestimonialSection";

export function CinematicExperience() {
  return (
    <>
      <a
        href="#main-content"
        className="skip-link fixed left-4 top-4 z-[100] -translate-y-24 bg-foreground px-4 py-3 text-base font-medium text-background transition focus:translate-y-0"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main-content" className="viewport-min bg-background text-foreground">
        <CinematicHero />
        <ProductShowcaseSection />
        <HairComparisonSection />
        <CommunityShowcaseSection />
        <TestimonialSection />
        <ClosingExperience />
      </main>
      <SiteFooter />
    </>
  );
}

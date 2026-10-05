import type { Metadata } from "next";
import { InnerCircleSection } from "@/components/closing/InnerCircleSection";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { TrustDetailsSection } from "@/components/closing/TrustDetailsSection";
import { SiteHeader } from "@/components/header/SiteHeader";
import { InstagramSection } from "@/components/instagram/InstagramSection";
import styles from "./TestimonialsPage.module.css";

export const metadata: Metadata = {
  title: "Testimonials",
  description:
    "See how the Àurelle community uses FA ÀURELLE Hair Elixir Oil-in-Serum, in their own Instagram Reels.",
};

// The same customer Reels shown on the product page, as a page of their own.
export default function TestimonialsPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.page}>
        <InstagramSection headingLevel="h1" />
      </main>
      <InnerCircleSection />
      <TrustDetailsSection />
      <SiteFooter />
    </>
  );
}

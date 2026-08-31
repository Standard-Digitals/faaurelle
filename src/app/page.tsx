import type { Metadata } from "next";
import { SiteHeader } from "@/components/header/SiteHeader";
import { ComingSoonExperience } from "./coming-soon/ComingSoonExperience";

export const metadata: Metadata = {
  title: "Elixir Is Near | FA ÀURELLE",
  description: "Register your interest for the forthcoming FA ÀURELLE Hair Elixir.",
};

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <ComingSoonExperience />
      </main>
    </>
  );
}

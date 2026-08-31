import type { Metadata } from "next";
import { SiteHeader } from "@/components/header/SiteHeader";
import { ComingSoonExperience } from "./ComingSoonExperience";

export const metadata: Metadata = {
  title: "Elixir Is Near | FA ÀURELLE",
  description: "Register your interest for the forthcoming FA ÀURELLE Hair Elixir.",
};

export default function ComingSoonPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <ComingSoonExperience />
      </main>
    </>
  );
}

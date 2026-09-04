import { CinematicExperience } from "@/app/experience/CinematicExperience";
import { HeroResourcePreloads } from "@/components/hero/HeroResourcePreloads";

export default function HomePage() {
  return (
    <>
      <HeroResourcePreloads />
      <CinematicExperience />
    </>
  );
}

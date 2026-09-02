"use client";

import { HeroIngredients } from "@/components/hero/HeroIngredients";

export function BotanicalEssenceChapter({
  progress,
}: {
  progress: number;
}) {
  return <HeroIngredients progress={progress} />;
}

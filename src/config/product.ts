import { brand } from "@/config/brand";

export const product = Object.freeze({
  code: "hair-elixir",
  shortName: "Hair Elixir",
  formalName: "Hair Elixir Oil-in-Serum",
  formulationTerm: "hair oil-in-serum",
  altText: `${brand.displayName} Hair Elixir bottle shown from the front`,
  accessibilityLabel: `${brand.displayName} Hair Elixir`,
  supportingIdentity: "Weightless Texture · Silk Botanique Fusion",
  unitAmountPaisa: 209_900,
  currency: "INR",
} as const);

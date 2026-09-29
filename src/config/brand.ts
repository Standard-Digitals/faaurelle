const displayName = "FA ÀURELLE";
const description = `A cinematic digital experience for ${displayName}.`;

export const brand = {
  technicalIdentifier: "fa-aurelle",
  displayName,
  description,
  accessibilityLabel: displayName,
  seo: {
    title: `${displayName} Hair Elixir Oil-in-Serum | Frizz-Free Shine`,
    description:
      "FA ÀURELLE Hair Elixir Oil-in-Serum with Silk Botanique Fusion™ for mirror-like shine, silk-touch softness & weightless frizz control. Free shipping in India.",
  },
  colors: {
    background: "#f7f3ec",
    backgroundBright: "#fcfaf6",
    foreground: "#17130f",
    muted: "#8a8177",
    gold: "#bd8c35",
    goldLight: "#ddb768",
    amber: "#3a2115",
    cream: "#eee2cf",
  },
} as const;

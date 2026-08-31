import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        "background-bright": "var(--color-background-bright)",
        foreground: "var(--color-foreground)",
        muted: "var(--color-muted)",
        gold: "var(--color-gold)",
        "gold-light": "var(--color-gold-light)",
        amber: "var(--color-amber)",
        cream: "var(--color-cream)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
      },
      spacing: {
        "layout-x": "var(--space-layout-x)",
        "section-y": "var(--space-section-y)",
      },
      maxWidth: {
        content: "var(--size-content-max)",
      },
    },
  },
  plugins: [forms],
};

export default config;

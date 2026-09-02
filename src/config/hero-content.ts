import { product } from "@/config/product";

export const heroContent = {
  chapterOne: {
    label: "Hero",
    heading: "Mirror-Like Shine. Weightless Elegance.",
    body:
      "Transform dull, frizzy hair into silky, luminous strands with exceptional glass-like radiance powered by Silk Botanique Fusion.",
  },
  chapterTwo: {
    label: "Botanical Essence Blend",
    eyebrow: "The Formula Journey",
    heading: {
      primary: "Botanical Essence",
      emphasis: "Blend",
    },
    ingredients: {
      argan: { name: "Argan", benefit: "Deep hydration" },
      jojoba: { name: "Jojoba", benefit: "Barrier repair" },
      camellia: { name: "Camellia", benefit: "Glass-like shine" },
    },
  },
  chapterThree: {
    label: product.formalName,
    supporting: "The Future of Luxury Hair Care",
    description:
      `A premium ${product.formulationTerm} crafted with advanced science and botanical excellence for hair that shines, feels smoother, and stays protected.`,
    cta: {
      label: "Shop Now",
      href: "#discover",
    },
    benefits: [
      { label: "Botanical Infusions", icon: "botanical" },
      { label: "Lightweight", icon: "lightweight" },
      { label: "Instant Deep Shine", icon: "shine" },
      { label: "Strengthens", icon: "strength" },
      { label: "Frizz & Flyaway", icon: "smooth" },
      { label: "Heat Protection", icon: "heat" },
    ],
  },
  chapterFour: {
    label: "Silk Botanique Fusion",
    eyebrow: "Advanced fusion",
    heading: {
      primary: "Silk Botanique",
      emphasis: "Fusion",
    },
    description: {
      lead:
        "A proprietary fusion of high-performance conditioning technology and carefully selected botanical oils that transforms every strand with weightless nourishment.",
      body:
        "It delivers mirror-like shine, silky softness, long-lasting frizz control, and protection against daily heat and environmental stress.",
    },
    benefitsHeading: "Key Benefits",
    benefits: [
      "Instant glass-like shine",
      "Weightless botanical nourishment",
      "Long-lasting smoothness",
      "Flyaway & frizz control",
      "Heat styling protection",
      "Soft, touchable finish",
      "Improves light reflection",
      "Suitable for all hair types",
    ],
  },
} as const;

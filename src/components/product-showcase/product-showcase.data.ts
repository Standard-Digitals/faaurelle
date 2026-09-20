import { product } from "@/config/product";
import { formatInr } from "@/lib/commerce/money";

export const productShowcaseImage = {
  image: "/images/products/best-seller-hair-elixir.png",
  alt: product.altText,
} as const;

export const productShowcaseImages = [
  { image: "/images/products/hair-elixir-hero-dark-vanity.jpeg", alt: "FA ÀURELLE Hair Elixir bottle on a warmly lit dark vanity" },
  { image: "/images/products/hair-elixir-hero-serum-marble.jpeg", alt: "FA ÀURELLE Hair Elixir bottle arranged with serum on a marble surface" },
  { image: "/images/products/hair-elixir-hero-packaging.jpeg", alt: "FA ÀURELLE Hair Elixir bottle with its black-and-gold presentation packaging" },
] as const;

export const productShowcase = {
  eyebrow: "Bestseller",
  name: product.formalName,
  tagline: "Mirror-Like Shine · Silk-Touch Softness · Weightless Elegance",
  rating: "4.9/5 (762 reviews)",
  price: formatInr(product.unitAmountPaisa),
  taxNote: "Inc. of all taxes",
  benefits: [
    "Instantly Boosts Shine & Radiance",
    "Controls Frizz & Flyaways",
    "Lightweight, Non-Greasy Formula",
    "Suitable for All Hair Types",
    "Improves Manageability",
    "Salon-Finish Effect At Home",
    "Humidity Defence",
    "Silk-Touch Softness",
  ],
  actions: {
    buyNow: "Buy now",
  },
} as const;

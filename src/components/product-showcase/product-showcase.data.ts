import { product } from "@/config/product";

export const productShowcaseImage = {
  image: "/images/products/best-seller-hair-elixir.png",
  alt: product.altText,
} as const;

export const productShowcase = {
  eyebrow: "Bestseller",
  name: product.formalName,
  tagline: "Mirror-Like Shine · Silk-Touch Softness · Weightless Elegance",
  rating: "4.9/5 (762 reviews)",
  price: "₹999",
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
    addToCart: "Add to cart",
    buyNow: "Buy now",
  },
} as const;

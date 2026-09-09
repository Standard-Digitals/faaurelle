import { product } from "@/config/product";
import { formatInr } from "@/lib/commerce/money";

export const productShowcaseImage = {
  image: "/images/products/best-seller-hair-elixir.png",
  alt: product.altText,
} as const;

export const productShowcaseImages = [
  { image: "/images/products/elixir-packaging.jpeg", alt: "FA ÀURELLE Hair Elixir presentation box on a warmly lit vanity" },
  { image: "/images/products/elixir-model.jpeg", alt: "Model with glossy dark hair holding FA ÀURELLE Hair Elixir" },
  { image: "/images/products/elixir-bottle-and-box.jpeg", alt: "FA ÀURELLE Hair Elixir bottle and black-and-gold presentation box on a marble vanity" },
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
    addToCart: "Add to cart",
    buyNow: "Buy now",
  },
} as const;

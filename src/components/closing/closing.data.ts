import { brand } from "@/config/brand";
import {
  customerCareItems,
  customerCareLabels,
  sharedNavigationLinks,
} from "@/config/navigation";
import { product } from "@/config/product";

export const closingExploreLinks = sharedNavigationLinks;
export { customerCareItems };

export const innerCircleContent = {
  eyebrow: "The Inner Circle",
  heading: "More Than Beauty. It’s a Privilege.",
  benefitsLabel: "Inner Circle benefits",
  benefits: [
    "Earn Beauty Credits",
    "Unlock Exclusive Rewards",
    "Redeem Premium Experiences",
  ],
  cta: "Know more",
  ctaTitle: "Inner Circle enrollment — coming soon",
  placeholderStatus: "Inner Circle details are coming soon.",
} as const;

export const trustDetails = [
  {
    id: "shipping",
    title: "Free shipping",
    copy: "Available on eligible orders.",
  },
  {
    id: "payment",
    title: "Secure payment",
    copy: "Protected checkout experience.",
  },
  {
    id: "returns",
    title: "Easy returns",
    copy: "Support-guided returns.",
  },
  {
    id: "quality",
    title: "Premium quality",
    copy: "Crafted with considered ingredients.",
  },
] as const;

export const trustContent = {
  heading: "Shopping assurances",
} as const;

export const footerContent = {
  brandParagraph:
    `${brand.displayName} ${product.formalName} is crafted to transform dull, frizzy hair into silky, luminous strands with exceptional glass-like radiance. Powered by Silk Botanique Fusion™, it delivers a salon-finished look while preserving the natural movement and beauty of the hair.`,
  exploreHeading: "Explore",
  customerCareHeading: customerCareLabels.heading,
  newsletter: {
    heading: "Stay connected",
    body: "Receive considered ritual notes, private-release news, and updates.",
    label: "Email address",
    placeholder: "you@example.com",
    cta: "Join",
    submitLabel: "Submit email for newsletter updates",
    placeholderStatus: "Newsletter subscription is not connected yet. Please check back soon.",
  },
  socialLabel: "Social channels",
  socials: {
    instagram: "Instagram",
    pinterest: "Pinterest",
  },
  legalLine: "Considered hair rituals",
} as const;

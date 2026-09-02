import { brand } from "@/config/brand";

export type Testimonial = {
  name: string;
  initials: string;
  profile: string;
  quote: string;
  tag: string;
  rating: number;
  verified: boolean;
};

export const testimonialContent = {
  eyebrow: "Customer Stories",
  heading: {
    leading: "Loved in",
    emphasis: "every ritual.",
  },
  body: `Real experiences from customers who made ${brand.displayName} part of their everyday hair routine.`,
} as const;

// Temporary placeholders: replace every testimonial below with approved client reviews.
export const testimonials: readonly Testimonial[] = [
  {
    name: "Aarohi Mehta",
    initials: "AM",
    profile: "Fine, frizz-prone hair",
    quote:
      "By the third week, my hair looked smoother without losing its natural movement. It feels polished, not coated.",
    tag: "Morning Ritual",
    rating: 5,
    verified: true,
  },
  {
    name: "Naina Kapoor",
    initials: "NK",
    profile: "Dry, colour-treated hair",
    quote:
      "It gives my ends the softness I usually only get after a salon appointment, while still feeling beautifully lightweight.",
    tag: "Colour Care",
    rating: 5,
    verified: true,
  },
  {
    name: "Ishita Rao",
    initials: "IR",
    profile: "Curly, high-porosity hair",
    quote:
      "My curls feel more defined and the finish stays soft. I especially love that it never leaves a heavy, oily layer.",
    tag: "Curl Ritual",
    rating: 5,
    verified: true,
  },
  {
    name: "Riya Malhotra",
    initials: "RM",
    profile: "Frequently heat-styled hair",
    quote:
      "One pump before styling makes my hair look noticeably more refined. The shine feels expensive rather than artificial.",
    tag: "Styling Ritual",
    rating: 5,
    verified: true,
  },
  {
    name: "Ananya Sharma",
    initials: "AS",
    profile: "Wavy, humidity-prone hair",
    quote:
      "It has become the final step I never skip. My waves stay controlled, touchable, and much easier to manage.",
    tag: "Daily Essential",
    rating: 5,
    verified: true,
  },
] as const;

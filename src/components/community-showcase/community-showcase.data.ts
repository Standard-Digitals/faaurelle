export type CommunityImage = {
  src: string;
  shape: "portrait" | "editorial" | "wide";
};

const imageRoot = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/community-showcase`;

export const communityShowcaseContent = {
  eyebrow: "Community Rituals",
  heading: ["Hair rituals,", "beautifully transformed."],
  body: "From weightless softness to mirror-like shine, discover a ritual designed for every texture.",
  cta: "Discover the ritual",
} as const;

export const communityRows: ReadonlyArray<{
  id: string;
  direction: "left" | "right";
  duration: number;
  images: readonly CommunityImage[];
}> = [
  {
    id: "top",
    direction: "left",
    duration: 38,
    images: [
      { src: `${imageRoot}/glossy-hair-profile.webp`, shape: "wide" },
      { src: `${imageRoot}/natural-hair-texture.webp`, shape: "portrait" },
      { src: `${imageRoot}/botanical-dew-macro.webp`, shape: "editorial" },
      { src: `${imageRoot}/mature-hair-portrait.webp`, shape: "portrait" },
      { src: `${imageRoot}/leaf-water-texture.webp`, shape: "editorial" },
    ],
  },
  {
    id: "middle",
    direction: "right",
    duration: 44,
    images: [
      { src: `${imageRoot}/hair-movement.webp`, shape: "portrait" },
      { src: `${imageRoot}/editorial-hair-portrait.webp`, shape: "wide" },
      { src: `${imageRoot}/blonde-hair-editorial.webp`, shape: "editorial" },
      { src: `${imageRoot}/glossy-dark-hair.webp`, shape: "portrait" },
      { src: `${imageRoot}/silver-hair-editorial.webp`, shape: "portrait" },
    ],
  },
  {
    id: "bottom",
    direction: "left",
    duration: 41,
    images: [
      { src: `${imageRoot}/curly-hair-motion.webp`, shape: "editorial" },
      { src: `${imageRoot}/hair-care-ritual.webp`, shape: "portrait" },
      { src: `${imageRoot}/wet-hair-ritual.webp`, shape: "editorial" },
      { src: `${imageRoot}/textured-hair-detail.webp`, shape: "portrait" },
    ],
  },
];

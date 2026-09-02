const imageRoot = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/images/hair-comparison`;

export const hairComparisonContent = {
  heading: "Hair transformation comparison",
  before: {
    image: {
      src: `${imageRoot}/hair-before-dull-dry-lifeless.png`,
      alt: "Before composition describing dull, dry and lifeless hair beside a model with rough, frizzy hair",
    },
  },
  after: {
    image: {
      src: `${imageRoot}/hair-after-shine-and-smooth.png`,
      alt: "After composition describing extraordinary shine and lightness beside a model with smooth, glossy hair",
    },
  },
  sliderLabel: "Adjust the before and after hair comparison",
} as const;

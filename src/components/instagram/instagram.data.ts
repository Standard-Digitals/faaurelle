export type UgcReel = Readonly<{
  id: string;
  url: string;
}>;

// Array order is grid order. Use a unique ID even when URLs repeat.
export const ugcReels: readonly UgcReel[] = [
  {
    id: "aurelle-reel-01",
    url: "https://www.instagram.com/reel/DdMPAJAte1s",
  },
  {
    id: "aurelle-reel-02",
    url: "https://www.instagram.com/reel/DdMPAJAte1s",
  },
];

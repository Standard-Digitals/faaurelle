export type UgcReel = Readonly<{
  id: string;
  url: string;
}>;

// Array order is grid order. Use a unique ID even when URLs repeat.
export const ugcReels: readonly UgcReel[] = [
  {
    id: "aurelle-reel-01",
    url: "https://www.instagram.com/reel/DdirunzhnPD/?stkn=a2NmeDlneHk0eWR0",
  },
  {
    id: "aurelle-reel-02",
    url: "https://www.instagram.com/reel/Ddid99DpYHG/?stkn=MWV0Y2pyOWVlejdyYQ==",
  },
];

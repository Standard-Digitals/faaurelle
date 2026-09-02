export type BotanicalPoint = readonly [number, number];

export function quadraticBotanicalPoint(
  origin: BotanicalPoint,
  control: BotanicalPoint,
  final: BotanicalPoint,
  progress: number,
): BotanicalPoint {
  const inverse = 1 - progress;
  return [
    inverse * inverse * origin[0] +
      2 * inverse * progress * control[0] +
      progress * progress * final[0],
    inverse * inverse * origin[1] +
      2 * inverse * progress * control[1] +
      progress * progress * final[1],
  ];
}

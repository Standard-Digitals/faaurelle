import "server-only";

import { randomBytes } from "node:crypto";

export function createCustomerOrderReference(
  random: (size: number) => Buffer = randomBytes,
): string {
  return `FA-${random(10).toString("hex").toUpperCase()}`;
}

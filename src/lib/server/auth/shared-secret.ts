import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

const MIN_SECRET_LENGTH = 24;

// Constant-time comparison against a secret from the environment. A missing
// or short secret never matches, so an unconfigured endpoint stays closed.
export function matchesSharedSecret(provided: string | null | undefined, expected: string | undefined) {
  const secret = expected?.trim();
  if (!secret || secret.length < MIN_SECRET_LENGTH || !provided) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(provided), digest(secret));
}

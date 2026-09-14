export const CONFIRMATION_RECOVERY_KEY = "fa:pending-order-confirmation";

const PUBLIC_ORDER_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

export type ConfirmationRecovery = Readonly<{
  token: string;
  attempted: boolean;
}>;

export function isPublicOrderToken(value: string): boolean {
  return PUBLIC_ORDER_TOKEN.test(value);
}

export function serializeConfirmationRecovery(token: string, attempted: boolean): string {
  return JSON.stringify({ token, attempted });
}

export function parseConfirmationRecovery(value: string | null): ConfirmationRecovery | null {
  if (!value) return null;

  // Accept the plain-token value briefly used during Phase 8 development.
  if (isPublicOrderToken(value)) return { token: value, attempted: false };

  try {
    const parsed = JSON.parse(value) as { token?: unknown; attempted?: unknown };
    if (
      typeof parsed.token !== "string" ||
      !isPublicOrderToken(parsed.token) ||
      typeof parsed.attempted !== "boolean"
    ) {
      return null;
    }
    return { token: parsed.token, attempted: parsed.attempted };
  } catch {
    return null;
  }
}

export function shouldAttemptConfirmationRecovery(recovery: ConfirmationRecovery | null): boolean {
  return Boolean(recovery && !recovery.attempted);
}

export function shouldClearConfirmationRecovery(
  recovery: ConfirmationRecovery | null,
  confirmedToken: string,
): boolean {
  return recovery?.token === confirmedToken;
}

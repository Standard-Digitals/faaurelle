import { describe, expect, it } from "vitest";
import {
  isPublicOrderToken,
  parseConfirmationRecovery,
  serializeConfirmationRecovery,
  shouldAttemptConfirmationRecovery,
  shouldClearConfirmationRecovery,
} from "./confirmation-recovery";

const token = "opaque_public_token_12345678901234567890";

describe("confirmation recovery marker", () => {
  it("round-trips a pending recovery without exposing payment state", () => {
    expect(parseConfirmationRecovery(serializeConfirmationRecovery(token, false))).toEqual({
      token,
      attempted: false,
    });
  });

  it("records that automatic recovery has already been attempted", () => {
    const recovery = parseConfirmationRecovery(serializeConfirmationRecovery(token, true));
    expect(recovery).toEqual({
      token,
      attempted: true,
    });
    expect(shouldAttemptConfirmationRecovery(recovery)).toBe(false);
  });

  it("attempts an interrupted redirect once and clears only after matching confirmation", () => {
    const recovery = parseConfirmationRecovery(serializeConfirmationRecovery(token, false));
    expect(shouldAttemptConfirmationRecovery(recovery)).toBe(true);
    expect(shouldClearConfirmationRecovery(recovery, token)).toBe(true);
    expect(shouldClearConfirmationRecovery(recovery, `${token}x`)).toBe(false);
  });

  it("accepts a legacy plain marker and rejects malformed or stale values", () => {
    expect(parseConfirmationRecovery(token)).toEqual({ token, attempted: false });
    expect(parseConfirmationRecovery("not-a-token")).toBeNull();
    expect(parseConfirmationRecovery('{"token":"not-a-token","attempted":false}')).toBeNull();
    expect(parseConfirmationRecovery(null)).toBeNull();
    expect(isPublicOrderToken(token)).toBe(true);
  });
});

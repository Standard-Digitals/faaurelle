"use client";

import { useEffect } from "react";
import {
  CONFIRMATION_RECOVERY_KEY,
  parseConfirmationRecovery,
  shouldClearConfirmationRecovery,
} from "@/lib/commerce/confirmation-recovery";

export function ConfirmationArrival({ token }: { token: string }) {
  useEffect(() => {
    const recovery = parseConfirmationRecovery(
      window.sessionStorage.getItem(CONFIRMATION_RECOVERY_KEY),
    );
    if (shouldClearConfirmationRecovery(recovery, token)) {
      window.sessionStorage.removeItem(CONFIRMATION_RECOVERY_KEY);
    }
  }, [token]);

  return null;
}

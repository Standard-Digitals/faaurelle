import "server-only";
import { describeDelhiveryResponseShape, fetchDelhiveryServiceability } from "./client";
import {
  DelhiveryServiceabilityError,
  type DelhiveryServiceabilityResult,
} from "./types";

type ServiceabilityTransport = (postalCode: string) => Promise<unknown>;

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function normalizeDelhiveryServiceability(
  postalCode: string,
  payload: unknown,
): DelhiveryServiceabilityResult {
  if (!payload || typeof payload !== "object") {
    throw new DelhiveryServiceabilityError("malformed_response", {
      stage: "parsing",
      responseShape: describeDelhiveryResponseShape(payload),
    });
  }

  const deliveryCodes = (payload as Record<string, unknown>).delivery_codes;
  if (!Array.isArray(deliveryCodes)) {
    throw new DelhiveryServiceabilityError("malformed_response", {
      stage: "parsing",
      responseShape: describeDelhiveryResponseShape(payload),
    });
  }
  if (deliveryCodes.length === 0) return { postalCode, prepaidServiceable: false };

  const firstCode = deliveryCodes[0];
  if (!firstCode || typeof firstCode !== "object") {
    throw new DelhiveryServiceabilityError("malformed_response", {
      stage: "parsing",
      responseShape: "delivery_codes:item-not-object",
    });
  }
  const postalCodeData = (firstCode as Record<string, unknown>).postal_code;
  if (!postalCodeData || typeof postalCodeData !== "object") {
    throw new DelhiveryServiceabilityError("malformed_response", {
      stage: "parsing",
      responseShape: "delivery_codes:postal_code-not-object",
    });
  }

  const record = postalCodeData as Record<string, unknown>;
  if (record.pre_paid !== "Y" && record.pre_paid !== "N") {
    throw new DelhiveryServiceabilityError("malformed_response", {
      stage: "parsing",
      responseShape: "postal_code:invalid-pre_paid",
    });
  }
  if (String(record.pin) !== postalCode) {
    throw new DelhiveryServiceabilityError("malformed_response", {
      stage: "parsing",
      responseShape: "postal_code:pin-mismatch",
    });
  }

  const city = optionalString(record.city);
  const stateCode = optionalString(record.state_code);
  const destination = city || stateCode ? { city, stateCode } : undefined;
  const embargoed = optionalString(record.remarks)?.toLocaleLowerCase() === "embargo";

  return {
    postalCode,
    prepaidServiceable: record.pre_paid === "Y" && !embargoed,
    ...(destination ? { destination } : {}),
  };
}

export async function checkDelhiveryPrepaidServiceability(
  postalCode: string,
  transport: ServiceabilityTransport = fetchDelhiveryServiceability,
): Promise<DelhiveryServiceabilityResult> {
  const payload = await transport(postalCode);
  return normalizeDelhiveryServiceability(postalCode, payload);
}

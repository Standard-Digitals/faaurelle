import "server-only";

export type DelhiveryServiceabilityResult = Readonly<{
  postalCode: string;
  prepaidServiceable: boolean;
  destination?: Readonly<{
    city?: string;
    stateCode?: string;
  }>;
}>;

export type DelhiveryErrorKind =
  | "configuration"
  | "authentication"
  | "timeout"
  | "network"
  | "provider"
  | "malformed_response";

export type DelhiveryDiagnosticContext = Readonly<{
  stage: "configuration" | "request" | "response" | "parsing" | "unknown";
  providerHost?: string;
  httpStatus?: number;
  responseContentType?: string;
  responseShape?: string;
  missingConfiguration?: readonly string[];
  causeName?: string;
  causeCode?: string;
}>;

export class DelhiveryServiceabilityError extends Error {
  constructor(
    readonly kind: DelhiveryErrorKind,
    readonly diagnostic: DelhiveryDiagnosticContext = { stage: "unknown" },
    options?: ErrorOptions,
  ) {
    super(`Delhivery serviceability failed: ${kind}`, options);
    this.name = "DelhiveryServiceabilityError";
  }
}

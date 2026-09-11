import "server-only";

export type RazorpayOrder = Readonly<{
  id: string;
  amount: number;
  currency: "INR";
  receipt: string;
  status: "created" | "attempted" | "paid";
}>;

export type RazorpayPayment = Readonly<{
  id: string;
  orderId: string;
  amount: number;
  currency: "INR";
  status: "created" | "authorized" | "captured" | "failed" | "refunded";
  captured: boolean;
  createdAt: Date;
}>;

export type RazorpayErrorKind =
  | "configuration"
  | "authentication"
  | "definitive"
  | "timeout"
  | "network"
  | "malformed_response";

export type RazorpayDiagnosticContext = Readonly<{
  stage: "configuration" | "request" | "response" | "parsing" | "unknown";
  providerHost?: string;
  httpStatus?: number;
  responseContentType?: string;
  causeName?: string;
  causeCode?: string;
  missingConfiguration?: readonly string[];
  paymentModeSupported?: boolean;
  responseShape?: string;
  providerErrorCode?: string;
  providerReason?: string;
  providerStep?: string;
  providerSource?: string;
  providerMessage?: string;
  providerRequestId?: string;
  responseContentLength?: string;
}>;

export class RazorpayOrderError extends Error {
  constructor(
    readonly kind: RazorpayErrorKind,
    readonly diagnostic: RazorpayDiagnosticContext = { stage: "unknown" },
    options?: ErrorOptions,
  ) {
    super(`Razorpay order operation failed: ${kind}`, options);
    this.name = "RazorpayOrderError";
  }
}

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

export class RazorpayOrderError extends Error {
  constructor(readonly kind: RazorpayErrorKind, options?: ErrorOptions) {
    super(`Razorpay order operation failed: ${kind}`, options);
    this.name = "RazorpayOrderError";
  }
}

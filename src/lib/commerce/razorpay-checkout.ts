export type RazorpaySuccessResponse = Readonly<{
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}>;

export type RazorpayCheckoutOptions = Readonly<{
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id: string;
  prefill: Readonly<{ name: string; email: string; contact: string }>;
  handler: (response: RazorpaySuccessResponse) => void;
  modal: Readonly<{ ondismiss: () => void }>;
}>;

type RazorpayInstance = {
  open(): void;
  on(event: "payment.failed", handler: () => void): void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
let loadingScript: Promise<void> | undefined;

export function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loadingScript) return loadingScript;

  const scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SCRIPT}"]`);
    const script = existing ?? document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => window.Razorpay ? resolve() : reject(new Error("Checkout unavailable"));
    script.onerror = () => reject(new Error("Checkout script failed"));
    if (!existing) document.head.append(script);
  }).catch((error) => {
    loadingScript = undefined;
    throw error;
  });
  loadingScript = scriptPromise;
  return scriptPromise;
}

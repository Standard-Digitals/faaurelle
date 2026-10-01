export const META_PIXEL_ID = "2169167907337885";

export const metaRelayedEventNames = [
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
] as const;

export type MetaRelayedEventName = (typeof metaRelayedEventNames)[number];

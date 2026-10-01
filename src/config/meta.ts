export const META_PIXEL_ID = "2169167907337885";

// Content IDs of the "Faaurelle" catalogue in Commerce Manager. Events must
// use these IDs, not the site's product codes, to match catalogue products.
const metaCatalogueContentIds: Readonly<Record<string, string>> = {
  "hair-elixir": "kadilj9u0i",
};

export function toMetaContentId(productCode: string) {
  return metaCatalogueContentIds[productCode] ?? productCode;
}

export const metaRelayedEventNames = [
  "ViewContent",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
] as const;

export type MetaRelayedEventName = (typeof metaRelayedEventNames)[number];

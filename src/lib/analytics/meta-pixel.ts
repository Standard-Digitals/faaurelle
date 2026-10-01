"use client";

import { META_PIXEL_ID, type MetaRelayedEventName } from "@/config/meta";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

type StandardEventParams = Readonly<{
  content_ids: readonly string[];
  content_name: string;
  content_type: "product";
  currency: "INR";
  value: number;
  num_items?: number;
}>;

export type MetaAdvancedMatching = Readonly<{
  email: string;
  phone: string;
  fullName: string;
  city: string;
  state: string;
  pincode: string;
}>;

const RELAY_PATH = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/meta/events`;

function hasPixel() {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

// Meta grades price data on value, currency and a per-item contents array,
// so every event carries all three as plain numbers.
function withPriceData(params: StandardEventParams) {
  const quantity = params.num_items ?? 1;
  const value = roundCurrency(params.value);
  return {
    ...params,
    value,
    num_items: quantity,
    contents: params.content_ids.map((id) => ({
      id,
      quantity,
      item_price: roundCurrency(value / quantity),
    })),
  };
}

function newEventId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Sends the same event to the Conversions API through our server; Meta
// deduplicates it against the pixel event by event name and event ID.
function relay(eventName: MetaRelayedEventName, eventId: string, customData: ReturnType<typeof withPriceData>) {
  try {
    void fetch(RELAY_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        customData,
      }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Tracking must never break the page.
  }
}

function track(eventName: MetaRelayedEventName, params: StandardEventParams) {
  if (typeof window === "undefined") return;
  const eventId = newEventId();
  const customData = withPriceData(params);
  if (hasPixel()) window.fbq!("track", eventName, customData, { eventID: eventId });
  relay(eventName, eventId, customData);
}

export function trackPageView() {
  if (!hasPixel()) return;
  window.fbq!("track", "PageView");
}

// Manual advanced matching: re-initialising the pixel with customer details
// attaches them (hashed by the pixel) to every later event on this page load.
export function setAdvancedMatching(customer: MetaAdvancedMatching) {
  if (!hasPixel()) return;
  const [firstName, ...rest] = customer.fullName.trim().toLowerCase().split(/\s+/);
  window.fbq!("init", META_PIXEL_ID, {
    em: customer.email.trim().toLowerCase(),
    ph: customer.phone.replace(/\D/g, ""),
    fn: firstName,
    ...(rest.length ? { ln: rest[rest.length - 1] } : {}),
    ct: customer.city.toLowerCase().replace(/[^a-z]/g, ""),
    st: customer.state.toLowerCase().replace(/[^a-z]/g, ""),
    zp: customer.pincode.replace(/\s/g, ""),
    country: "in",
  });
}

export function trackViewContent(params: StandardEventParams) {
  track("ViewContent", params);
}

export function trackAddToCart(params: StandardEventParams) {
  track("AddToCart", params);
}

export function trackInitiateCheckout(params: StandardEventParams) {
  track("InitiateCheckout", params);
}

export function trackAddPaymentInfo(params: StandardEventParams) {
  track("AddPaymentInfo", params);
}

// The server sends Purchase to the Conversions API itself once the payment is
// verified, using the order reference as the shared event ID.
export function trackPurchase(params: StandardEventParams, eventId: string) {
  if (!hasPixel()) return;
  window.fbq!("track", "Purchase", withPriceData(params), { eventID: eventId });
}

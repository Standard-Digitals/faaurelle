"use client";

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

function track(eventName: string, params: StandardEventParams, eventId?: string) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  if (eventId) {
    window.fbq("track", eventName, params, { eventID: eventId });
  } else {
    window.fbq("track", eventName, params);
  }
}

export function trackPageView() {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", "PageView");
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

export function trackPurchase(params: StandardEventParams, eventId: string) {
  track("Purchase", params, eventId);
}

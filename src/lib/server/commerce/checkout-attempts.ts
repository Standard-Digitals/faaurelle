import "server-only";
import type { CheckoutContactDraft, NormalizedCheckoutDetails } from "@/lib/commerce/checkout-validation";
import { formatInr } from "@/lib/commerce/money";
import { prisma } from "@/lib/server/db/prisma";

const IST = "Asia/Kolkata";
const ORDER_LINK_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;
const PURCHASE_CLOCK_SLACK_MS = 60 * 1000;

export type CheckoutDeliveryCheck = "SERVICEABLE" | "NOT_SERVICEABLE" | "CHECK_FAILED";
export type CheckoutAttemptSource = "CHECKOUT" | "PRODUCT_POPUP";

export type CheckoutAttemptOrder = Readonly<{
  customerReference: string;
  status: string;
  paymentStatus: string;
  totalPaisa: number;
}>;

export type CheckoutAttemptRecord = Readonly<{
  id: string;
  productCode: string;
  // Where the customer first left their details.
  source: CheckoutAttemptSource;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  // Null while the customer has only typed contact details.
  deliveryCheck: CheckoutDeliveryCheck | null;
  detailsCheckCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  order: CheckoutAttemptOrder | null;
}>;

export type CheckoutOutcome =
  | "ordered"
  | "payment_failed"
  | "payment_not_completed"
  | "not_serviceable"
  | "delivery_check_failed"
  | "details_only"
  | "contact_only"
  | "popup_only";

export const checkoutOutcomeLabels: Record<CheckoutOutcome, string> = {
  ordered: "Ordered",
  payment_failed: "Payment failed",
  payment_not_completed: "Opened payment, did not pay",
  not_serviceable: "Pincode not serviceable",
  delivery_check_failed: "Delivery check failed (courier unavailable)",
  details_only: "Filled details, did not continue to payment",
  contact_only: "Entered contact details, did not finish the form",
  popup_only: "Claimed the popup offer, did not check out",
};

export function istDay(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: IST }).format(value);
}

export function startOfIstDay(value: Date) {
  return new Date(`${istDay(value)}T00:00:00+05:30`);
}

export function formatIstDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: IST }).format(value);
}

export function checkoutAttemptDedupeKey(details: Pick<NormalizedCheckoutDetails, "email" | "mobileNumber">, now: Date) {
  return `${istDay(now)}|${details.email.toLowerCase()}|${details.mobileNumber}`;
}

// purchased: a captured order for the same customer exists, even when it is
// not the order linked to this attempt (e.g. they paid from another device).
export function describeCheckoutOutcome(attempt: CheckoutAttemptRecord, purchased = false): CheckoutOutcome {
  if (purchased || attempt.order?.paymentStatus === "CAPTURED") return "ordered";
  if (attempt.order?.paymentStatus === "FAILED") return "payment_failed";
  if (attempt.order) return "payment_not_completed";
  if (attempt.deliveryCheck === "NOT_SERVICEABLE") return "not_serviceable";
  if (attempt.deliveryCheck === "CHECK_FAILED") return "delivery_check_failed";
  if (!attempt.deliveryCheck) return attempt.source === "PRODUCT_POPUP" ? "popup_only" : "contact_only";
  return "details_only";
}

const attemptSelect = {
  id: true, productCode: true, source: true, customerName: true, customerEmail: true, customerPhone: true,
  addressLine1: true, addressLine2: true, city: true, state: true, postalCode: true,
  deliveryCheck: true, detailsCheckCount: true, firstSeenAt: true, lastSeenAt: true,
  order: { select: { customerReference: true, status: true, paymentStatus: true, totalPaisa: true } },
} as const;

function sessionDedupeKey(checkoutKey: string) {
  return `session|${checkoutKey}`;
}

// The attempt this checkout session already saved, or else today's attempt
// by the same customer (by email or by mobile), so one customer is one row
// per IST day however they fill the form.
async function findOpenAttempt(checkoutKey: string | null, email: string, phone: string, now: Date) {
  const sameCustomer = [
    ...(email ? [{ customerEmail: email }] : []),
    ...(phone ? [{ customerPhone: phone }] : []),
  ];
  return prisma.checkoutAttempt.findFirst({
    where: {
      OR: [
        ...(checkoutKey ? [{ dedupeKey: sessionDedupeKey(checkoutKey) }] : []),
        ...(sameCustomer.length ? [{ firstSeenAt: { gte: startOfIstDay(now) }, OR: sameCustomer }] : []),
      ],
    },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
  });
}

// Called once the customer submits the form and delivery has been checked.
export async function recordCheckoutAttempt(
  productCode: string,
  details: NormalizedCheckoutDetails,
  deliveryCheck: CheckoutDeliveryCheck,
  checkoutKey: string | null = null,
  now = new Date(),
) {
  const contact = {
    productCode,
    customerName: details.fullName,
    customerEmail: details.email.toLowerCase(),
    customerPhone: details.mobileNumber,
    addressLine1: details.addressLine1,
    addressLine2: details.addressLine2,
    city: details.city,
    state: details.state,
    postalCode: details.pincode,
    countryCode: details.countryCode,
    deliveryCheck,
  };
  const existing = await findOpenAttempt(checkoutKey, contact.customerEmail, contact.customerPhone, now);
  if (existing) {
    return prisma.checkoutAttempt.update({
      where: { id: existing.id },
      data: { ...contact, lastSeenAt: now, detailsCheckCount: { increment: 1 } },
      select: attemptSelect,
    });
  }
  return prisma.checkoutAttempt.create({
    data: {
      ...contact,
      dedupeKey: checkoutKey ? sessionDedupeKey(checkoutKey) : checkoutAttemptDedupeKey(details, now),
      firstSeenAt: now,
      lastSeenAt: now,
    },
    select: attemptSelect,
  });
}

// Called while the customer is still typing, as soon as there is a valid
// email or mobile number. Only fills in what they have typed so far and never
// overwrites details saved by a full submission with blanks. Also saves the
// product page popup, as a separate source; a later checkout by the same
// customer that day updates the same row and keeps where they came from.
export async function recordCheckoutContact(
  productCode: string,
  checkoutKey: string,
  contact: CheckoutContactDraft,
  source: CheckoutAttemptSource = "CHECKOUT",
  now = new Date(),
) {
  const typed = Object.fromEntries(Object.entries({
    customerName: contact.fullName,
    customerEmail: contact.email,
    customerPhone: contact.mobileNumber,
    addressLine1: contact.addressLine1,
    addressLine2: contact.addressLine2,
    city: contact.city,
    state: contact.state,
    postalCode: contact.pincode,
  }).filter(([, value]) => value));
  const existing = await findOpenAttempt(checkoutKey, contact.email, contact.mobileNumber, now);
  if (existing) {
    return prisma.checkoutAttempt.update({
      where: { id: existing.id },
      data: { ...typed, lastSeenAt: now },
      select: attemptSelect,
    });
  }
  return prisma.checkoutAttempt.create({
    data: {
      productCode,
      source,
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      addressLine1: "",
      city: "",
      state: "",
      postalCode: "",
      ...typed,
      dedupeKey: sessionDedupeKey(checkoutKey),
      detailsCheckCount: 0,
      firstSeenAt: now,
      lastSeenAt: now,
    },
    select: attemptSelect,
  });
}

// Claims the one instant owner alert per attempt. Returns false when it was
// already claimed, so concurrent delivery checks cannot send it twice.
export async function claimCheckoutAttemptAlert(attemptId: string, now = new Date()) {
  const claimed = await prisma.checkoutAttempt.updateMany({
    where: { id: attemptId, ownerAlertSentAt: null },
    data: { ownerAlertSentAt: now },
  });
  return claimed.count === 1;
}

export async function releaseCheckoutAttemptAlert(attemptId: string, claimedAt: Date) {
  await prisma.checkoutAttempt.updateMany({
    where: { id: attemptId, ownerAlertSentAt: claimedAt },
    data: { ownerAlertSentAt: null },
  });
}

export async function linkCheckoutAttemptToOrder(publicOrderToken: string) {
  const order = await prisma.order.findUnique({
    where: { publicToken: publicOrderToken },
    select: { id: true, customerEmail: true, customerPhone: true, createdAt: true },
  });
  if (!order) return;
  const attempt = await prisma.checkoutAttempt.findFirst({
    where: {
      customerEmail: order.customerEmail.toLowerCase(),
      customerPhone: order.customerPhone,
      lastSeenAt: { gte: new Date(order.createdAt.getTime() - ORDER_LINK_WINDOW_MS) },
    },
    orderBy: { lastSeenAt: "desc" },
    select: { id: true },
  });
  if (!attempt) return;
  await prisma.checkoutAttempt.update({ where: { id: attempt.id }, data: { orderId: order.id } });
}

// When each customer (by email or by phone) placed captured orders, for
// orders placed on or after the earliest of the given attempts.
export async function findPurchasingCustomers(attempts: readonly CheckoutAttemptRecord[]) {
  const purchases = new Map<string, number[]>();
  if (!attempts.length) return purchases;
  const since = new Date(Math.min(...attempts.map((attempt) => attempt.firstSeenAt.getTime())) - PURCHASE_CLOCK_SLACK_MS);
  const paid = await prisma.order.findMany({
    where: {
      paymentStatus: "CAPTURED",
      createdAt: { gte: since },
      OR: [
        { customerEmail: { in: [...new Set(attempts.map((attempt) => attempt.customerEmail).filter(Boolean))], mode: "insensitive" } },
        { customerPhone: { in: [...new Set(attempts.map((attempt) => attempt.customerPhone).filter(Boolean))] } },
      ],
    },
    select: { customerEmail: true, customerPhone: true, createdAt: true },
  });
  for (const order of paid) {
    for (const key of [`email:${order.customerEmail.toLowerCase()}`, `phone:${order.customerPhone}`]) {
      purchases.set(key, [...(purchases.get(key) ?? []), order.createdAt.getTime()]);
    }
  }
  return purchases;
}

// True when the customer paid for an order placed after this attempt began,
// so an earlier purchase does not hide a later abandoned checkout.
export function hasPurchased(attempt: CheckoutAttemptRecord, purchases: ReadonlyMap<string, readonly number[]>) {
  const startedAt = attempt.firstSeenAt.getTime() - PURCHASE_CLOCK_SLACK_MS;
  return [attempt.customerEmail && `email:${attempt.customerEmail.toLowerCase()}`, attempt.customerPhone && `phone:${attempt.customerPhone}`]
    .some((key) => (purchases.get(key) ?? []).some((paidAt) => paidAt >= startedAt));
}

export async function listCheckoutAttempts(where: { from?: Date; to?: Date; undigestedBefore?: Date }) {
  return prisma.checkoutAttempt.findMany({
    where: where.undigestedBefore
      ? { digestSentAt: null, firstSeenAt: { lt: where.undigestedBefore } }
      : { firstSeenAt: { ...(where.from ? { gte: where.from } : {}), ...(where.to ? { lt: where.to } : {}) } },
    orderBy: { firstSeenAt: "asc" },
    select: attemptSelect,
  });
}

export async function markCheckoutAttemptsDigested(ids: readonly string[], now = new Date()) {
  if (!ids.length) return;
  await prisma.checkoutAttempt.updateMany({ where: { id: { in: [...ids] }, digestSentAt: null }, data: { digestSentAt: now } });
}

// Phones are stored as +91XXXXXXXXXX; spreadsheets read a leading "+" as a
// formula, so lists show the 10-digit number under a "Mobile (+91)" heading.
export function nationalMobile(phone: string) {
  return phone.replace(/^\+91/, "");
}

function csvCell(value: string | number) {
  let text = String(value);
  // Neutralise spreadsheet formulas in customer-typed text.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function checkoutAttemptsCsv(rows: readonly { attempt: CheckoutAttemptRecord; outcome: CheckoutOutcome }[]) {
  const header = [
    "First seen (IST)", "Last seen (IST)", "Name", "Email", "Mobile (+91)",
    "Address line 1", "Address line 2", "City", "State", "Pincode",
    "Delivery available", "Times checked", "Outcome", "Order reference", "Order total", "Source",
  ];
  const deliveryLabels: Record<CheckoutDeliveryCheck, string> = {
    SERVICEABLE: "Yes",
    NOT_SERVICEABLE: "No",
    CHECK_FAILED: "Unknown",
  };
  const lines = rows.map(({ attempt, outcome }) => [
    formatIstDateTime(attempt.firstSeenAt),
    formatIstDateTime(attempt.lastSeenAt),
    attempt.customerName,
    attempt.customerEmail,
    nationalMobile(attempt.customerPhone),
    attempt.addressLine1,
    attempt.addressLine2 ?? "",
    attempt.city,
    attempt.state,
    attempt.postalCode,
    attempt.deliveryCheck ? deliveryLabels[attempt.deliveryCheck] : "Not checked",
    attempt.detailsCheckCount,
    checkoutOutcomeLabels[outcome],
    attempt.order?.customerReference ?? "",
    attempt.order ? formatInr(attempt.order.totalPaisa) : "",
    attempt.source === "PRODUCT_POPUP" ? "Product page popup" : "Checkout",
  ].map(csvCell).join(","));
  // The byte-order mark makes Excel open the file as UTF-8 (₹, accents).
  return `﻿${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
}

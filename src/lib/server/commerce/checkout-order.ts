import "server-only";
import { after } from "next/server";
import { randomBytes, randomUUID } from "node:crypto";
import type { Order } from "@/generated/prisma/client";
import { prisma } from "@/lib/server/db/prisma";
import { validateCheckoutPayload, type CheckoutFieldErrors } from "@/lib/commerce/checkout-validation";
import { checkDelhiveryPrepaidServiceability } from "@/lib/server/delhivery/serviceability";
import { getAuthoritativeProduct } from "./products";
import { calculateV1Pricing, V1_QUANTITY } from "./pricing";
import {
  createRazorpayOrder,
  findRazorpayOrderByReceipt,
  getRazorpayPublicKey,
} from "@/lib/server/razorpay/client";
import { RazorpayOrderError, type RazorpayOrder } from "@/lib/server/razorpay/types";
import { createCustomerOrderReference } from "./customer-order-reference";
import { validateCouponEligibility, SINGLE_USE_REDEMPTION_IDENTITY } from "./coupons";
import { fulfilPaidOrder } from "./fulfilment-service";
import { sendOrderCompletionEmail } from "./order-email";

const CHECKOUT_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeCause(error: unknown) {
  if (!error || typeof error !== "object") return {};
  const value = error as { name?: unknown; code?: unknown; cause?: unknown };
  const nested = value.cause && typeof value.cause === "object" ? value.cause as { code?: unknown } : undefined;
  return {
    ...(typeof value.name === "string" ? { causeName: value.name } : {}),
    ...(typeof value.code === "string"
      ? { causeCode: value.code }
      : typeof nested?.code === "string" ? { causeCode: nested.code } : {}),
  };
}

function logCheckoutPreparationFailure(stage: string, error: unknown, orderId?: string) {
  const diagnosticId = randomUUID();
  if (error instanceof RazorpayOrderError) {
    console.error("[commerce:checkout-payment-preparation]", {
      diagnosticId,
      operation: stage,
      kind: error.kind,
      ...(orderId ? { orderId } : {}),
      ...error.diagnostic,
    });
  } else {
    console.error("[commerce:checkout-payment-preparation]", {
      diagnosticId,
      operation: stage,
      stage: "unknown",
      kind: "unexpected",
      ...(orderId ? { orderId } : {}),
      ...safeCause(error),
    });
  }
  return diagnosticId;
}

export type CreateCheckoutInput = Readonly<{
  checkoutKey: string;
  productCode: string;
  quantity: 1;
  details: unknown;
  couponCode?: string | null;
}>;

export type CreateCheckoutResponse =
  | { success: false; kind: "validation"; errors: CheckoutFieldErrors; formError?: string }
  | { success: false; kind: "conflict" | "coupon_invalid" | "coupon_used" | "unserviceable" | "service_unavailable" | "payment_unavailable" | "payment_pending"; message: string }
  | {
      success: true;
      free: false;
      checkout: {
        publicOrderToken: string;
        keyId: string;
        razorpayOrderId: string;
        amount: number;
        currency: "INR";
        name: string;
        description: string;
        prefill: { name: string; email: string; contact: string };
      };
    }
  | {
      // A 100%-off coupon drives the total to ₹0, which Razorpay's order API
      // rejects (it requires a minimum payable amount). Free checkouts skip the
      // payment gateway entirely: the order is finalized as paid server-side and
      // the client is sent straight to the confirmation page.
      success: true;
      free: true;
      checkout: { publicOrderToken: string };
    };

type OrderStore = {
  findUnique(args: { where: { checkoutKey: string } }): Promise<Order | null>;
  create(args: { data: Record<string, unknown> }): Promise<Order>;
  update(args: {
    where: { id: string };
    data: {
      razorpayOrderId: string;
      status: "AWAITING_PAYMENT";
      paymentStatus: "AWAITING_PAYMENT";
    };
  }): Promise<Order>;
  updateMany(args: {
    where: { id: string; paymentStatus: "FAILED" | "ORDER_CREATING"; razorpayOrderId: null };
    data: { paymentStatus: "ORDER_CREATING" | "FAILED" };
  }): Promise<{ count: number }>;
};
type FreeCheckoutTransaction = {
  order: { create(args: { data: Record<string, unknown> }): Promise<Order> };
  couponRedemption: {
    createMany(args: { data: Record<string, unknown>[]; skipDuplicates: true }): Promise<{ count: number }>;
    findUnique(args: { where: { orderId: string }; select: { id: true } }): Promise<{ id: string } | null>;
  };
};
type FreeCheckoutDatabase = { $transaction<T>(operation: (transaction: FreeCheckoutTransaction) => Promise<T>): Promise<T> };

class CouponRaceError extends Error {}

type Dependencies = Readonly<{
  orders?: OrderStore;
  checkServiceability?: typeof checkDelhiveryPrepaidServiceability;
  createProviderOrder?: typeof createRazorpayOrder;
  findProviderOrder?: typeof findRazorpayOrderByReceipt;
  publicKey?: () => string;
  randomId?: () => string;
  randomToken?: () => string;
  randomCustomerReference?: () => string;
  validateCoupon?: typeof validateCouponEligibility;
  freeCheckoutDatabase?: FreeCheckoutDatabase;
  fulfil?: typeof fulfilPaidOrder;
  notify?: typeof sendOrderCompletionEmail;
  now?: () => Date;
  // Defers a task until after the response is sent, so a slow Delhivery/SMTP
  // call can't blow the checkout request past Vercel's function timeout.
  scheduleAfterResponse?: (task: () => Promise<void>) => void;
}>;

function receiptFor(orderId: string) {
  return `fa_${orderId.replaceAll("-", "")}`;
}

function materialMatches(order: Order, expected: Record<string, unknown>) {
  return Object.entries(expected).every(([key, value]) => order[key as keyof Order] === value);
}

function checkoutPayload(order: Order, keyId: string): CreateCheckoutResponse {
  if (!order.razorpayOrderId) throw new Error("Razorpay order is not persisted");
  return {
    success: true,
    free: false,
    checkout: {
      publicOrderToken: order.publicToken,
      keyId,
      razorpayOrderId: order.razorpayOrderId,
      amount: order.totalPaisa,
      currency: "INR",
      name: "FA ÀURELLE",
      description: order.productName,
      prefill: { name: order.customerName, email: order.customerEmail, contact: order.customerPhone },
    },
  };
}

async function createFreeCheckoutOrder(
  input: CreateCheckoutInput,
  snapshot: Record<string, unknown>,
  coupon: { code: string; singleUse?: boolean },
  dependencies: Dependencies,
): Promise<CreateCheckoutResponse> {
  const orders = dependencies.orders ?? (prisma.order as unknown as OrderStore);
  let order = await orders.findUnique({ where: { checkoutKey: input.checkoutKey } });
  if (order && !materialMatches(order, snapshot)) {
    return { success: false, kind: "conflict", message: "This checkout attempt belongs to different details. Please start a new checkout." };
  }

  if (!order) {
    const now = (dependencies.now ?? (() => new Date()))();
    const database = dependencies.freeCheckoutDatabase ?? (prisma as unknown as FreeCheckoutDatabase);
    try {
      order = await database.$transaction(async (tx) => {
        const createdOrder = await tx.order.create({
          data: {
            id: (dependencies.randomId ?? randomUUID)(),
            publicToken: (dependencies.randomToken ?? (() => randomBytes(32).toString("base64url")))(),
            customerReference: (dependencies.randomCustomerReference ?? createCustomerOrderReference)(),
            checkoutKey: input.checkoutKey,
            ...snapshot,
            status: "PAID",
            paymentStatus: "CAPTURED",
            fulfillmentStatus: "NOT_READY",
            paidAt: now,
          },
        });
        const redemptionIdentity = coupon.singleUse
          ? { normalizedEmail: SINGLE_USE_REDEMPTION_IDENTITY, normalizedPhone: SINGLE_USE_REDEMPTION_IDENTITY }
          : { normalizedEmail: String(snapshot.customerEmail), normalizedPhone: String(snapshot.customerPhone) };
        await tx.couponRedemption.createMany({
          data: [{ couponCode: coupon.code, ...redemptionIdentity, orderId: createdOrder.id, redeemedAt: now }],
          skipDuplicates: true,
        });
        const ownRedemption = await tx.couponRedemption.findUnique({ where: { orderId: createdOrder.id }, select: { id: true } });
        if (!ownRedemption) throw new CouponRaceError();
        return createdOrder;
      });
    } catch (error) {
      if (error instanceof CouponRaceError) {
        return { success: false, kind: "coupon_used", message: "Invalid coupon code. This coupon has already been used." };
      }
      const existing = await orders.findUnique({ where: { checkoutKey: input.checkoutKey } });
      if (!existing) {
        logCheckoutPreparationFailure("free_checkout_create", error);
        throw error;
      }
      if (!materialMatches(existing, snapshot)) return { success: false, kind: "conflict", message: "This checkout attempt belongs to different details. Please start a new checkout." };
      order = existing;
    }
  }

  const orderId = order.id;
  (dependencies.scheduleAfterResponse ?? after)(async () => {
    try { await (dependencies.fulfil ?? fulfilPaidOrder)(orderId); } catch { /* order-email/webhook paths can still retry fulfilment later */ }
    try { await (dependencies.notify ?? sendOrderCompletionEmail)(orderId); } catch { /* order-email has its own claim/retry lease */ }
  });

  return { success: true, free: true, checkout: { publicOrderToken: order.publicToken } };
}

export async function createPayableCheckout(input: CreateCheckoutInput, dependencies: Dependencies = {}): Promise<CreateCheckoutResponse> {
  if (!input || typeof input !== "object" || !CHECKOUT_KEY.test(input.checkoutKey) || input.quantity !== V1_QUANTITY) {
    return { success: false, kind: "validation", errors: {}, formError: "Invalid checkout request." };
  }
  const product = getAuthoritativeProduct(input.productCode);
  if (!product) return { success: false, kind: "validation", errors: {}, formError: "This product is not available for checkout." };
  const validation = validateCheckoutPayload(input.details);
  if (!validation.success) return { success: false, kind: "validation", errors: validation.errors };

  // Coupon validation and the Delhivery re-check are independent of each
  // other, so they run concurrently — kept sequential they'd stack their
  // worst-case latencies on top of Razorpay's call later in this same
  // request, risking Vercel's 10s function cap.
  const checkServiceability = dependencies.checkServiceability ?? checkDelhiveryPrepaidServiceability;
  const [couponOutcome, serviceabilityOutcome] = await Promise.all([
    input.couponCode
      ? (dependencies.validateCoupon ?? validateCouponEligibility)(input.couponCode, {
          email: validation.data.email,
          phone: validation.data.mobileNumber,
        })
      : Promise.resolve(null),
    checkServiceability(validation.data.pincode).then(
      (result) => ({ success: true as const, result }),
      (error) => ({ success: false as const, error }),
    ),
  ]);

  let coupon: { code: string; discountPercent: number; singleUse?: boolean } | null = null;
  if (couponOutcome) {
    if (!couponOutcome.success) {
      return couponOutcome.reason === "used"
        ? { success: false, kind: "coupon_used", message: "Invalid coupon code. This coupon has already been used." }
        : { success: false, kind: "coupon_invalid", message: "This coupon is invalid or has expired." };
    }
    coupon = couponOutcome.coupon;
  }

  if (!serviceabilityOutcome.success) {
    logCheckoutPreparationFailure("serviceability_recheck", serviceabilityOutcome.error);
    return { success: false, kind: "service_unavailable", message: "We couldn’t verify delivery availability right now. Please try again." };
  }
  const serviceability = serviceabilityOutcome.result;
  if (!serviceability.prepaidServiceable) {
    return { success: false, kind: "unserviceable", message: "Prepaid delivery is currently unavailable to this pincode." };
  }

  const pricing = calculateV1Pricing(product, coupon?.discountPercent ?? 0);
  const details = validation.data;
  const snapshot = {
    productCode: product.code, productName: product.name,
    ...pricing,
    couponCode: coupon?.code ?? null,
    customerName: details.fullName, customerEmail: details.email, customerPhone: details.mobileNumber,
    addressLine1: details.addressLine1, addressLine2: details.addressLine2,
    city: details.city, state: details.state, postalCode: details.pincode, countryCode: details.countryCode,
  };

  if (pricing.totalPaisa === 0) {
    if (!coupon) throw new Error("A zero-total checkout requires a coupon.");
    return createFreeCheckoutOrder(input, snapshot, coupon, dependencies);
  }

  const publicKey = dependencies.publicKey ?? getRazorpayPublicKey;
  let keyId: string;
  try { keyId = publicKey(); } catch (error) {
    logCheckoutPreparationFailure("razorpay_configuration", error);
    return { success: false, kind: "payment_unavailable", message: "Test payment is not configured." };
  }

  const orders = dependencies.orders ?? (prisma.order as unknown as OrderStore);
  let order = await orders.findUnique({ where: { checkoutKey: input.checkoutKey } });
  let ownsCreation = false;

  if (order && !materialMatches(order, snapshot)) {
    return { success: false, kind: "conflict", message: "This checkout attempt belongs to different details. Please start a new checkout." };
  }
  if (!order) {
    try {
      order = await orders.create({
        data: {
          id: (dependencies.randomId ?? randomUUID)(),
          publicToken: (dependencies.randomToken ?? (() => randomBytes(32).toString("base64url")))(),
          customerReference: (dependencies.randomCustomerReference ?? createCustomerOrderReference)(),
          checkoutKey: input.checkoutKey,
          ...snapshot,
          status: "CHECKOUT_CREATED",
          paymentStatus: "ORDER_CREATING",
          fulfillmentStatus: "NOT_READY",
        },
      });
      ownsCreation = true;
    } catch (error) {
      order = await orders.findUnique({ where: { checkoutKey: input.checkoutKey } });
      if (!order) {
        logCheckoutPreparationFailure("internal_order_create", error);
        throw error;
      }
      if (!materialMatches(order, snapshot)) return { success: false, kind: "conflict", message: "This checkout attempt belongs to different details. Please start a new checkout." };
    }
  }

  if (order.razorpayOrderId) return checkoutPayload(order, keyId);

  if (order.paymentStatus === "FAILED") {
    const claimed = await orders.updateMany({ where: { id: order.id, paymentStatus: "FAILED", razorpayOrderId: null }, data: { paymentStatus: "ORDER_CREATING" } });
    ownsCreation = claimed.count === 1;
  }

  const providerInput = { amount: order.totalPaisa, currency: "INR" as const, receipt: receiptFor(order.id) };
  let providerOrder: RazorpayOrder | null = null;
  if (!ownsCreation) {
    try { providerOrder = await (dependencies.findProviderOrder ?? findRazorpayOrderByReceipt)(providerInput); }
    catch (error) {
      logCheckoutPreparationFailure("razorpay_order_lookup", error, order.id);
      return { success: false, kind: "payment_pending", message: "Payment setup is still being reconciled. Please try again shortly." };
    }
    if (!providerOrder) return { success: false, kind: "payment_pending", message: "Payment setup is still being reconciled. Please try again shortly." };
  } else {
    try { providerOrder = await (dependencies.createProviderOrder ?? createRazorpayOrder)(providerInput); }
    catch (error) {
      logCheckoutPreparationFailure("razorpay_order_create", error, order.id);
      if (error instanceof RazorpayOrderError && ["authentication", "configuration", "definitive"].includes(error.kind)) {
        await orders.updateMany({ where: { id: order.id, paymentStatus: "ORDER_CREATING", razorpayOrderId: null }, data: { paymentStatus: "FAILED" } });
        return { success: false, kind: "payment_unavailable", message: "Test payment could not be prepared. Please try again." };
      }
      return { success: false, kind: "payment_pending", message: "Payment setup is being reconciled. Please try again shortly." };
    }
  }

  if (!providerOrder) {
    return { success: false, kind: "payment_pending", message: "Payment setup is still being reconciled. Please try again shortly." };
  }

  order = await orders.update({
    where: { id: order.id },
    data: { razorpayOrderId: providerOrder.id, paymentStatus: "AWAITING_PAYMENT", status: "AWAITING_PAYMENT" },
  });
  return checkoutPayload(order, keyId);
}

import "server-only";
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

const CHECKOUT_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateCheckoutInput = Readonly<{
  checkoutKey: string;
  productCode: string;
  quantity: 1;
  details: unknown;
}>;

export type CreateCheckoutResponse =
  | { success: false; kind: "validation"; errors: CheckoutFieldErrors; formError?: string }
  | { success: false; kind: "conflict" | "unserviceable" | "service_unavailable" | "payment_unavailable" | "payment_pending"; message: string }
  | {
      success: true;
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
type Dependencies = Readonly<{
  orders?: OrderStore;
  checkServiceability?: typeof checkDelhiveryPrepaidServiceability;
  createProviderOrder?: typeof createRazorpayOrder;
  findProviderOrder?: typeof findRazorpayOrderByReceipt;
  publicKey?: () => string;
  randomId?: () => string;
  randomToken?: () => string;
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

export async function createPayableCheckout(input: CreateCheckoutInput, dependencies: Dependencies = {}): Promise<CreateCheckoutResponse> {
  if (!input || typeof input !== "object" || !CHECKOUT_KEY.test(input.checkoutKey) || input.quantity !== V1_QUANTITY) {
    return { success: false, kind: "validation", errors: {}, formError: "Invalid checkout request." };
  }
  const product = getAuthoritativeProduct(input.productCode);
  if (!product) return { success: false, kind: "validation", errors: {}, formError: "This product is not available for checkout." };
  const validation = validateCheckoutPayload(input.details);
  if (!validation.success) return { success: false, kind: "validation", errors: validation.errors };

  const checkServiceability = dependencies.checkServiceability ?? checkDelhiveryPrepaidServiceability;
  let serviceability;
  try {
    serviceability = await checkServiceability(validation.data.pincode);
  } catch {
    return { success: false, kind: "service_unavailable", message: "We couldn’t verify delivery availability right now. Please try again." };
  }
  if (!serviceability.prepaidServiceable) {
    return { success: false, kind: "unserviceable", message: "Prepaid delivery is currently unavailable to this pincode." };
  }

  const publicKey = dependencies.publicKey ?? getRazorpayPublicKey;
  let keyId: string;
  try { keyId = publicKey(); } catch { return { success: false, kind: "payment_unavailable", message: "Test payment is not configured." }; }

  const pricing = calculateV1Pricing(product);
  const details = validation.data;
  const snapshot = {
    productCode: product.code, productName: product.name,
    ...pricing,
    customerName: details.fullName, customerEmail: details.email, customerPhone: details.mobileNumber,
    addressLine1: details.addressLine1, addressLine2: details.addressLine2,
    city: details.city, state: details.state, postalCode: details.pincode, countryCode: details.countryCode,
  };
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
      if (!order) throw error;
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
    catch { return { success: false, kind: "payment_pending", message: "Payment setup is still being reconciled. Please try again shortly." }; }
    if (!providerOrder) return { success: false, kind: "payment_pending", message: "Payment setup is still being reconciled. Please try again shortly." };
  } else {
    try { providerOrder = await (dependencies.createProviderOrder ?? createRazorpayOrder)(providerInput); }
    catch (error) {
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

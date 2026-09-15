import "server-only";

import { CUSTOMER_ORDER_REFERENCE_PATTERN } from "@/lib/commerce/tracking";
import { prisma } from "@/lib/server/db/prisma";

const PUBLIC_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

type ConfirmationRecord = Readonly<{
  customerReference: string;
  productName: string;
  unitAmountPaisa: number;
  quantity: number;
  subtotalPaisa: number;
  couponCode?: string | null;
  discountPaisa?: number;
  shippingPaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  currency: string;
  customerName: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  paidAt: Date | null;
  shipment: {
    status: string;
    delhiveryWaybill: string | null;
  } | null;
}>;

export type OrderConfirmation = Readonly<{
  displayReference: string;
  productName: string;
  unitAmountPaisa: number;
  quantity: number;
  subtotalPaisa: number;
  couponCode: string | null;
  discountPaisa: number;
  shippingPaisa: number;
  taxPaisa: number;
  totalPaisa: number;
  currency: "INR";
  customerName: string;
  destination: string;
  paidAt: string | null;
  fulfilment: "created" | "preparing" | "failed";
  waybill: string | null;
}>;

type Dependencies = Readonly<{
  findOrder?: (token: string) => Promise<ConfirmationRecord | null>;
}>;

function fulfilmentState(order: ConfirmationRecord): OrderConfirmation["fulfilment"] {
  if (
    order.fulfillmentStatus === "CREATED" &&
    order.shipment?.status === "CREATED" &&
    order.shipment.delhiveryWaybill
  ) {
    return "created";
  }
  if (order.fulfillmentStatus === "FAILED" || order.shipment?.status === "FAILED") {
    return "failed";
  }
  return "preparing";
}

function hasValidMoneySnapshot(order: ConfirmationRecord) {
  const discountPaisa = order.discountPaisa ?? 0;
  const couponCode = order.couponCode ?? null;
  const amounts = [
    order.unitAmountPaisa,
    order.subtotalPaisa,
    discountPaisa,
    order.shippingPaisa,
    order.taxPaisa,
    order.totalPaisa,
  ];
  return (
    order.currency === "INR" &&
    Number.isSafeInteger(order.quantity) &&
    order.quantity > 0 &&
    amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0) &&
    order.subtotalPaisa === order.unitAmountPaisa * order.quantity &&
    discountPaisa <= order.subtotalPaisa &&
    order.totalPaisa === order.subtotalPaisa - discountPaisa + order.shippingPaisa + order.taxPaisa &&
    ((couponCode === null && discountPaisa === 0) ||
      (typeof couponCode === "string" && discountPaisa > 0))
  );
}

async function findPersistedOrder(token: string): Promise<ConfirmationRecord | null> {
  return prisma.order.findUnique({
    where: { publicToken: token },
    select: {
      customerReference: true,
      productName: true,
      unitAmountPaisa: true,
      quantity: true,
      subtotalPaisa: true,
      couponCode: true,
      discountPaisa: true,
      shippingPaisa: true,
      taxPaisa: true,
      totalPaisa: true,
      currency: true,
      customerName: true,
      city: true,
      state: true,
      postalCode: true,
      countryCode: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      paidAt: true,
      shipment: {
        select: {
          status: true,
          delhiveryWaybill: true,
        },
      },
    },
  });
}

export async function getOrderConfirmation(
  publicToken: string,
  dependencies: Dependencies = {},
): Promise<OrderConfirmation | null> {
  if (!PUBLIC_TOKEN.test(publicToken)) return null;

  const order = await (dependencies.findOrder ?? findPersistedOrder)(publicToken);
  if (
    !order ||
    order.status !== "PAID" ||
    order.paymentStatus !== "CAPTURED" ||
    !CUSTOMER_ORDER_REFERENCE_PATTERN.test(order.customerReference) ||
    !hasValidMoneySnapshot(order)
  ) return null;

  const destinationCountry = order.countryCode === "IN" ? "India" : order.countryCode;
  return {
    displayReference: order.customerReference,
    productName: order.productName,
    unitAmountPaisa: order.unitAmountPaisa,
    quantity: order.quantity,
    subtotalPaisa: order.subtotalPaisa,
    couponCode: order.couponCode ?? null,
    discountPaisa: order.discountPaisa ?? 0,
    shippingPaisa: order.shippingPaisa,
    taxPaisa: order.taxPaisa,
    totalPaisa: order.totalPaisa,
    currency: "INR",
    customerName: order.customerName,
    destination: `${order.city}, ${order.state} ${order.postalCode}, ${destinationCountry}`,
    paidAt: order.paidAt?.toISOString() ?? null,
    fulfilment: fulfilmentState(order),
    waybill: order.shipment?.delhiveryWaybill ?? null,
  };
}

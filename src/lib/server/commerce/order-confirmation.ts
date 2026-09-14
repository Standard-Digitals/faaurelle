import "server-only";

import { prisma } from "@/lib/server/db/prisma";

const PUBLIC_TOKEN = /^[A-Za-z0-9_-]{32,128}$/;

type ConfirmationRecord = Readonly<{
  publicToken: string;
  productName: string;
  unitAmountPaisa: number;
  quantity: number;
  subtotalPaisa: number;
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

function displayReference(publicToken: string) {
  return `FA-${publicToken.slice(0, 12).toUpperCase()}`;
}

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
  const amounts = [
    order.unitAmountPaisa,
    order.subtotalPaisa,
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
    order.totalPaisa === order.subtotalPaisa + order.shippingPaisa + order.taxPaisa
  );
}

async function findPersistedOrder(token: string): Promise<ConfirmationRecord | null> {
  return prisma.order.findUnique({
    where: { publicToken: token },
    select: {
      publicToken: true,
      productName: true,
      unitAmountPaisa: true,
      quantity: true,
      subtotalPaisa: true,
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
    !hasValidMoneySnapshot(order)
  ) return null;

  const destinationCountry = order.countryCode === "IN" ? "India" : order.countryCode;
  return {
    displayReference: displayReference(order.publicToken),
    productName: order.productName,
    unitAmountPaisa: order.unitAmountPaisa,
    quantity: order.quantity,
    subtotalPaisa: order.subtotalPaisa,
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

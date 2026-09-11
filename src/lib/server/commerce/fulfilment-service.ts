import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/server/db/prisma";
import {
  createDelhiveryShipment,
  findDelhiveryShipmentByReference,
  DelhiveryShipmentError,
  type DelhiveryShipmentInput,
} from "@/lib/server/delhivery/shipment";
import { shipmentConfig } from "./shipment-config";

type OrderSnapshot = Readonly<{
  id: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  productCode: string;
  productName: string;
  quantity: number;
  totalPaisa: number;
  currency: string;
  customerName: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
}>;

type ShipmentRecord = Readonly<{
  orderId: string;
  status: string;
  paymentMode: string;
  delhiveryWaybill: string | null;
  delhiveryOrderReference: string;
}>;

type Store = Readonly<{
  order: {
    findUnique(args: { where: { id: string } }): Promise<OrderSnapshot | null>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
  shipment: {
    findUnique(args: { where: { orderId: string } }): Promise<ShipmentRecord | null>;
    create(args: { data: Record<string, unknown> }): Promise<ShipmentRecord>;
    updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  };
}>;

export type FulfilmentResult =
  | Readonly<{ status: "created"; waybill: string; reused: boolean }>
  | Readonly<{ status: "pending"; retryable: true }>
  | Readonly<{ status: "failed"; retryable: false }>
  | Readonly<{ status: "ineligible"; retryable: false }>;

type Dependencies = Readonly<{
  store?: Store;
  createShipment?: typeof createDelhiveryShipment;
  findByReference?: typeof findDelhiveryShipmentByReference;
  now?: () => Date;
}>;

function logFulfilment(orderId: string, stage: string, error: unknown) {
  const diagnosticId = randomUUID();
  if (error instanceof DelhiveryShipmentError) {
    console.error("[commerce:delhivery-fulfilment]", {
      diagnosticId,
      orderId,
      stage,
      kind: error.kind,
      ambiguous: error.ambiguous,
      ...error.diagnostic,
    });
    return;
  }
  console.error("[commerce:delhivery-fulfilment]", {
    diagnosticId,
    orderId,
    stage,
    kind: "unexpected",
    causeName: error instanceof Error ? error.name : typeof error,
  });
}

function referenceFor(orderId: string) {
  return `fa_${orderId.replaceAll("-", "")}`;
}

function rupeesFromPaise(amountPaisa: number) {
  return (amountPaisa / 100).toFixed(2);
}

function providerInput(order: OrderSnapshot, reference: string): DelhiveryShipmentInput {
  return {
    reference,
    recipient: {
      name: order.customerName,
      phone: order.customerPhone,
      address: [order.addressLine1, order.addressLine2].filter(Boolean).join(", "),
      city: order.city,
      state: order.state,
      pincode: order.postalCode,
      country: order.countryCode === "IN" ? "India" : order.countryCode,
    },
    product: {
      description: `${order.productName} (${order.productCode})`,
      sku: order.productCode,
      hsnCode: shipmentConfig.hsnCode,
      quantity: order.quantity,
      totalAmountRupees: rupeesFromPaise(order.totalPaisa),
    },
    package: {
      weightGrams: shipmentConfig.weightGrams,
      widthCm: shipmentConfig.dimensionsCm.width,
      lengthCm: shipmentConfig.dimensionsCm.length,
      heightCm: shipmentConfig.dimensionsCm.height,
    },
    seller: {
      name: shipmentConfig.pickupName,
      address: shipmentConfig.pickupAddress,
      gstin: shipmentConfig.sellerGstin,
    },
    pickup: {
      name: shipmentConfig.pickupName,
      address: shipmentConfig.pickupAddress,
      city: shipmentConfig.pickupCity,
      pincode: shipmentConfig.pickupPincode,
      country: shipmentConfig.pickupCountry,
    },
  };
}

async function persistCreated(
  orderId: string,
  reference: string,
  waybill: string,
  now: Date,
  store: Store,
  reused: boolean,
): Promise<FulfilmentResult> {
  const written = await store.shipment.updateMany({
    where: { orderId, delhiveryOrderReference: reference, delhiveryWaybill: null, status: "CREATING" },
    data: { status: "CREATED", delhiveryWaybill: waybill, manifestedAt: now },
  });
  if (written.count !== 1) {
    const current = await store.shipment.findUnique({ where: { orderId } });
    if (!current?.delhiveryWaybill) return { status: "pending", retryable: true };
    waybill = current.delhiveryWaybill;
    reused = true;
  }
  await store.order.updateMany({
    where: { id: orderId, status: "PAID", paymentStatus: "CAPTURED", fulfillmentStatus: { in: ["PENDING", "CREATING", "FAILED"] } },
    data: { fulfillmentStatus: "CREATED" },
  });
  return { status: "created", waybill, reused };
}

export async function fulfilPaidOrder(orderId: string, dependencies: Dependencies = {}): Promise<FulfilmentResult> {
  const store = dependencies.store ?? prisma as unknown as Store;
  const order = await store.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PAID" || order.paymentStatus !== "CAPTURED") {
    return { status: "ineligible", retryable: false };
  }

  const reference = referenceFor(order.id);
  let shipment = await store.shipment.findUnique({ where: { orderId: order.id } });
  if (shipment?.delhiveryWaybill) {
    await store.order.updateMany({
      where: { id: order.id, status: "PAID", paymentStatus: "CAPTURED", fulfillmentStatus: { not: "CREATED" } },
      data: { fulfillmentStatus: "CREATED" },
    });
    return { status: "created", waybill: shipment.delhiveryWaybill, reused: true };
  }

  if (shipment?.status === "CREATING") {
    try {
      const recovered = await (dependencies.findByReference ?? findDelhiveryShipmentByReference)(reference);
      if (!recovered) return { status: "pending", retryable: true };
      return persistCreated(order.id, reference, recovered.waybill, (dependencies.now ?? (() => new Date()))(), store, true);
    } catch (error) {
      logFulfilment(order.id, "reference_lookup", error);
      return { status: "pending", retryable: true };
    }
  }

  let owner = false;
  if (!shipment) {
    try {
      shipment = await store.shipment.create({
        data: {
          orderId: order.id,
          status: "CREATING",
          paymentMode: "PREPAID",
          delhiveryOrderReference: reference,
        },
      });
      owner = true;
    } catch (error) {
      shipment = await store.shipment.findUnique({ where: { orderId: order.id } });
      if (!shipment) throw error;
    }
  } else if (shipment.status === "PENDING" || shipment.status === "FAILED") {
    const claimed = await store.shipment.updateMany({
      where: { orderId: order.id, status: shipment.status, delhiveryWaybill: null },
      data: { status: "CREATING" },
    });
    owner = claimed.count === 1;
  }

  if (!owner) return { status: "pending", retryable: true };
  await store.order.updateMany({
    where: { id: order.id, status: "PAID", paymentStatus: "CAPTURED", fulfillmentStatus: { in: ["NOT_READY", "PENDING", "FAILED"] } },
    data: { fulfillmentStatus: "CREATING" },
  });

  let created: { waybill: string };
  try {
    created = await (dependencies.createShipment ?? createDelhiveryShipment)(providerInput(order, reference));
  } catch (error) {
    logFulfilment(order.id, "shipment_create", error);
    if (error instanceof DelhiveryShipmentError && error.ambiguous) {
      return { status: "pending", retryable: true };
    }
    await store.shipment.updateMany({
      where: { orderId: order.id, status: "CREATING", delhiveryWaybill: null },
      data: { status: "FAILED" },
    });
    await store.order.updateMany({
      where: { id: order.id, status: "PAID", paymentStatus: "CAPTURED", fulfillmentStatus: "CREATING" },
      data: { fulfillmentStatus: "FAILED" },
    });
    return { status: "failed", retryable: false };
  }
  return persistCreated(order.id, reference, created.waybill, (dependencies.now ?? (() => new Date()))(), store, false);
}

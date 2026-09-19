import "server-only";

import type { CustomerTrackingResult, TrackingReferenceKind } from "@/lib/commerce/tracking";
import { prisma } from "@/lib/server/db/prisma";
import { DelhiveryTrackingError, trackDelhiveryWaybill } from "@/lib/server/delhivery/tracking";

type TrackingOrderRecord = Readonly<{
  customerReference: string;
  status: string;
  paymentStatus: string;
  shipment: Readonly<{
    delhiveryWaybill: string | null;
  }> | null;
}>;

export type ResolvedOrderTracking =
  | Readonly<{ state: "tracking"; tracking: CustomerTrackingResult; orderReference: string }>
  | Readonly<{ state: "preparing"; orderReference: string }>
  | Readonly<{ state: "tracking_pending"; orderReference: string }>
  | Readonly<{ state: "not_found" }>;

type Dependencies = Readonly<{
  findOrder?: (reference: string, kind: TrackingReferenceKind) => Promise<TrackingOrderRecord | null>;
  trackWaybill?: typeof trackDelhiveryWaybill;
}>;

async function findPersistedOrder(reference: string, kind: TrackingReferenceKind): Promise<TrackingOrderRecord | null> {
  const insensitiveReference = { equals: reference, mode: "insensitive" as const };
  return prisma.order.findFirst({
    where: kind === "internal"
      ? { customerReference: insensitiveReference }
      : kind === "delhivery_order"
        ? { shipment: { is: { delhiveryOrderReference: insensitiveReference } } }
        : kind === "delhivery_waybill"
          ? { shipment: { is: { delhiveryWaybill: reference } } }
        : kind === "razorpay_order"
          ? { razorpayOrderId: insensitiveReference }
          : { payments: { some: { razorpayPaymentId: insensitiveReference } } },
    select: {
      customerReference: true,
      status: true,
      paymentStatus: true,
      shipment: { select: { delhiveryWaybill: true } },
    },
  });
}

export async function resolveOrderTracking(
  reference: string,
  kind: TrackingReferenceKind,
  dependencies: Dependencies = {},
): Promise<ResolvedOrderTracking> {
  const trackWaybill = dependencies.trackWaybill ?? trackDelhiveryWaybill;
  const order = await (dependencies.findOrder ?? findPersistedOrder)(reference, kind);
  if (!order || order.status !== "PAID" || order.paymentStatus !== "CAPTURED") {
    return { state: "not_found" };
  }
  if (!order.shipment?.delhiveryWaybill) {
    return { state: "preparing", orderReference: order.customerReference };
  }
  try {
    const providerTracking = await trackWaybill(order.shipment.delhiveryWaybill);
    const tracking: CustomerTrackingResult = {
      currentStatus: providerTracking.currentStatus,
      ...(providerTracking.origin ? { origin: providerTracking.origin } : {}),
      ...(providerTracking.destination ? { destination: providerTracking.destination } : {}),
      ...(providerTracking.pickupTimestamp ? { pickupTimestamp: providerTracking.pickupTimestamp } : {}),
      scans: providerTracking.scans,
    };
    return {
      state: "tracking",
      orderReference: order.customerReference,
      tracking,
    };
  } catch (error) {
    if (error instanceof DelhiveryTrackingError && error.kind === "not_found") {
      return { state: "tracking_pending", orderReference: order.customerReference };
    }
    throw error;
  }
}

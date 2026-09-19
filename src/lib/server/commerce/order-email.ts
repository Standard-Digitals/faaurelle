import "server-only";

import nodemailer from "nodemailer";
import { formatInr } from "@/lib/commerce/money";
import { prisma } from "@/lib/server/db/prisma";

const CLAIM_LEASE_MS = 5 * 60 * 1000;
const DEPLOYED_BRAND_ASSET_ORIGIN = "https://www.faaurelle.com";

type EmailOrder = Readonly<{
  id: string;
  customerReference: string;
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
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  paidAt: Date | null;
  confirmationEmailSentAt?: Date | null;
  ownerOrderEmailSentAt?: Date | null;
  shipment: { status: string; delhiveryWaybill: string | null } | null;
}>;

type OrderEmailStore = {
  updateMany(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<{ count: number }>;
  findUnique(args: { where: { id: string }; select: Record<string, unknown> }): Promise<EmailOrder | null>;
};

type MailTransport = {
  sendMail(message: Record<string, unknown>): Promise<unknown>;
};

type OrderEmailEnvironment = Readonly<{
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURE?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  SUBSCRIPTION_TO_EMAIL?: string;
  SITE_URL?: string;
}>;

type Dependencies = Readonly<{
  orders?: OrderEmailStore;
  transport?: MailTransport;
  now?: () => Date;
  environment?: OrderEmailEnvironment;
}>;

export type OrderEmailResult =
  | Readonly<{ status: "sent" }>
  | Readonly<{ status: "already-sent" | "in-progress" | "ineligible" }>
  | Readonly<{ status: "failed" }>;

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character,
  );
}

function configuration(environment: OrderEmailEnvironment) {
  const host = environment.SMTP_HOST?.trim();
  const port = Number(environment.SMTP_PORT ?? "587");
  const user = environment.SMTP_USER?.trim();
  const pass = environment.SMTP_PASS?.trim();
  const from = (environment.SMTP_FROM ?? user)?.trim();
  const owner = environment.SUBSCRIPTION_TO_EMAIL?.trim() || from;
  const siteUrl = environment.SITE_URL?.trim().replace(/\/$/, "");
  if (!host || !Number.isInteger(port) || !user || !pass || !from || !owner || !siteUrl) {
    throw new Error("Order email configuration is incomplete.");
  }
  const parsedSiteUrl = new URL(siteUrl);
  if (parsedSiteUrl.protocol !== "https:" && parsedSiteUrl.hostname !== "localhost") {
    throw new Error("SITE_URL must use HTTPS outside local development.");
  }
  return {
    from,
    owner,
    siteUrl: parsedSiteUrl.toString().replace(/\/$/, ""),
    transport: {
      host,
      port,
      secure: environment.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
      requireTLS: port !== 465,
    },
  };
}

function runtimeEnvironment(): OrderEmailEnvironment {
  return {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
    SUBSCRIPTION_TO_EMAIL: process.env.SUBSCRIPTION_TO_EMAIL,
    SITE_URL: process.env.SITE_URL,
  };
}

function displayDate(value: Date | null) {
  if (!value) return "Confirmed";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(value);
}

function shippingAddress(order: EmailOrder) {
  return [
    order.addressLine1,
    order.addressLine2,
    `${order.city}, ${order.state} ${order.postalCode}`,
    order.countryCode === "IN" ? "India" : order.countryCode,
  ].filter(Boolean).join(", ");
}

function row(label: string, value: string) {
  return `<tr><td style="padding:9px 0;color:#6a6259;vertical-align:top">${escapeHtml(label)}</td><td style="padding:9px 0;color:#17130f;text-align:right;vertical-align:top"><strong>${escapeHtml(value)}</strong></td></tr>`;
}

export function buildOrderEmail(order: EmailOrder, siteUrl: string) {
  const trackUrl = new URL("/track-order/", siteUrl);
  trackUrl.searchParams.set("reference", order.customerReference);
  const logoUrl = new URL("/images/brand/fa-aurelle-wordmark.svg", DEPLOYED_BRAND_ASSET_ORIGIN).toString();
  const address = shippingAddress(order);
  const shipmentCreated = order.fulfillmentStatus === "CREATED" && order.shipment?.status === "CREATED" && Boolean(order.shipment.delhiveryWaybill);
  const shipmentMessage = shipmentCreated
    ? "Your prepaid shipment has been created and is ready for carrier pickup."
    : "Your payment is confirmed. Shipment preparation is still in progress, and tracking will update when it is ready.";
  const discountRows = order.discountPaisa > 0
    ? `${row("Coupon", order.couponCode ?? "Applied")}${row("Discount", `−${formatInr(order.discountPaisa)}`)}`
    : "";
  const waybillRow = order.shipment?.delhiveryWaybill
    ? row("Waybill", order.shipment.delhiveryWaybill)
    : "";

  const subject = `Order confirmed — ${order.customerReference}`;
  const text = [
    `Hello ${order.customerName},`,
    "",
    "Your FA ÀURELLE payment is confirmed.",
    shipmentMessage,
    "",
    `Order reference: ${order.customerReference}`,
    `Payment status: Captured`,
    `Paid at: ${displayDate(order.paidAt)}`,
    ...(order.shipment?.delhiveryWaybill ? [`Waybill: ${order.shipment.delhiveryWaybill}`] : []),
    "",
    `${order.productName} × ${order.quantity}`,
    `Unit price: ${formatInr(order.unitAmountPaisa)}`,
    `Subtotal: ${formatInr(order.subtotalPaisa)}`,
    ...(order.couponCode ? [`Coupon: ${order.couponCode}`] : []),
    ...(order.discountPaisa > 0 ? [`Discount: -${formatInr(order.discountPaisa)}`] : []),
    `Shipping: ${order.shippingPaisa === 0 ? "Free" : formatInr(order.shippingPaisa)}`,
    `Additional checkout tax: ${formatInr(order.taxPaisa)}`,
    `Total paid: ${formatInr(order.totalPaisa)}`,
    "",
    `Customer: ${order.customerName}`,
    `Email: ${order.customerEmail}`,
    `Phone: ${order.customerPhone}`,
    `Shipping address: ${address}`,
    "",
    `Track order: ${trackUrl.toString()}`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f7f3ec;color:#17130f;font-family:Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">Payment confirmed for ${escapeHtml(order.customerReference)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e4ddd3">
      <tr><td style="padding:30px 34px;border-bottom:1px solid #e4ddd3;text-align:center">
        <img src="${escapeHtml(logoUrl)}" width="190" alt="FA ÀURELLE" style="display:inline-block;max-width:190px;height:auto;border:0">
      </td></tr>
      <tr><td style="padding:36px 34px 20px">
        <p style="margin:0 0 10px;color:#8d621f;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Order confirmed</p>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:34px;font-weight:400;line-height:1.15">Thank you, ${escapeHtml(order.customerName)}.</h1>
        <p style="margin:18px 0 0;color:#5e554c;font-size:16px;line-height:1.65">Your payment is securely confirmed. ${escapeHtml(shipmentMessage)}</p>
      </td></tr>
      <tr><td style="padding:12px 34px 26px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4ddd3;border-bottom:1px solid #e4ddd3">
          ${row("Order reference", order.customerReference)}
          ${row("Payment", "Captured")}
          ${row("Paid at", displayDate(order.paidAt))}
          ${waybillRow}
        </table>
      </td></tr>
      <tr><td style="padding:4px 34px 26px">
        <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;font-weight:400">Your order</h2>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.5"><strong>${escapeHtml(order.productName)}</strong><br><span style="color:#6a6259">Quantity ${order.quantity}</span></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Unit price", formatInr(order.unitAmountPaisa))}
          ${row("Subtotal", formatInr(order.subtotalPaisa))}
          ${discountRows}
          ${row("Shipping", order.shippingPaisa === 0 ? "Free" : formatInr(order.shippingPaisa))}
          ${row("Additional checkout tax", formatInr(order.taxPaisa))}
          ${row("Total paid", formatInr(order.totalPaisa))}
        </table>
      </td></tr>
      <tr><td style="padding:24px 34px;background:#fcfaf6;border-top:1px solid #e4ddd3">
        <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;font-weight:400">Delivery details</h2>
        <p style="margin:0;color:#5e554c;font-size:15px;line-height:1.7"><strong style="color:#17130f">${escapeHtml(order.customerName)}</strong><br>${escapeHtml(order.customerEmail)}<br>${escapeHtml(order.customerPhone)}<br>${escapeHtml(address)}</p>
      </td></tr>
      <tr><td align="center" style="padding:30px 34px 38px">
        <a href="${escapeHtml(trackUrl.toString())}" style="display:inline-block;padding:15px 25px;background:#17130f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700">Track your order</a>
        <p style="margin:18px 0 0;color:#756c63;font-size:13px;line-height:1.5">Keep your FA order reference private. It is used to retrieve shipment updates.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject, text, html, trackUrl: trackUrl.toString() };
}

export function buildOwnerOrderEmail(order: EmailOrder, siteUrl: string) {
  const trackUrl = new URL("/track-order/", siteUrl);
  trackUrl.searchParams.set("reference", order.customerReference);
  const logoUrl = new URL("/images/brand/fa-aurelle-wordmark.svg", DEPLOYED_BRAND_ASSET_ORIGIN).toString();
  const address = shippingAddress(order);
  const fulfilment = order.shipment?.delhiveryWaybill
    ? `Shipment created · ${order.shipment.delhiveryWaybill}`
    : "Shipment preparation pending";
  const discountRows = order.discountPaisa > 0
    ? `${row("Coupon", order.couponCode ?? "Applied")}${row("Discount", `−${formatInr(order.discountPaisa)}`)}`
    : "";
  const subject = `New order received — ${order.customerReference}`;
  const text = [
    "New order received",
    "",
    `${order.customerName} has completed a paid order.`,
    "",
    `Order reference: ${order.customerReference}`,
    `Payment: Captured` ,
    `Paid at: ${displayDate(order.paidAt)}`,
    `Fulfilment: ${fulfilment}`,
    "",
    "Customer details",
    `Name: ${order.customerName}`,
    `Email: ${order.customerEmail}`,
    `Phone: ${order.customerPhone}`,
    `Shipping address: ${address}`,
    "",
    "Order details",
    `${order.productName} × ${order.quantity}`,
    `Unit price: ${formatInr(order.unitAmountPaisa)}`,
    `Subtotal: ${formatInr(order.subtotalPaisa)}`,
    ...(order.couponCode ? [`Coupon: ${order.couponCode}`] : []),
    ...(order.discountPaisa > 0 ? [`Discount: -${formatInr(order.discountPaisa)}`] : []),
    `Shipping: ${order.shippingPaisa === 0 ? "Free" : formatInr(order.shippingPaisa)}`,
    `Additional checkout tax: ${formatInr(order.taxPaisa)}`,
    `Total paid: ${formatInr(order.totalPaisa)}`,
    "",
    `View tracking: ${trackUrl.toString()}`,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;background:#f7f3ec;color:#17130f;font-family:Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">New paid order from ${escapeHtml(order.customerName)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border:1px solid #e4ddd3">
      <tr><td style="padding:28px 34px;border-bottom:1px solid #e4ddd3;text-align:center">
        <img src="${escapeHtml(logoUrl)}" width="190" alt="FA ÀURELLE" style="display:inline-block;max-width:190px;height:auto;border:0">
      </td></tr>
      <tr><td style="padding:34px">
        <p style="margin:0 0 10px;color:#8d621f;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">New order received</p>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;font-weight:400;line-height:1.2">${escapeHtml(order.customerName)} placed an order.</h1>
        <p style="margin:16px 0 0;color:#5e554c;font-size:16px;line-height:1.6">Payment has been captured. Review the customer and delivery information below to prepare the order.</p>
      </td></tr>
      <tr><td style="padding:0 34px 28px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4ddd3;border-bottom:1px solid #e4ddd3">
          ${row("Order reference", order.customerReference)}
          ${row("Payment", "Captured")}
          ${row("Paid at", displayDate(order.paidAt))}
          ${row("Fulfilment", fulfilment)}
        </table>
      </td></tr>
      <tr><td style="padding:0 34px 28px">
        <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;font-weight:400">Customer and delivery</h2>
        <p style="margin:0;color:#5e554c;font-size:15px;line-height:1.75"><strong style="color:#17130f">${escapeHtml(order.customerName)}</strong><br>${escapeHtml(order.customerEmail)}<br>${escapeHtml(order.customerPhone)}<br>${escapeHtml(address)}</p>
      </td></tr>
      <tr><td style="padding:24px 34px;background:#fcfaf6;border-top:1px solid #e4ddd3">
        <h2 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;font-weight:400">Order to prepare</h2>
        <p style="margin:0 0 14px;font-size:16px;line-height:1.5"><strong>${escapeHtml(order.productName)}</strong><br><span style="color:#6a6259">Quantity ${order.quantity}</span></p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row("Unit price", formatInr(order.unitAmountPaisa))}
          ${row("Subtotal", formatInr(order.subtotalPaisa))}
          ${discountRows}
          ${row("Shipping", order.shippingPaisa === 0 ? "Free" : formatInr(order.shippingPaisa))}
          ${row("Additional checkout tax", formatInr(order.taxPaisa))}
          ${row("Total paid", formatInr(order.totalPaisa))}
        </table>
      </td></tr>
      <tr><td align="center" style="padding:30px 34px 38px">
        <a href="${escapeHtml(trackUrl.toString())}" style="display:inline-block;padding:15px 25px;background:#17130f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700">View shipment tracking</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject, text, html, trackUrl: trackUrl.toString() };
}

export async function sendOrderCompletionEmail(
  orderId: string,
  dependencies: Dependencies = {},
): Promise<OrderEmailResult> {
  const orders = dependencies.orders ?? (prisma.order as unknown as OrderEmailStore);
  const now = (dependencies.now ?? (() => new Date()))();
  const claimed = await orders.updateMany({
    where: {
      id: orderId,
      status: "PAID",
      paymentStatus: "CAPTURED",
      OR: [
        { confirmationEmailSentAt: null },
        { ownerOrderEmailSentAt: null },
      ],
      AND: [
        {
          OR: [
            { confirmationEmailClaimedAt: null },
            { confirmationEmailClaimedAt: { lt: new Date(now.getTime() - CLAIM_LEASE_MS) } },
          ],
        },
      ],
    },
    data: { confirmationEmailClaimedAt: now, confirmationEmailLastError: null },
  });
  if (claimed.count !== 1) {
    const existing = await orders.findUnique({
      where: { id: orderId },
      select: { confirmationEmailSentAt: true, ownerOrderEmailSentAt: true },
    });
    return existing?.confirmationEmailSentAt && existing.ownerOrderEmailSentAt
      ? { status: "already-sent" }
      : { status: "in-progress" };
  }

  try {
    const environment = dependencies.environment ?? runtimeEnvironment();
    const config = configuration(environment);
    const order = await orders.findUnique({
      where: { id: orderId },
      select: {
        id: true, customerReference: true, productName: true, unitAmountPaisa: true,
        quantity: true, subtotalPaisa: true, couponCode: true, discountPaisa: true,
        shippingPaisa: true, taxPaisa: true, totalPaisa: true, currency: true,
        customerName: true, customerEmail: true, customerPhone: true,
        addressLine1: true, addressLine2: true, city: true, state: true,
        postalCode: true, countryCode: true, status: true, paymentStatus: true,
        fulfillmentStatus: true, paidAt: true,
        confirmationEmailSentAt: true, ownerOrderEmailSentAt: true,
        shipment: { select: { status: true, delhiveryWaybill: true } },
      },
    });
    if (!order || order.status !== "PAID" || order.paymentStatus !== "CAPTURED") {
      await orders.updateMany({
        where: { id: orderId, confirmationEmailClaimedAt: now, confirmationEmailSentAt: null },
        data: { confirmationEmailClaimedAt: null },
      });
      return { status: "ineligible" };
    }
    const transport = dependencies.transport ?? nodemailer.createTransport(config.transport);
    if (!order.confirmationEmailSentAt) {
      const customerMessage = buildOrderEmail(order, config.siteUrl);
      await transport.sendMail({
        from: `FA ÀURELLE <${config.from}>`,
        to: order.customerEmail,
        replyTo: config.owner,
        subject: customerMessage.subject,
        text: customerMessage.text,
        html: customerMessage.html,
      });
      await orders.updateMany({
        where: { id: orderId, confirmationEmailClaimedAt: now, confirmationEmailSentAt: null },
        data: { confirmationEmailSentAt: now },
      });
    }
    if (!order.ownerOrderEmailSentAt && config.owner.toLowerCase() !== order.customerEmail.toLowerCase()) {
      const ownerMessage = buildOwnerOrderEmail(order, config.siteUrl);
      await transport.sendMail({
        from: `FA ÀURELLE <${config.from}>`,
        to: config.owner,
        subject: ownerMessage.subject,
        text: ownerMessage.text,
        html: ownerMessage.html,
      });
      await orders.updateMany({
        where: { id: orderId, confirmationEmailClaimedAt: now, ownerOrderEmailSentAt: null },
        data: { ownerOrderEmailSentAt: now },
      });
    } else if (!order.ownerOrderEmailSentAt) {
      await orders.updateMany({
        where: { id: orderId, confirmationEmailClaimedAt: now, ownerOrderEmailSentAt: null },
        data: { ownerOrderEmailSentAt: now },
      });
    }
    await orders.updateMany({
      where: { id: orderId, confirmationEmailClaimedAt: now },
      data: { confirmationEmailClaimedAt: null, confirmationEmailLastError: null },
    });
    return { status: "sent" };
  } catch (error) {
    console.error("[commerce:order-email]", {
      orderId,
      outcome: "failed",
      causeName: error instanceof Error ? error.name : typeof error,
    });
    await orders.updateMany({
      where: { id: orderId, confirmationEmailClaimedAt: now, confirmationEmailSentAt: null },
      data: { confirmationEmailClaimedAt: null, confirmationEmailLastError: "Order email delivery failed" },
    });
    return { status: "failed" };
  }
}

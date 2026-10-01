import "server-only";
import nodemailer from "nodemailer";
import { formatInr } from "@/lib/commerce/money";
import {
  checkoutAttemptsCsv,
  checkoutOutcomeLabels,
  claimCheckoutAttemptAlert,
  describeCheckoutOutcome,
  findPurchasingCustomers,
  formatIstDateTime,
  hasPurchased,
  istDay,
  listCheckoutAttempts,
  markCheckoutAttemptsDigested,
  releaseCheckoutAttemptAlert,
  startOfIstDay,
  type CheckoutAttemptRecord,
  type CheckoutOutcome,
} from "./checkout-attempts";
import { escapeHtml, loadMailConfiguration } from "./order-email";
import { getAuthoritativeProduct } from "./products";

const deliveryLabels = {
  SERVICEABLE: "Available",
  NOT_SERVICEABLE: "Not available to this pincode",
  CHECK_FAILED: "Could not be checked (courier unavailable)",
} as const;

function address(attempt: CheckoutAttemptRecord) {
  return [attempt.addressLine1, attempt.addressLine2, `${attempt.city}, ${attempt.state} ${attempt.postalCode}`]
    .filter(Boolean)
    .join(", ");
}

function row(label: string, value: string) {
  return `<tr><td style="padding:8px 0;color:#6a6259;vertical-align:top;width:38%">${escapeHtml(label)}</td><td style="padding:8px 0;color:#17130f;vertical-align:top"><strong>${escapeHtml(value)}</strong></td></tr>`;
}

function layout(eyebrow: string, title: string, body: string) {
  return `<!doctype html>
<html><body style="margin:0;background:#f7f3ec;color:#17130f;font-family:Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f3ec"><tr><td align="center" style="padding:32px 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;background:#ffffff;border:1px solid #e4ddd3">
      <tr><td style="padding:30px 32px 8px">
        <p style="margin:0 0 10px;color:#8d621f;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">${escapeHtml(eyebrow)}</p>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:28px;font-weight:400;line-height:1.25">${escapeHtml(title)}</h1>
      </td></tr>
      ${body}
    </table>
  </td></tr></table>
</body></html>`;
}

export function buildCheckoutAttemptAlert(attempt: CheckoutAttemptRecord) {
  const product = getAuthoritativeProduct(attempt.productCode);
  const productLine = product ? `${product.name} · ${formatInr(product.unitAmountPaisa)}` : attempt.productCode;
  const subject = `Checkout started — ${attempt.customerName}, ${attempt.city}`;
  const details: [string, string][] = [
    ["Name", attempt.customerName],
    ["Mobile", attempt.customerPhone],
    ["Email", attempt.customerEmail],
    ["Address", address(attempt)],
    ["Delivery", deliveryLabels[attempt.deliveryCheck]],
    ["Product", productLine],
    ["Time", formatIstDateTime(attempt.firstSeenAt)],
  ];
  const note = "They have not paid yet. If they complete the payment you will get a separate “New order received” email.";
  const text = [
    "A customer started checkout",
    "",
    ...details.map(([label, value]) => `${label}: ${value}`),
    "",
    note,
  ].join("\n");
  const html = layout(
    "Checkout started",
    `${attempt.customerName} is checking out.`,
    `<tr><td style="padding:18px 32px 8px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4ddd3;border-bottom:1px solid #e4ddd3">
          ${details.map(([label, value]) => row(label, value)).join("")}
        </table>
      </td></tr>
      <tr><td style="padding:16px 32px 32px;color:#5e554c;font-size:14px;line-height:1.6">${escapeHtml(note)}</td></tr>`,
  );
  return { subject, text, html };
}

export async function sendCheckoutAttemptAlert(attempt: CheckoutAttemptRecord, now = new Date()) {
  if (!(await claimCheckoutAttemptAlert(attempt.id, now))) return { status: "already-sent" as const };
  try {
    const config = loadMailConfiguration();
    if (config.owner.toLowerCase() === attempt.customerEmail.toLowerCase()) return { status: "skipped" as const };
    const message = buildCheckoutAttemptAlert(attempt);
    await nodemailer.createTransport(config.transport).sendMail({
      from: `FA ÀURELLE <${config.from}>`,
      to: config.owner,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { status: "sent" as const };
  } catch (error) {
    await releaseCheckoutAttemptAlert(attempt.id, now);
    console.error("[commerce:checkout-attempt-alert]", {
      attemptId: attempt.id,
      causeName: error instanceof Error ? error.name : typeof error,
    });
    return { status: "failed" as const };
  }
}

type DigestEntry = { attempt: CheckoutAttemptRecord; outcome: CheckoutOutcome };

export function buildCheckoutDigest(entries: readonly DigestEntry[], periodLabel: string) {
  const unfinished = entries.filter((entry) => entry.outcome !== "ordered");
  const ordered = entries.length - unfinished.length;
  const subject = `Checkout summary ${periodLabel} — ${unfinished.length} did not order`;
  const summary = `${entries.length} ${entries.length === 1 ? "person" : "people"} started checkout. ${ordered} ordered, ${unfinished.length} did not.`;
  const listIntro = unfinished.length
    ? "These customers did not complete their order. The attached spreadsheet has the same list."
    : "Everyone who started checkout completed their order.";

  const text = [
    `Checkout summary ${periodLabel}`,
    "",
    summary,
    listIntro,
    "",
    ...unfinished.flatMap(({ attempt, outcome }) => [
      `${attempt.customerName} — ${checkoutOutcomeLabels[outcome]}`,
      `  Mobile: ${attempt.customerPhone} · Email: ${attempt.customerEmail}`,
      `  ${address(attempt)}`,
      `  ${formatIstDateTime(attempt.firstSeenAt)}`,
      "",
    ]),
  ].join("\n");

  const cards = unfinished.map(({ attempt, outcome }) => `
        <tr><td style="padding:14px 0;border-top:1px solid #e4ddd3;font-size:14px;line-height:1.6;color:#5e554c">
          <strong style="color:#17130f;font-size:15px">${escapeHtml(attempt.customerName)}</strong>
          <span style="display:inline-block;margin-left:8px;padding:2px 8px;background:#f7f3ec;color:#8d621f;font-size:12px">${escapeHtml(checkoutOutcomeLabels[outcome])}</span><br>
          ${escapeHtml(attempt.customerPhone)} · ${escapeHtml(attempt.customerEmail)}<br>
          ${escapeHtml(address(attempt))}<br>
          <span style="color:#8a8178">${escapeHtml(formatIstDateTime(attempt.firstSeenAt))}</span>
        </td></tr>`).join("");

  const html = layout(
    "Daily checkout summary",
    `Checkout summary ${periodLabel}`,
    `<tr><td style="padding:14px 32px 6px;color:#5e554c;font-size:16px;line-height:1.6">${escapeHtml(summary)}<br>${escapeHtml(listIntro)}</td></tr>
      <tr><td style="padding:6px 32px 30px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>
      </td></tr>`,
  );
  return { subject, text, html, unfinished };
}

export async function sendCheckoutDigest(now = new Date()) {
  const attempts = await listCheckoutAttempts({ undigestedBefore: startOfIstDay(now) });
  if (!attempts.length) return { status: "nothing-to-send" as const, attempts: 0 };

  const purchasers = await findPurchasingCustomers(attempts);
  const entries = attempts.map((attempt) => ({
    attempt,
    outcome: describeCheckoutOutcome(attempt, hasPurchased(attempt, purchasers)),
  }));
  const firstDay = istDay(attempts[0].firstSeenAt);
  const lastDay = istDay(attempts[attempts.length - 1].firstSeenAt);
  const periodLabel = firstDay === lastDay ? firstDay : `${firstDay} to ${lastDay}`;
  const message = buildCheckoutDigest(entries, periodLabel);

  const config = loadMailConfiguration();
  await nodemailer.createTransport(config.transport).sendMail({
    from: `FA ÀURELLE <${config.from}>`,
    to: config.owner,
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(message.unfinished.length
      ? {
          attachments: [{
            filename: `unfinished-checkouts-${lastDay}.csv`,
            content: checkoutAttemptsCsv(message.unfinished),
            contentType: "text/csv; charset=utf-8",
          }],
        }
      : {}),
  });
  await markCheckoutAttemptsDigested(attempts.map((attempt) => attempt.id), now);
  return { status: "sent" as const, attempts: attempts.length, unfinished: message.unfinished.length };
}

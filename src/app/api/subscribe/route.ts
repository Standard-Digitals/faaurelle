import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_REQUEST_BYTES = 16_384;

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

type SubscriptionPayload = {
  name?: unknown;
  contact?: unknown;
  email?: unknown;
  location?: unknown;
  website?: unknown;
};

const rateLimits = new Map<string, RateLimitEntry>();

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ??
      character,
  );
}

function getClientAddress(request: NextRequest) {
  const forwardedAddresses = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((address) => address.trim());

  return forwardedAddresses?.at(-1) || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(address: string) {
  const now = Date.now();

  if (rateLimits.size > 500) {
    for (const [key, entry] of rateLimits) {
      if (entry.expiresAt <= now) rateLimits.delete(key);
    }
  }

  const current = rateLimits.get(address);

  if (!current || current.expiresAt <= now) {
    rateLimits.set(address, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function getSmtpConfiguration() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? user;
  const to = process.env.SUBSCRIPTION_TO_EMAIL ?? from;

  if (!host || !Number.isInteger(port) || !user || !pass || !from || !to) {
    throw new Error("SMTP environment variables are incomplete.");
  }

  return {
    transport: {
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
      requireTLS: port !== 465,
    },
    from,
    to,
  };
}

export async function POST(request: NextRequest) {
  console.log("Request recuved");
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const address = getClientAddress(request);
  if (isRateLimited(address)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait before trying again." },
      { status: 429 },
    );
  }

  let payload: SubscriptionPayload;
  try {
    payload = (await request.json()) as SubscriptionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot field: real visitors never see or fill this input.
  if (normalizeText(payload.website, 100)) {
    return NextResponse.json({ success: true });
  }
  console.log(`Payload`, {
    payload,
  });
  const name = normalizeText(payload.name, 100);
  const contact = normalizeText(payload.contact, 20).replace(/\D/g, "");
  const email = normalizeText(payload.email, 254).toLowerCase();
  const location = normalizeText(payload.location, 160);
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (name.length < 2 || !/^[6-9]\d{9}$/.test(contact) || !emailIsValid || !location) {
    return NextResponse.json(
      { error: "Please check your details and try again." },
      { status: 400 },
    );
  }

  try {
    const smtp = getSmtpConfiguration();
    console.log("smtp config", smtp);
    const transporter = nodemailer.createTransport(smtp.transport);
    const submittedAt = new Date().toISOString();

    await transporter.sendMail({
      from: `FA ÀURELLE Website <${smtp.from}>`,
      to: smtp.to,
      replyTo: email,
      subject: `New Hair Elixir subscriber — ${name}`,
      text: [
        "A new visitor registered interest in FA ÀURELLE Hair Elixir.",
        "",
        `Name: ${name}`,
        `Contact: +91 ${contact}`,
        `Email: ${email}`,
        `Location: ${location}`,
        `Submitted: ${submittedAt}`,
      ].join("\n"),
      html: `
        <h2>New Hair Elixir subscriber</h2>
        <table cellpadding="8" cellspacing="0" style="border-collapse:collapse">
          <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
          <tr><td><strong>Contact</strong></td><td>+91 ${escapeHtml(contact)}</td></tr>
          <tr><td><strong>Email</strong></td><td>${escapeHtml(email)}</td></tr>
          <tr><td><strong>Location</strong></td><td>${escapeHtml(location)}</td></tr>
          <tr><td><strong>Submitted</strong></td><td>${escapeHtml(submittedAt)}</td></tr>
        </table>
      `,
    });
    console.log("Email send");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subscription email delivery failed", error);
    return NextResponse.json(
      { error: "We could not register your interest right now. Please try again shortly." },
      { status: 500 },
    );
  }
}

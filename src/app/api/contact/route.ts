import { NextResponse, type NextRequest } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const MAX_REQUEST_BYTES = 16_384;
// The address published on the contact page; enquiries land here.
const CONTACT_INBOX = "support@faaurelle.com";
const requests = new Map<string, { count: number; expiresAt: number }>();

function normalize(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

function clientAddress(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(address: string) {
  const now = Date.now();
  const current = requests.get(address);
  if (!current || current.expiresAt <= now) {
    requests.set(address, { count: 1, expiresAt: now + 15 * 60 * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > 5;
}

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? "0") > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }
  if (isRateLimited(clientAddress(request))) {
    return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (normalize(payload.website, 100)) return NextResponse.json({ success: true });

  const name = normalize(payload.name, 100);
  const email = normalize(payload.email, 254).toLowerCase();
  const contact = normalize(payload.contact, 20).replace(/\D/g, "");
  const location = normalize(payload.location, 160);
  const topic = normalize(payload.topic, 80);
  const message = normalize(payload.message, 3000);

  if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[6-9]\d{9}$/.test(contact) || !location || !topic || message.length < 10) {
    return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
  }

  // Trimmed like order-email's config: a stray newline pasted into a Vercel
  // env var otherwise breaks SMTP auth here while order emails keep working.
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT?.trim() || "587");
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = (process.env.SMTP_FROM ?? user)?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim() || CONTACT_INBOX;

  if (!host || !Number.isInteger(port) || !user || !pass || !from || !to) {
    console.error("[contact:smtp-not-configured]", { host: Boolean(host), port, user: Boolean(user), pass: Boolean(pass), from: Boolean(from) });
    return NextResponse.json({ error: "Customer care is temporarily unavailable. Please email support@faaurelle.com." }, { status: 503 });
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: process.env.SMTP_SECURE === "true" || port === 465,
      auth: { user, pass },
      requireTLS: port !== 465,
    });
    await transporter.sendMail({
      from: `FA ÀURELLE Website <${from}>`,
      to,
      replyTo: email,
      subject: `Customer care enquiry — ${topic}`,
      text: [`Name: ${name}`, `Email: ${email}`, `Contact: +91 ${contact}`, `Location: ${location}`, `Topic: ${topic}`, "", message].join("\n"),
      html: `<h2>Customer care enquiry</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Contact:</strong> +91 ${escapeHtml(contact)}</p><p><strong>Location:</strong> ${escapeHtml(location)}</p><p><strong>Topic:</strong> ${escapeHtml(topic)}</p><p>${escapeHtml(message)}</p>`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const detail = error && typeof error === "object" ? error as { code?: unknown; responseCode?: unknown; command?: unknown; response?: unknown } : {};
    console.error("[contact:email-delivery-failed]", {
      code: detail.code,
      responseCode: detail.responseCode,
      command: detail.command,
      response: typeof detail.response === "string" ? detail.response.slice(0, 300) : undefined,
      smtpHost: host,
      smtpPort: port,
    });
    return NextResponse.json({ error: "We could not send your message. Please email support@faaurelle.com." }, { status: 500 });
  }
}

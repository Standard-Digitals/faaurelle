import { NextResponse } from "next/server";
import { matchesSharedSecret } from "@/lib/server/auth/shared-secret";
import { sendCheckoutDigest } from "@/lib/server/commerce/checkout-attempt-email";

export const dynamic = "force-dynamic";

// Called once a day by Vercel Cron (vercel.json), which sends
// "Authorization: Bearer <CRON_SECRET>".
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!matchesSharedSecret(token, process.env.CRON_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const result = await sendCheckoutDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[commerce:checkout-digest]", {
      causeName: error instanceof Error ? error.name : typeof error,
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

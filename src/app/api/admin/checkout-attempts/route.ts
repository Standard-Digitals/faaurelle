import { matchesSharedSecret } from "@/lib/server/auth/shared-secret";
import {
  checkoutAttemptsCsv,
  describeCheckoutOutcome,
  findPurchasingCustomers,
  hasPurchased,
  istDay,
  listCheckoutAttempts,
} from "@/lib/server/commerce/checkout-attempts";

export const dynamic = "force-dynamic";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function istDayStart(value: string | null) {
  if (!value || !DAY.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00+05:30`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

// Downloads every saved checkout attempt as a spreadsheet:
//   /api/admin/checkout-attempts/?key=<ADMIN_EXPORT_KEY>[&from=YYYY-MM-DD][&to=YYYY-MM-DD]
// Dates are IST days and both ends are inclusive.
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!matchesSharedSecret(url.searchParams.get("key"), process.env.ADMIN_EXPORT_KEY)) {
    return new Response("Not found", { status: 404 });
  }

  const from = istDayStart(url.searchParams.get("from"));
  const toStart = istDayStart(url.searchParams.get("to"));
  const to = toStart ? new Date(toStart.getTime() + 24 * 60 * 60 * 1000) : undefined;

  const attempts = await listCheckoutAttempts({ from, to });
  const purchasers = await findPurchasingCustomers(attempts);
  const csv = checkoutAttemptsCsv(attempts.map((attempt) => ({
    attempt,
    outcome: describeCheckoutOutcome(attempt, hasPurchased(attempt, purchasers)),
  })));

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="checkout-attempts-${istDay(new Date())}.csv"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
    },
  });
}

# FA AURELLE cinematic website

Next.js, React Three Fiber, Three.js, GSAP, and Lenis power the product hero.

## Setup

```bash
pnpm install
pnpm dev
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Checkout test data

Use this fictional profile when testing delivery serviceability for Zirakpur:

```text
Name: Aarav Mehta
Email: aarav.mehta@example.com
Mobile: 9876543210
Address line 1: Flat 204, Silver Oak Residency
Address line 2: VIP Road
City: Zirakpur
State: Punjab
Pincode: 140603
Country: India
```

For Razorpay **Test Mode only**, use:

```text
Card number: 4111 1111 1111 1111
Expiry: Any future date, such as 12/30
CVV: 123
Name: Test User
OTP: 1234, if prompted
```

Never enter a real card while testing. Confirm that Razorpay Checkout displays
the **Test Mode** indicator before continuing.

## Production go-live configuration

Provider mode is explicit and independent of `NODE_ENV`. Use `test` with Test
credentials during local or Preview testing, and `live` with Live credentials in
Vercel Production. Missing, differently-cased, or unsupported modes fail closed.
The application does not infer mode from key prefixes or fall back between modes.

Configure these variables in **Vercel Production**:

```text
DATABASE_URL=<production-managed-postgresql-url>
NEXT_PUBLIC_BASE_PATH=
SITE_URL=https://www.faaurelle.com

RAZORPAY_PAYMENT_MODE=live
RAZORPAY_KEY_ID=<live-key-id>
RAZORPAY_KEY_SECRET=<live-key-secret>
RAZORPAY_WEBHOOK_SECRET=<live-webhook-secret>

DELHIVERY_API_BASE_URL=https://track.delhivery.com
DELHIVERY_API_TOKEN=<live-token>
DELHIVERY_PICKUP_NAME=<exact-case-sensitive-production-pickup-name>

SMTP_HOST=<smtp-host>
SMTP_PORT=<smtp-port>
SMTP_SECURE=<true-or-false>
SMTP_USER=<smtp-user>
SMTP_PASS=<smtp-password>
SMTP_FROM=<authenticated-from-address>
SUBSCRIPTION_TO_EMAIL=<subscription-recipient>
CONTACT_TO_EMAIL=<contact-recipient>
```

Captured orders send two separate branded messages: an order confirmation to
the customer and a new-order notification to the owner. `SUBSCRIPTION_TO_EMAIL`
is the owner recipient and falls back to `SMTP_FROM` when omitted. Both messages
include the persisted order and pricing snapshot, delivery details,
payment/fulfilment status, waybill when available, and a Track Order link
prefilled with the private FA reference. The public deployed wordmark is used so
the logo remains reachable by email clients even during local development.
Each delivery is recorded durably on the Order so concurrent browser
verification and Razorpay webhook processing do not send duplicates.

`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and `POSTGRES_PORT` are
local Docker variables and must not be configured in Vercel. Prisma and the
application runtime use `DATABASE_URL`.

The server-authoritative coupons are `SIMRAN20`, `SAHIL20`, and `NEW20`. Each is
20% off the whole subtotal and expires after 30 November 2026 in Asia/Kolkata.
Only a captured payment creates a successful redemption. Database uniqueness
enforces once-per-code usage by normalized email or normalized phone. Failed or
abandoned payments do not redeem a coupon.

### Razorpay Dashboard

- Select **Live Mode**.
- Configure `https://faaurelle.com/api/webhooks/razorpay` as the webhook URL.
- Use the same webhook secret as Vercel Production
  `RAZORPAY_WEBHOOK_SECRET`.
- Enable `payment.captured`, `payment.failed`, and `order.paid`. V1 does not
  process `payment.authorized`.

### Delhivery Production

- Confirm the Live token is active for `https://track.delhivery.com`.
- Confirm `DELHIVERY_PICKUP_NAME` exactly matches the Production pickup name,
  including spelling and case.
- Confirm serviceability, shipment creation, and waybill tracking succeed for
  the Production account.
- Rotate credentials manually through Delhivery and Vercel when needed.

### Post-deployment smoke test

1. Deploy Production.
2. Confirm all committed Prisma migrations were applied.
3. Open checkout on `https://faaurelle.com`.
4. Confirm Delhivery Live serviceability for the intended destination.
5. Create one controlled real purchase through Razorpay Live.
6. Confirm the Razorpay payment is `CAPTURED`.
7. Confirm the internal Order is `PAID` and Payment is `CAPTURED`.
8. If using a coupon, confirm exactly one `CouponRedemption` exists.
9. Confirm the Delhivery Production shipment is `CREATED`.
10. Confirm the waybill is persisted.
11. Confirm the durable confirmation page and stored monetary breakdown.
12. Resolve the shipment through Track Order using the FA reference.
13. Confirm the Razorpay webhook event is `PROCESSED`.
14. Confirm no duplicate shipment or coupon redemption exists.
15. If required operationally, cancel the test shipment manually in Delhivery.
    V1 does not automate shipment cancellation or refunds.

## Track Order

Track Order is a read-only customer lookup using only the Aurelle order reference.
A reference such as `FA-0123456789ABCDEF0123` is normalized and matched exactly
against the unique `Order.customerReference`. The stored Delhivery waybill remains
private and is used only by the server to retrieve carrier updates. The public UI
and API neither accept nor return a waybill.

Customer references are generated server-side from random bytes, stored in
uppercase, and enforced as unique by PostgreSQL. Historical orders receive a
reference through the explicit Phase 9 migration; no request-time backfill is
performed. The full opaque `Order.publicToken` remains the confirmation URL
credential and is never used as the human-entered tracking value.

If an order is paid but its carrier tracking identifier is not ready, Track Order returns
a customer-safe preparation state and does not call Delhivery. Unknown references
receive a generic not-found response. If the shipment has not appeared in
Delhivery tracking yet, the known order receives a separate carrier-pending state.
Tracking never creates shipments or mutates
Order, Payment, or Shipment state, and its response excludes customer contact,
address, payment-provider, and internal database identifiers.

## Active hero assets

Runtime assets live under `public/`:

- `public/models/hero/fa-aurelle-new-bottle-runtime-v7.glb`
- `public/environments/hero/fa-aurelle-serum-studio-v1.hdr`
- `public/images/products/best-seller-hair-elixir.png`

Editable Blender sources live under `assets/3d/hero/blend/`; the browser never
loads `.blend` files. Asset-generation commands are documented in
`docs/hero-generation/README.md`.

Client/HQ name: Fa aurelle / the vamana & co.
Pickup/Warehouse name: 1020 tower no 5 southcity apartments vip road zirakpur punjab 140603
Pickup pincode: 140603
Package weight (grams): 150 gms
Dimensions L × W × H: 8cms x 8cms x 13 cms
HSN code: 33059090
seller GSTIN : 04AYUPB0073E1ZS

9056347061

Full name: Amanpreet Singh
Email: amanpreet@gmail.com
Mobile number: 9056347061

Address line 1: Flat 304, Block B, Maya Garden City
Address line 2: Chandigarh–Ambala Highway
Location: Zirakpur
State: Punjab
Pincode: 160104
Country: India

FA-E080F5F69E52E1CC13B1

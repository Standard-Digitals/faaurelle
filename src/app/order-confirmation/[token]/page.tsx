import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { SiteHeader } from "@/components/header/SiteHeader";
import { formatInr } from "@/lib/commerce/money";
import { getOrderConfirmation } from "@/lib/server/commerce/order-confirmation";
import { ConfirmationArrival } from "./ConfirmationArrival";
import styles from "./order-confirmation.module.css";

/*
THESIS: Confirmation is a calm, durable receipt: payment truth first, shipment progress second.
OWN-WORLD: Pure white space, warm ink, fine gold rules, Raleway headings and Roboto detail copy.
STORY: Reassure the customer, preserve the purchased snapshot, and make fulfilment state explicit.
FIRST VIEWPORT: Payment confirmation and the one next operational fact are immediately visible.
*/

export const metadata: Metadata = {
  title: "Order confirmation",
  description: "Review your FA ÀURELLE order confirmation.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

type PageProps = Readonly<{ params: Promise<{ token: string }> }>;

const stateCopy = {
  created: {
    eyebrow: "Order confirmed",
    title: "Your shipment is ready for dispatch.",
    body: "Payment is confirmed and your prepaid shipment has been created with Delhivery.",
  },
  preparing: {
    eyebrow: "Payment confirmed",
    title: "We’re preparing your shipment.",
    body: "Your payment is secure. Shipment processing is still in progress; refresh this page for the latest saved status.",
  },
  failed: {
    eyebrow: "Payment confirmed",
    title: "Your order needs a little more time.",
    body: "Your payment is secure, but shipment creation did not complete. The order remains recorded for fulfilment recovery.",
  },
} as const;

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { token } = await params;
  const order = await getOrderConfirmation(token);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  if (!order) {
    return (
      <>
        <SiteHeader />
        <main id="main-content" className={`${styles.main} ${styles.recoveryMain}`}>
          <section className={styles.recovery} aria-labelledby="recovery-title">
            <p className={styles.eyebrow}>Confirmation pending</p>
            <h1 id="recovery-title">We can’t confirm this order yet.</h1>
            <p>
              The reference may still be reconciling, or it may be invalid. No successful order
              confirmation is being shown. If you just paid, wait a moment and refresh this page.
            </p>
            <nav className={styles.actions} aria-label="Recovery actions">
              <a className={styles.primaryAction} href={`${basePath}/order-confirmation/${encodeURIComponent(token)}`}>
                Refresh confirmation <span aria-hidden="true">→</span>
              </a>
              <Link className={styles.secondaryAction} href={`${basePath}/contact`}>Contact customer care</Link>
            </nav>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const copy = stateCopy[order.fulfilment];

  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.main}>
        <ConfirmationArrival token={token} />
        <section className={styles.hero} aria-labelledby="confirmation-title">
          <div className={styles.statusMark} aria-hidden="true">✓</div>
          <div>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1 id="confirmation-title">{copy.title}</h1>
            <p className={styles.lead}>{copy.body}</p>
          </div>
          <dl className={styles.reference}>
            <div>
              <dt>Order reference</dt>
              <dd>{order.displayReference}</dd>
            </div>
            {order.waybill ? (
              <div>
                <dt>Waybill</dt>
                <dd>{order.waybill}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        <section className={styles.details} aria-label="Order details">
          <div className={styles.productBlock}>
            <p className={styles.sectionLabel}>Your order</p>
            <h2>{order.productName}</h2>
            <dl className={styles.lineItems}>
              <div><dt>Unit price</dt><dd>{formatInr(order.unitAmountPaisa)}</dd></div>
              <div><dt>Quantity</dt><dd>{order.quantity}</dd></div>
              <div><dt>Subtotal</dt><dd>{formatInr(order.subtotalPaisa)}</dd></div>
              {order.couponCode && order.discountPaisa > 0 ? (
                <>
                  <div><dt>Coupon</dt><dd>{order.couponCode}</dd></div>
                  <div><dt>Discount</dt><dd>−{formatInr(order.discountPaisa)}</dd></div>
                </>
              ) : null}
              <div><dt>Shipping</dt><dd>{order.shippingPaisa === 0 ? "Free" : formatInr(order.shippingPaisa)}</dd></div>
              <div><dt>Additional checkout tax</dt><dd>{formatInr(order.taxPaisa)}</dd></div>
              <div className={styles.total}><dt>Total paid</dt><dd>{formatInr(order.totalPaisa)}</dd></div>
            </dl>
            <p className={styles.taxNote}>The displayed total is the tax-inclusive amount stored with this order.</p>
          </div>

          <aside className={styles.deliveryBlock} aria-labelledby="delivery-title">
            <p className={styles.sectionLabel}>Delivery</p>
            <h2 id="delivery-title">Shipment status</h2>
            <p className={styles.state}>{copy.eyebrow}</p>
            <dl className={styles.deliveryFacts}>
              <div><dt>Recipient</dt><dd>{order.customerName}</dd></div>
              <div><dt>Destination</dt><dd>{order.destination}</dd></div>
              <div><dt>Payment</dt><dd>Captured · {order.currency}</dd></div>
            </dl>
            {order.fulfilment !== "created" ? (
              <a className={styles.refreshLink} href={`${basePath}/order-confirmation/${encodeURIComponent(token)}`}>
                Refresh saved status
              </a>
            ) : null}
          </aside>
        </section>

        <nav className={styles.actions} aria-label="Confirmation actions">
          <Link className={styles.primaryAction} href={`${basePath}/product`}>Return to product <span aria-hidden="true">→</span></Link>
          <Link className={styles.secondaryAction} href={`${basePath}/`}>Continue home</Link>
        </nav>
      </main>
      <SiteFooter />
    </>
  );
}

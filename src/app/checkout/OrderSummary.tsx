import Image from "next/image";
import { formatInr } from "@/lib/commerce/money";
import styles from "./checkout.module.css";

export type CheckoutSummary = Readonly<{
  productName: string;
  image: string;
  imageAlt: string;
  quantity: 1;
  unitAmountPaisa: number;
  subtotalPaisa: number;
  couponCode?: string;
  discountPaisa: number;
  shippingPaisa: 0;
  taxPaisa: 0;
  totalPaisa: number;
  currency: "INR";
}>;

export function OrderSummary({ summary }: { summary: CheckoutSummary }) {
  return (
    <aside className={styles.summary} aria-labelledby="order-summary-title">
      <div className={styles.summaryHeading}>
        <p>Your selection</p>
        <h2 id="order-summary-title">Order summary</h2>
      </div>

      <div className={styles.productLine}>
        <div className={styles.productImage}>
          <Image src={summary.image} alt={summary.imageAlt} fill sizes="(max-width: 900px) 8rem, 10rem" />
        </div>
        <div>
          <h3>{summary.productName}</h3>
          <p>Quantity {summary.quantity}</p>
          <p>{summary.currency}</p>
        </div>
        <strong>{formatInr(summary.unitAmountPaisa)}</strong>
      </div>

      <dl className={styles.totals}>
        <div><dt>Subtotal</dt><dd>{formatInr(summary.subtotalPaisa)}</dd></div>
        {summary.couponCode && summary.discountPaisa > 0 ? (
          <>
            <div><dt>Coupon</dt><dd>{summary.couponCode}</dd></div>
            <div><dt>Discount</dt><dd>−{formatInr(summary.discountPaisa)}</dd></div>
          </>
        ) : null}
        <div><dt>Shipping</dt><dd>Free</dd></div>
        <div><dt>Total</dt><dd>{formatInr(summary.totalPaisa)}</dd></div>
      </dl>

      <p className={styles.summaryNote}>{formatInr(summary.totalPaisa)} is the tax-inclusive selling price. No separate tax or shipping amount is added. Delivery remains subject to prepaid pincode serviceability.</p>
    </aside>
  );
}

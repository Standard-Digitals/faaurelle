import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/header/SiteHeader";
import { getAuthoritativeProduct } from "@/lib/server/commerce/products";
import { calculateV1Pricing } from "@/lib/server/commerce/pricing";
import { product } from "@/config/product";
import { CheckoutForm } from "./CheckoutForm";
import { OrderSummary, type CheckoutSummary } from "./OrderSummary";
import styles from "./checkout.module.css";

/*
THESIS: Checkout is a composed handoff from product desire to precise delivery details, not a generic payment form.
OWN-WORLD: Warm ivory, white working fields, fine gold rules, square controls, Raleway headings and Roboto copy.
STORY: Confirm the selected elixir, provide guest delivery details, and validate them before serviceability or payment.
FIRST VIEWPORT: A quiet checkout heading opens into a continuous form beside a sticky product ledger.
FORM: Product-led split checkout, candidate 7, assigned with operate seed 2aeb19eb.
*/

export const metadata: Metadata = {
  title: "Checkout",
  description: "Enter guest delivery details for the FA ÀURELLE Hair Elixir.",
};

type CheckoutPageProps = {
  searchParams: Promise<{ product?: string | string[] }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const productCode = typeof params.product === "string" ? params.product : "";
  const authoritativeProduct = getAuthoritativeProduct(productCode);

  if (!authoritativeProduct) notFound();

  const pricing = calculateV1Pricing(authoritativeProduct);

  const summary: CheckoutSummary = {
    productName: authoritativeProduct.name,
    image: "/images/products/best-seller-hair-elixir.png",
    imageAlt: product.altText,
    ...pricing,
  };
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.main}>
        <header className={styles.intro}>
          <a href={`${basePath}/product`}>← Return to product</a>
          <p className={styles.kicker}>Guest checkout</p>
          <h1>Where should your ritual arrive?</h1>
          <p>Share your contact and delivery details. We’ll check prepaid delivery availability before payment becomes available.</p>
        </header>

        <div className={styles.checkoutLayout}>
          <CheckoutForm productCode={authoritativeProduct.code} />
          <OrderSummary summary={summary} />
        </div>
      </main>
    </>
  );
}

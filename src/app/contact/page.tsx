import type { Metadata } from "next";
import { InnerCircleSection } from "@/components/closing/InnerCircleSection";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { TrustDetailsSection } from "@/components/closing/TrustDetailsSection";
import { ContactForm } from "@/components/customer-care/ContactForm";
import styles from "@/components/customer-care/CustomerCare.module.css";
import { SiteHeader } from "@/components/header/SiteHeader";

/*
THESIS: Contact should feel like a private consultation, not a generic support portal.
OWN-WORLD: White and warm-ivory fields, fine gold rules, square controls, Raleway and Roboto.
STORY: Understand the support scope, choose a reason, and send a clear message.
FIRST VIEWPORT: A restrained editorial title field leads directly into guidance and the form.
FORM: Customer-care extension, structured as consultation details beside a focused correspondence form.
*/

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact FA ÀURELLE for product guidance, order support, and customer care.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.kicker}>Customer care</p>
            <h1>We’re here to help.</h1>
            <p className={styles.heroLead}>
              Whether you need product guidance or assistance with an order, share the details below
              and our customer care team will review your message.
            </p>
          </div>
        </header>

        <section className={styles.contactLayout} aria-labelledby="contact-form-title">
          <aside className={styles.contactAside}>
            <h2 id="contact-form-title">Begin a conversation</h2>
            <p>
              Include as much detail as you can. For order questions, add your order reference in
              the message so we can understand your request clearly.
            </p>
            <ul className={styles.contactDetails}>
              <li>
                <span>Email</span>
                <a href="mailto:support@faaurelle.com">support@faaurelle.com</a>
              </li>
              <li>
                <span>Support</span>
                <p>Products, orders, delivery, returns, press and partnerships.</p>
              </li>
              <li>
                <span>Looking for a quick answer?</span>
                <a href="/faq">Visit frequently asked questions</a>
              </li>
            </ul>
          </aside>
          <ContactForm />
        </section>
      </main>
      <InnerCircleSection />
      <TrustDetailsSection />
      <SiteFooter />
    </>
  );
}

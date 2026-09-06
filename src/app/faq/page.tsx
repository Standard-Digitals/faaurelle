import type { Metadata } from "next";
import { InnerCircleSection } from "@/components/closing/InnerCircleSection";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { TrustDetailsSection } from "@/components/closing/TrustDetailsSection";
import styles from "@/components/customer-care/CustomerCare.module.css";
import { SiteHeader } from "@/components/header/SiteHeader";

/*
THESIS: Answers should feel calm and immediate, avoiding support-dashboard chrome.
OWN-WORLD: Warm-ivory introduction, white reading field, gold hairlines, Raleway and Roboto.
STORY: Scan common questions, reveal only the needed answer, and continue to direct support.
FIRST VIEWPORT: A concise editorial introduction makes the page purpose unmistakable.
FORM: Customer-care extension, using a sticky guide and an open, ruled disclosure index.
*/

const faqs = [
  [
    "What is FA ÀURELLE Hair Elixir Oil-in-Serum?",
    "It is a lightweight finishing serum created to support softness, smoothness, frizz control, and a luminous finish without compromising natural movement.",
  ],
  [
    "How should I use the Hair Elixir?",
    "Begin with a small amount and distribute it through the mid-lengths and ends. It can be used on damp hair before styling or on dry hair as a finishing touch.",
  ],
  [
    "Is it suitable for every hair type?",
    "The formula is designed for a wide range of hair types and textures. Adjust the amount according to your hair length, density, and preferred finish.",
  ],
  [
    "Will the serum make my hair feel heavy?",
    "It is designed for a refined, weightless feel. Start sparingly, especially on fine hair, and add more only where needed.",
  ],
  [
    "When will my order be dispatched?",
    "Dispatch and delivery information will be shown during checkout and included in your order confirmation. Please review our Shipping Policy for the latest details.",
  ],
  [
    "Can I change or cancel an order?",
    "Order changes depend on its processing status. Contact customer care as soon as possible and refer to our Cancellation & Refund Policy for the applicable terms.",
  ],
  [
    "What if my order arrives damaged?",
    "Contact customer care with your order reference and clear photographs of the parcel and product. Our team will guide you according to the Return & Replacement Policy.",
  ],
  [
    "How can I contact FA ÀURELLE?",
    "Use the contact form or email support@faaurelle.com. Include your order reference when your question relates to an existing purchase.",
  ],
] as const;

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about FA ÀURELLE products, orders, and customer care.",
};

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.kicker}>Customer care</p>
            <h1 className={styles.faqHeading}>
              <span>Frequently asked</span>
              <span>questions.</span>
            </h1>
            <p className={styles.heroLead}>
              Explore guidance on the FA ÀURELLE ritual, ordering, delivery, and aftercare.
            </p>
          </div>
        </header>

        <section className={styles.faqLayout} aria-labelledby="faq-list-title">
          <div className={styles.faqIntro}>
            <h2 id="faq-list-title">Frequently asked</h2>
            <p>Open a question to reveal its answer. If you need personal assistance, our customer care team is available.</p>
            <a href="/contact">Contact customer care</a>
          </div>
          <div className={styles.faqList}>
            {faqs.map(([question, answer], index) => (
              <details key={question} open={index === 0}>
                <summary>{question}</summary>
                <div className={styles.faqAnswer}><p>{answer}</p></div>
              </details>
            ))}
          </div>
        </section>
      </main>
      <InnerCircleSection />
      <TrustDetailsSection />
      <SiteFooter />
    </>
  );
}

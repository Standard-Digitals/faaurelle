export type PolicyKey =
  | "termsAndConditions"
  | "refundAndCancellation"
  | "shipping"
  | "returnAndReplacement";

type PolicyBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: readonly string[] };

export type PolicyDocument = {
  title: string;
  effectiveDate: string;
  introduction: readonly string[];
  sections: readonly {
    id: string;
    title: string;
    blocks: readonly PolicyBlock[];
  }[];
};

export const policies: Record<PolicyKey, PolicyDocument> = {
  shipping: {
    title: "Shipping Policy",
    effectiveDate: "15 September 2026",
    introduction: [
      "At FA ÀURELLE, we believe your experience should be as refined as our products. From the moment you place your order to the moment your FA ÀURELLE Premium Hair Serum reaches you, we aim to provide a smooth and reliable experience.",
    ],
    sections: [
      {
        id: "order-processing",
        title: "1.1 Order Processing",
        blocks: [
          {
            type: "list",
            items: [
              "Orders are generally processed within 1–2 business days after successful payment.",
              "Orders placed on Sundays or public holidays will be processed on the next business day.",
              "Once your order has been dispatched, you will receive shipping confirmation and tracking details on your registered email address or mobile number.",
              "In certain circumstances, order processing may take longer due to high order volumes, promotional periods, unforeseen operational issues, or force majeure events.",
            ],
          },
        ],
      },
      {
        id: "shipping-and-delivery",
        title: "1.2 Shipping & Delivery",
        blocks: [
          {
            type: "list",
            items: [
              "We currently ship orders across India.",
              "Standard delivery generally takes approximately 3–7 business days after dispatch, depending on the delivery location.",
              "Delivery timelines may vary for remote locations, areas affected by weather, transportation disruptions, public holidays, or other circumstances beyond our control.",
              "Estimated delivery timelines are indicative and should not be considered guaranteed delivery dates.",
            ],
          },
        ],
      },
      {
        id: "shipping-charges",
        title: "1.3 Shipping Charges",
        blocks: [
          {
            type: "list",
            items: [
              "Shipping charges, if applicable, will be displayed at checkout before you complete your purchase.",
              "Any free-shipping offers will be subject to the terms specified at the time of the offer.",
            ],
          },
        ],
      },
      {
        id: "incorrect-or-incomplete-address",
        title: "1.4 Incorrect or Incomplete Address",
        blocks: [
          { type: "paragraph", text: "Customers are responsible for providing accurate delivery details at checkout." },
          {
            type: "paragraph",
            text: "FA ÀURELLE will not be responsible for delays, failed deliveries, or additional shipping costs resulting from an incorrect, incomplete, or inaccurate address or contact information provided by the customer.",
          },
          {
            type: "paragraph",
            text: "If an order is returned to us due to an incorrect address or failed delivery, please contact us at support@faaurelle.com.",
          },
        ],
      },
      {
        id: "delayed-or-lost-orders",
        title: "1.5 Delayed or Lost Orders",
        blocks: [
          {
            type: "paragraph",
            text: "If your order appears to be delayed, please contact us at support@faaurelle.com with your order number. We will coordinate with the relevant delivery partner to investigate the shipment.",
          },
        ],
      },
      {
        id: "damaged-package-at-delivery",
        title: "1.6 Damaged Package at Delivery",
        blocks: [
          {
            type: "paragraph",
            text: "If your package appears visibly damaged, opened, tampered with, or leaking at the time of delivery, please do not accept the package where possible and contact us immediately at support@faaurelle.com.",
          },
          {
            type: "paragraph",
            text: "For damaged products received after delivery, please refer to our Return & Replacement Policy.",
          },
        ],
      },
    ],
  },
  refundAndCancellation: {
    title: "Cancellation & Refund Policy",
    effectiveDate: "15 September 2026",
    introduction: [
      "We understand that plans can change. Our cancellation policy is designed to provide a straightforward process while ensuring that orders already processed or dispatched are handled appropriately.",
    ],
    sections: [
      {
        id: "order-cancellation",
        title: "2.1 Order Cancellation",
        blocks: [
          {
            type: "paragraph",
            text: "Customers may request cancellation of an order by contacting support@faaurelle.com as soon as possible after placing the order.",
          },
          {
            type: "paragraph",
            text: "Cancellation requests will only be accepted if the order has not yet been processed for dispatch.",
          },
          {
            type: "paragraph",
            text: "Once an order has been dispatched, cancellation may no longer be possible. In such cases, the customer may need to receive the order and follow the applicable return/replacement process, if eligible.",
          },
        ],
      },
      {
        id: "cancellation-before-dispatch",
        title: "2.2 Cancellation Before Dispatch",
        blocks: [
          {
            type: "list",
            items: [
              "The order will be cancelled.",
              "The eligible refund will be initiated to the original payment method.",
              "The time taken for the refund to reflect in your account may depend on the payment gateway, bank, or financial institution.",
            ],
          },
        ],
      },
      {
        id: "cancellation-after-dispatch",
        title: "2.3 Cancellation After Dispatch",
        blocks: [
          { type: "paragraph", text: "Orders that have already been dispatched generally cannot be cancelled." },
          {
            type: "paragraph",
            text: "If you no longer wish to receive a dispatched order, please contact support@faaurelle.com. Any return or refund will be subject to our applicable Return & Replacement Policy.",
          },
        ],
      },
      {
        id: "failed-or-undelivered-orders",
        title: "2.4 Failed or Undelivered Orders",
        blocks: [
          {
            type: "paragraph",
            text: "If an order cannot be delivered due to circumstances attributable to the customer, including an incorrect address, unavailable recipient, or repeated failed delivery attempts, the order may be returned to FA ÀURELLE.",
          },
          {
            type: "paragraph",
            text: "Any refund, if applicable, will be processed after the returned shipment is received and reviewed, and applicable shipping or handling charges may be deducted where permitted.",
          },
        ],
      },
      {
        id: "refund-processing",
        title: "2.5 Refund Processing",
        blocks: [
          {
            type: "paragraph",
            text: "Approved refunds will generally be initiated within 5–7 business days after approval or receipt and inspection of the returned product, as applicable.",
          },
          {
            type: "paragraph",
            text: "The actual time for the refund to appear in the customer's account may vary depending on the payment method and financial institution.",
          },
        ],
      },
      {
        id: "how-to-request-cancellation-or-refund",
        title: "2.6 How to Request Cancellation or Refund",
        blocks: [
          { type: "paragraph", text: "Please email support@faaurelle.com with:" },
          {
            type: "list",
            items: [
              "Order number",
              "Registered email/mobile number",
              "Reason for cancellation/refund",
              "Relevant photographs or videos, where applicable",
            ],
          },
          {
            type: "paragraph",
            text: "Our customer support team will review the request and respond accordingly.",
          },
        ],
      },
    ],
  },
  returnAndReplacement: {
    title: "Return & Replacement Policy",
    effectiveDate: "15 September 2026",
    introduction: [
      "At FA ÀURELLE, product quality and customer satisfaction are our priorities. Because hair-care products are personal-use products, returns and replacements are subject to the conditions below.",
    ],
    sections: [
      {
        id: "eligible-replacement-cases",
        title: "3.1 Eligible Replacement Cases",
        blocks: [
          {
            type: "list",
            items: [
              "The product received is damaged during transit.",
              "The product received is defective or leaking.",
              "The product received is incorrect or different from the product ordered.",
              "The product is missing from the shipment.",
              "The package appears to have been tampered with or compromised during delivery.",
            ],
          },
        ],
      },
      {
        id: "reporting-a-damaged-or-incorrect-product",
        title: "3.2 Reporting a Damaged or Incorrect Product",
        blocks: [
          {
            type: "paragraph",
            text: "Customers must contact us at support@faaurelle.com within 48 hours of delivery for damage, leakage, incorrect product, or missing-item claims.",
          },
          { type: "paragraph", text: "Please include:" },
          {
            type: "list",
            items: [
              "Order number",
              "Clear photographs of the product",
              "Photographs of the outer packaging and shipping label",
              "A short video/unboxing video, where available",
              "Description of the issue",
            ],
          },
          {
            type: "paragraph",
            text: "Providing an unboxing video is strongly recommended, particularly for claims involving damage, leakage, tampering, or missing items.",
          },
        ],
      },
      {
        id: "product-condition-for-returns",
        title: "3.3 Product Condition for Returns",
        blocks: [
          {
            type: "list",
            items: [
              "Be unused or minimally handled, as applicable;",
              "Be in its original packaging;",
              "Include all original components, labels, and accessories;",
              "Not have been intentionally damaged or altered.",
            ],
          },
        ],
      },
      {
        id: "non-returnable-products",
        title: "3.4 Non-Returnable Products",
        blocks: [
          {
            type: "paragraph",
            text: "For hygiene, safety, and product-integrity reasons, opened or used hair-care products may generally not be eligible for return or replacement, except where the product is found to be defective, damaged, incorrect, or otherwise covered by applicable consumer law.",
          },
          {
            type: "paragraph",
            text: "Products purchased from unauthorized sellers or third-party retailers are not eligible for return through FA ÀURELLE's website support process.",
          },
        ],
      },
      {
        id: "replacement-process",
        title: "3.5 Replacement Process",
        blocks: [
          {
            type: "paragraph",
            text: "Once a claim is received, our team may review the photographs, videos, order information, and other relevant details.",
          },
          { type: "paragraph", text: "If the claim is approved, FA ÀURELLE may:" },
          {
            type: "list",
            items: [
              "Provide a replacement product; or",
              "Provide another appropriate resolution depending on product availability and the circumstances of the case.",
            ],
          },
        ],
      },
      {
        id: "return-shipping",
        title: "3.6 Return Shipping",
        blocks: [
          {
            type: "paragraph",
            text: "Where FA ÀURELLE confirms that the product was damaged, defective, incorrect, or otherwise eligible for replacement due to an issue attributable to us, the applicable return shipping cost will be handled by FA ÀURELLE.",
          },
          {
            type: "paragraph",
            text: "For other returns requested for reasons not covered by this policy, return shipping may be the customer's responsibility, subject to eligibility.",
          },
        ],
      },
      {
        id: "refund-instead-of-replacement",
        title: "3.7 Refund Instead of Replacement",
        blocks: [
          {
            type: "paragraph",
            text: "If a replacement is unavailable or otherwise considered inappropriate, FA ÀURELLE may issue a refund where applicable.",
          },
          { type: "paragraph", text: "Refunds will be processed according to the Cancellation & Refund Policy." },
        ],
      },
    ],
  },
  termsAndConditions: {
    title: "Terms & Conditions",
    effectiveDate: "15 September 2026",
    introduction: [
      "Welcome to the FA ÀURELLE website. By accessing or using this website and purchasing our products, you agree to be bound by these Terms & Conditions.",
      "Please read these terms carefully before using the website or placing an order.",
    ],
    sections: [
      {
        id: "about-fa-aurelle",
        title: "4.1 About FA ÀURELLE",
        blocks: [
          {
            type: "paragraph",
            text: "FA ÀURELLE is a premium hair-care brand offering hair-care products, including FA ÀURELLE Premium Hair Serum.",
          },
          {
            type: "paragraph",
            text: "The products and information available on this website are intended for personal use unless otherwise stated.",
          },
        ],
      },
      {
        id: "website-usage",
        title: "4.2 Website Usage",
        blocks: [
          { type: "paragraph", text: "You agree to use this website only for lawful purposes." },
          { type: "paragraph", text: "You must not:" },
          {
            type: "list",
            items: [
              "Use the website for fraudulent or unlawful activities;",
              "Attempt to gain unauthorized access to the website or its systems;",
              "Copy, reproduce, modify, or distribute website content without permission;",
              "Interfere with the operation or security of the website;",
              "Submit false, misleading, or fraudulent information.",
            ],
          },
        ],
      },
      {
        id: "product-information",
        title: "4.3 Product Information",
        blocks: [
          {
            type: "paragraph",
            text: "We make reasonable efforts to ensure that product descriptions, images, specifications, pricing, and other information displayed on the website are accurate.",
          },
          {
            type: "paragraph",
            text: "However, minor differences in product packaging, colour, appearance, or imagery may occur due to photography, screen settings, packaging updates, or manufacturing variations.",
          },
        ],
      },
      {
        id: "hair-care-product-disclaimer",
        title: "4.4 Hair-Care Product Disclaimer",
        blocks: [
          {
            type: "paragraph",
            text: "FA ÀURELLE Premium Hair Serum is a cosmetic hair-care product intended to support hair care and appearance.",
          },
          {
            type: "paragraph",
            text: "Individual results may vary depending on factors such as hair type, scalp condition, routine, lifestyle, environmental factors, and consistent product use.",
          },
          {
            type: "paragraph",
            text: "Product information provided on this website should not be interpreted as medical advice, diagnosis, or treatment.",
          },
          {
            type: "paragraph",
            text: "Customers should carefully read the product instructions, ingredients, warnings, and usage directions before use.",
          },
          {
            type: "paragraph",
            text: "If irritation or an adverse reaction occurs, discontinue use and seek appropriate professional advice.",
          },
        ],
      },
      {
        id: "pricing",
        title: "4.5 Pricing",
        blocks: [
          { type: "paragraph", text: "All product prices displayed on the website are subject to change without prior notice." },
          { type: "paragraph", text: "We reserve the right to correct pricing, product information, or promotional errors." },
          {
            type: "paragraph",
            text: "If an order has been placed at an incorrect price due to a technical or human error, FA ÀURELLE reserves the right to cancel the order and issue an appropriate refund.",
          },
        ],
      },
      {
        id: "orders",
        title: "4.6 Orders",
        blocks: [
          { type: "paragraph", text: "Placing an order on the website constitutes an offer to purchase the selected product." },
          { type: "paragraph", text: "FA ÀURELLE reserves the right to accept, reject, or cancel an order in circumstances including:" },
          {
            type: "list",
            items: [
              "Product unavailability;",
              "Pricing or listing errors;",
              "Payment issues;",
              "Suspected fraudulent activity;",
              "Incorrect customer information;",
              "Delivery limitations; or",
              "Other legitimate operational reasons.",
            ],
          },
          {
            type: "paragraph",
            text: "If an order is cancelled by FA ÀURELLE after payment has been received, the applicable refund will be initiated.",
          },
        ],
      },
      {
        id: "payments",
        title: "4.7 Payments",
        blocks: [
          {
            type: "paragraph",
            text: "Payments are processed through available payment methods and payment service providers displayed at checkout.",
          },
          { type: "paragraph", text: "Customers agree to provide accurate billing and payment information." },
          {
            type: "paragraph",
            text: "FA ÀURELLE does not store sensitive payment information such as complete card details unless required and permitted through authorized payment-processing systems.",
          },
        ],
      },
      {
        id: "intellectual-property",
        title: "4.8 Intellectual Property",
        blocks: [
          { type: "paragraph", text: "All content available on the FA ÀURELLE website, including but not limited to:" },
          {
            type: "list",
            items: [
              "Brand name and logo",
              "Product names",
              "Product photography",
              "Videos",
              "Graphics",
              "Text",
              "Designs",
              "Website layout",
              "Marketing content",
            ],
          },
          {
            type: "paragraph",
            text: "is owned by or licensed to FA ÀURELLE and is protected under applicable intellectual-property laws.",
          },
          {
            type: "paragraph",
            text: "No content may be copied, reproduced, modified, distributed, or commercially exploited without prior written permission.",
          },
        ],
      },
      {
        id: "user-reviews-and-content",
        title: "4.9 User Reviews & Content",
        blocks: [
          {
            type: "paragraph",
            text: "If you submit reviews, testimonials, photographs, videos, or other content to FA ÀURELLE, you represent that you have the right to provide such content.",
          },
          {
            type: "paragraph",
            text: "By submitting content, you grant FA ÀURELLE permission to use, reproduce, display, and publish that content for legitimate marketing and promotional purposes, subject to applicable law.",
          },
        ],
      },
      {
        id: "third-party-links",
        title: "4.10 Third-Party Links",
        blocks: [
          { type: "paragraph", text: "The website may contain links to third-party websites or services." },
          {
            type: "paragraph",
            text: "FA ÀURELLE is not responsible for the availability, content, privacy practices, or policies of third-party websites.",
          },
        ],
      },
      {
        id: "limitation-of-liability",
        title: "4.11 Limitation of Liability",
        blocks: [
          {
            type: "paragraph",
            text: "To the extent permitted by applicable law, FA ÀURELLE shall not be liable for indirect, incidental, special, or consequential losses arising from the use of the website or products.",
          },
          {
            type: "paragraph",
            text: "Nothing in these Terms & Conditions shall exclude or limit any rights or remedies that cannot legally be excluded under applicable law.",
          },
        ],
      },
      {
        id: "privacy",
        title: "4.12 Privacy",
        blocks: [
          { type: "paragraph", text: "Your use of the website is also subject to our Privacy Policy." },
          {
            type: "paragraph",
            text: "We may collect and process information necessary to process orders, provide customer support, communicate with customers, and improve our services, in accordance with applicable law.",
          },
        ],
      },
      {
        id: "changes-to-terms",
        title: "4.13 Changes to Terms",
        blocks: [
          { type: "paragraph", text: "FA ÀURELLE reserves the right to update or modify these Terms & Conditions from time to time." },
          { type: "paragraph", text: "Any updated version will be published on this website with the revised effective date." },
        ],
      },
      {
        id: "governing-law",
        title: "4.14 Governing Law",
        blocks: [
          {
            type: "paragraph",
            text: "These Terms & Conditions shall be governed by and interpreted in accordance with the applicable laws of India.",
          },
          {
            type: "paragraph",
            text: "Any disputes shall be subject to the jurisdiction of the competent courts in India, subject to applicable law.",
          },
        ],
      },
      {
        id: "contact-us",
        title: "4.15 Contact Us",
        blocks: [
          {
            type: "paragraph",
            text: "For questions, complaints, cancellations, returns, replacements, or other customer-support matters, please contact:",
          },
          { type: "paragraph", text: "FA ÀURELLE" },
          { type: "paragraph", text: "Email: support@faaurelle.com" },
        ],
      },
    ],
  },
};

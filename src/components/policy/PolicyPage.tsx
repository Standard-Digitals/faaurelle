import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/closing/SiteFooter";
import { SiteHeader } from "@/components/header/SiteHeader";
import { policies, type PolicyDocument, type PolicyKey } from "./policy-content";
import styles from "./policy-page.module.css";

/*
THESIS: Legal reading should feel considered, not transactional; avoid dense document chrome.
OWN-WORLD: FA ÀURELLE white, warm neutral, fine gold rules, Raleway headings, Roboto copy.
STORY: Identify the policy, confirm its effective date, navigate its clauses, read comfortably.
FIRST VIEWPORT: Shared header above a quiet title field with the document introduction and date.
FORM: Read-mode legal document; verified OrderPlot hero, sticky contents, and narrow article structure.
*/

const supportEmail = "support@faaurelle.com";

function renderPolicyText(text: string): ReactNode {
  const segments = text.split(supportEmail);
  if (segments.length === 1) return text;

  return segments.map((segment, index) => (
    <span key={`${segment}-${index}`}>
      {index > 0 ? <a href={`mailto:${supportEmail}`}>{supportEmail}</a> : null}
      {segment}
    </span>
  ));
}

export function policyMetadata(policyKey: PolicyKey): Metadata {
  const policy = policies[policyKey];
  return {
    title: policy.title,
    description: policy.introduction[0],
  };
}

function PolicyArticle({ policy }: { policy: PolicyDocument }) {
  return (
    <article className={styles.article} aria-label={policy.title}>
      {policy.sections.map((section) => (
        <section key={section.id} id={section.id} className={styles.section}>
          <h2>{section.title}</h2>
          {section.blocks.map((block, blockIndex) =>
            block.type === "paragraph" ? (
              <p key={`${section.id}-paragraph-${blockIndex}`}>
                {renderPolicyText(block.text)}
              </p>
            ) : (
              <ul key={`${section.id}-list-${blockIndex}`}>
                {block.items.map((item) => (
                  <li key={item}>{renderPolicyText(item)}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </article>
  );
}

export function PolicyPage({ policyKey }: { policyKey: PolicyKey }) {
  const policy = policies[policyKey];

  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className={styles.main}>
        <header className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.kicker}>FA ÀURELLE policies</p>
            <h1>{policy.title}</h1>
            <div className={styles.introduction}>
              {policy.introduction.map((paragraph) => (
                <p key={paragraph}>{renderPolicyText(paragraph)}</p>
              ))}
            </div>
            <p className={styles.effectiveDate}>
              <strong>Effective Date:</strong> {policy.effectiveDate}
            </p>
          </div>
        </header>

        <div className={styles.contentGrid}>
          <nav className={styles.contents} aria-label={`${policy.title} sections`}>
            <h2>On this page</h2>
            <ol>
              {policy.sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>{section.title}</a>
                </li>
              ))}
            </ol>
          </nav>
          <PolicyArticle policy={policy} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

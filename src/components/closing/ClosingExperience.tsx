import { InnerCircleSection } from "./InnerCircleSection";
import { TrustDetailsSection } from "./TrustDetailsSection";
import styles from "./ClosingExperience.module.css";

export function ClosingExperience() {
  return (
    <div className={styles.closingExperience}>
      <InnerCircleSection />
      <TrustDetailsSection />
    </div>
  );
}

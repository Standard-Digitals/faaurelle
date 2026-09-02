import { PolicyPage, policyMetadata } from "@/components/policy/PolicyPage";

export const metadata = policyMetadata("termsAndConditions");

export default function TermsAndConditionsPage() {
  return <PolicyPage policyKey="termsAndConditions" />;
}

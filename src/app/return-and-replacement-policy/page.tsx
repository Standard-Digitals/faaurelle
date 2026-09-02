import { PolicyPage, policyMetadata } from "@/components/policy/PolicyPage";

export const metadata = policyMetadata("returnAndReplacement");

export default function ReturnAndReplacementPolicyPage() {
  return <PolicyPage policyKey="returnAndReplacement" />;
}

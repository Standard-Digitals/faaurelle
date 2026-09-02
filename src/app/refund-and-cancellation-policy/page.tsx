import { PolicyPage, policyMetadata } from "@/components/policy/PolicyPage";

export const metadata = policyMetadata("refundAndCancellation");

export default function RefundAndCancellationPolicyPage() {
  return <PolicyPage policyKey="refundAndCancellation" />;
}

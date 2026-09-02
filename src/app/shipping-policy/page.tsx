import { PolicyPage, policyMetadata } from "@/components/policy/PolicyPage";

export const metadata = policyMetadata("shipping");

export default function ShippingPolicyPage() {
  return <PolicyPage policyKey="shipping" />;
}

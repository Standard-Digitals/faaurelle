import { describe, expect, it } from "vitest";
import { serviceabilityAfterFieldChange } from "./serviceability-ui";

describe("checkout serviceability invalidation", () => {
  it("invalidates prior success when the pincode changes", () => {
    expect(serviceabilityAfterFieldChange("serviceable", "pincode")).toBe("not-checked");
  });

  it("retains the pincode-driven result for unrelated address fields", () => {
    expect(serviceabilityAfterFieldChange("serviceable", "city")).toBe("serviceable");
    expect(serviceabilityAfterFieldChange("serviceable", "state")).toBe("serviceable");
  });
});

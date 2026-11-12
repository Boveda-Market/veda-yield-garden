import { describe, expect, it } from "vitest";
import { holdSessionForExternalFlow, isExternalFlowActive } from "@/components/idle-logout";

describe("idle logout external-flow hold", () => {
  it("keeps the session alive while a Coinbase flow runs and releases once", () => {
    const a = holdSessionForExternalFlow(); const b = holdSessionForExternalFlow();
    expect(isExternalFlowActive()).toBe(true);
    a(); a();
    expect(isExternalFlowActive()).toBe(true);
    b();
    expect(isExternalFlowActive()).toBe(false);
  });
});

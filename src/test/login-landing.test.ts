import { describe, it, expect } from "vitest";
import { landingFor } from "@/components/entry-access";
describe("landingFor", () => {
  it("sends users without open vaults to Billetera", () => {
    expect(landingFor({ success: true, data: { positions: [] } } as never)).toBe("/wallet");
    expect(landingFor(null)).toBe("/wallet");
  });
  it("sends users with open vaults to Mi Portafolio", () => {
    expect(landingFor({ success: true, data: { positions: [{}] } } as never)).toBe("/portfolio");
  });
});

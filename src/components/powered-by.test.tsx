import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PoweredBy } from "./powered-by";

describe("PoweredBy", () => {
  it("is plain text by default", () => {
    render(<PoweredBy brand="meteora" />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Meteora")).toBeTruthy();
  });

  it("links to Meteora's main page in a new tab only when asked", () => {
    render(<PoweredBy brand="meteora" asLink />);
    const link = screen.getByRole("link", { name: /Powered by Meteora/i });
    expect(link.getAttribute("href")).toBe("https://meteora.ag");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("keeps brands without a site as plain text", () => {
    render(<PoweredBy brand="polymarket" asLink />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Polymarket")).toBeTruthy();
  });
});

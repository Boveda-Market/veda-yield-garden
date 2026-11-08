import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BovedaSession } from "@/hooks/use-boveda-session";

afterEach(cleanup);

describe("session provider during preview updates", () => {
  it("preserves context identity when the session module is reevaluated", async () => {
    const original = await import("@/hooks/use-boveda-session");
    vi.resetModules();
    const refreshed = await import("@/hooks/use-boveda-session");
    expect(refreshed.BovedaSessionContext).toBe(original.BovedaSessionContext);
  });

  it("reads the mounted provider rather than inventing authentication", async () => {
    const { BovedaSessionContext, useBovedaSession } = await import("@/hooks/use-boveda-session");
    const session: BovedaSession = { ready: true, authenticated: false, userId: null, label: "Invitado", walletAddress: null, error: null, login: vi.fn(), logout: async () => {}, signAndSend: async () => { throw new Error("No signer"); } };
    function Consumer() { const current = useBovedaSession(); return <p>{current.authenticated ? "authenticated" : "signed-out"}</p>; }
    render(<BovedaSessionContext.Provider value={session}><Consumer /></BovedaSessionContext.Provider>);
    expect(screen.getByText("signed-out")).toBeTruthy();
  });
});
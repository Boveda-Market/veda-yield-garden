import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSecuritySettings } from "@/components/account-security";
import { BovedaSessionContext, type AccountSecurity, type BovedaSession } from "@/hooks/use-boveda-session";

afterEach(cleanup);
function mount(overrides: Partial<AccountSecurity> = {}, authenticated = true) {
  const security: AccountSecurity = { email: null, passkeyCount: 0, enrolledMfa: [], availableMfa: ["totp", "passkey"], hasEmbeddedWallet: true, message: null, linkEmail: vi.fn(), updateEmail: vi.fn(), linkPasskey: vi.fn(), manageMfa: vi.fn(async () => {}), ...overrides };
  const session: BovedaSession = { ready: true, authenticated, userId: authenticated ? "did:privy:test" : null, label: "Cuenta", walletAddress: null, error: null, login: vi.fn(), logout: vi.fn(), signAndSend: vi.fn(), security };
  render(<BovedaSessionContext.Provider value={session}><AccountSecuritySettings /></BovedaSessionContext.Provider>);
  return security;
}
describe("verified account security", () => {
  it("links an email without treating a click as verified enrollment", () => {
    const security = mount();
    fireEvent.click(screen.getByRole("button", { name: "Vincular correo" }));
    expect(security.linkEmail).toHaveBeenCalledOnce();
    expect(security.email).toBeNull();
    expect(security.updateEmail).not.toHaveBeenCalled();
  });
  it("updates rather than links an existing verified email", () => {
    const security = mount({ email: "owner@example.com" });
    fireEvent.click(screen.getByRole("button", { name: "Cambiar correo" }));
    expect(security.updateEmail).toHaveBeenCalledOnce();
    expect(security.linkEmail).not.toHaveBeenCalled();
  });
  it("does not enroll 2FA by merely opening the provider dialog", async () => {
    const security = mount();
    fireEvent.click(screen.getByRole("button", { name: "Configurar 2FA" }));
    await waitFor(() => expect(security.manageMfa).toHaveBeenCalledOnce());
    expect(security.enrolledMfa).toEqual([]);
    expect(screen.queryByRole("button", { name: "Administrar 2FA" })).toBeNull();
  });
  it("reflects confirmed provider enrollment", async () => {
    const security = mount({ enrolledMfa: ["totp"] });
    fireEvent.click(screen.getByRole("button", { name: "Administrar 2FA" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Administrar 2FA" })).toBeEnabled());
    expect(security.manageMfa).toHaveBeenCalledOnce();
  });
  it("does not claim MFA can protect an external wallet", () => {
    const security = mount({ hasEmbeddedWallet: false });
    const button = screen.getByRole("button", { name: "Configurar 2FA" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(security.manageMfa).not.toHaveBeenCalled();
  });
  it("does not offer MFA enrollment when the app has no enabled methods", () => {
    const security = mount({ availableMfa: [] });
    fireEvent.click(screen.getByRole("button", { name: "Configurar 2FA" }));
    expect(security.manageMfa).not.toHaveBeenCalled();
  });
  it("opens passkey linking without locally inventing a credential", () => {
    const security = mount();
    fireEvent.click(screen.getByRole("button", { name: "Vincular huella o Face ID" }));
    expect(security.linkPasskey).toHaveBeenCalledOnce();
    expect(security.passkeyCount).toBe(0);
  });
  it("shows Vinculado and only the unlink option when a fingerprint is linked", () => {
    mount({ passkeyCount: 1, unlinkPasskeys: vi.fn(async () => {}) });
    expect(screen.getByText("Vinculado")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Vincular huella o Face ID" })).toBeNull();
    expect(screen.getByRole("button", { name: "Desvincular huella" })).toBeTruthy();
  });
  it("does not expose security settings to a guest", () => {
    mount({}, false);
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("allows already enrolled users to manage MFA even if new enrollment is disabled", async () => {
    const security = mount({ availableMfa: [], enrolledMfa: ["totp"] });
    fireEvent.click(screen.getByRole("button", { name: "Administrar 2FA" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Administrar 2FA" })).toBeEnabled());
    expect(security.manageMfa).toHaveBeenCalledOnce();
  });
  it("handles provider failures without inventing enrollment", async () => {
    const security = mount({ manageMfa: vi.fn(async () => { throw new Error("unavailable"); }) });
    fireEvent.click(screen.getByRole("button", { name: "Configurar 2FA" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(security.enrolledMfa).toEqual([]);
  });
});
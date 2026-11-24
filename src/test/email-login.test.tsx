import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { EmailLoginSheet } from "@/components/email-login-sheet";

vi.mock("@/components/ui/action-sheet", () => ({ ActionSheetContent: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({ value, onChange, onComplete, disabled }: { value: string; onChange: (code: string) => void; onComplete: (code: string) => void; disabled: boolean }) => <input aria-label="test-code" value={value} disabled={disabled} onChange={(event) => { onChange(event.target.value); if (event.target.value.length === 6) onComplete(event.target.value); }} />,
  InputOTPGroup: () => null,
  InputOTPSlot: () => null,
}));
afterEach(cleanup);

const start = async (sendCode = vi.fn().mockResolvedValue(undefined), loginWithCode = vi.fn().mockResolvedValue(undefined)) => {
  const close = vi.fn();
  render(<EmailLoginSheet open onOpenChange={close} sendCode={sendCode} loginWithCode={loginWithCode} />);
  fireEvent.change(screen.getByLabelText("Correo electrónico"), { target: { value: "reader@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Enviar código de acceso" }));
  await screen.findByLabelText("test-code");
  return { sendCode, loginWithCode, close };
};

describe("email login delegates trust to Privy", () => {
  it("sends the address through the official send callback", async () => {
    const { sendCode } = await start();
    expect(sendCode).toHaveBeenCalledExactlyOnceWith({ email: "reader@example.com" });
  });
  it("verifies six digits once, not partial codes, and never grants a local session", async () => {
    const { loginWithCode, close } = await start();
    fireEvent.change(screen.getByLabelText("test-code"), { target: { value: "12345" } });
    expect(loginWithCode).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("test-code"), { target: { value: "123456" } });
    await waitFor(() => expect(loginWithCode).toHaveBeenCalledExactlyOnceWith({ code: "123456" }));
    expect(close).not.toHaveBeenCalled();
  });
  it("permits retry after Privy rejects a code", async () => {
    const loginWithCode = vi.fn().mockRejectedValueOnce(new Error("invalid")).mockResolvedValueOnce(undefined);
    await start(vi.fn().mockResolvedValue(undefined), loginWithCode);
    fireEvent.change(screen.getByLabelText("test-code"), { target: { value: "111111" } });
    await waitFor(() => expect(screen.getByLabelText("test-code")).not.toBeDisabled());
    fireEvent.change(screen.getByLabelText("test-code"), { target: { value: "222222" } });
    await waitFor(() => expect(loginWithCode).toHaveBeenNthCalledWith(2, { code: "222222" }));
  });
});
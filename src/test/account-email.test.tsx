import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AccountSettings } from "@/components/account-settings";

const { submitEmail } = vi.hoisted(() => ({ submitEmail: vi.fn(async () => ({ success: true })) }));
vi.mock("@tanstack/react-start", () => ({ useServerFn: (fn: unknown) => fn }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span> }));
vi.mock("@/hooks/use-boveda-session", () => ({ useBovedaSession: () => ({ userId: "did:privy:test", label: "Cuenta", getAccessToken: async () => "test-token" }) }));
vi.mock("@/lib/account-profile.functions", () => ({ getAccountProfile: async () => ({ success: true, profile: { displayName: "", avatar: "leaf" } }), saveAccountProfile: vi.fn() }));
vi.mock("@/lib/email-signup.functions", () => ({ submitEmail }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("email capture from account", () => {
  it("does not submit an email without explicit consent", async () => {
    render(<AccountSettings />);
    const email = screen.getByLabelText("Email");
    fireEvent.change(email, { target: { value: "account@example.com" } });
    const form = email.closest("form");
    if (!form) throw new Error("Missing email form");
    fireEvent.submit(form);
    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(submitEmail).not.toHaveBeenCalled();
  });

  it("submits the normalized email and explicit consent through the shared collection", async () => {
    render(<AccountSettings />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "Account@Example.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Registrar mi email" }));
    await waitFor(() => expect(submitEmail).toHaveBeenCalledWith({ data: { email: "account@example.com", consent: true, website: "" } }));
    expect(await screen.findByText("Tu email quedó registrado.")).toBeTruthy();
  });
});
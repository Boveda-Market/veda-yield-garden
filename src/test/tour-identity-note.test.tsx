import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The tour's sign-in sheet and install prompt are irrelevant to the disclosure under test.
vi.mock("@/components/login-nudge", () => ({ LoginSheet: () => null }));
vi.mock("@/components/install-app", () => ({ InstallAppButton: () => null }));
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children, useRouter: () => null }));

import { AppTour, SofiaTour } from "@/components/app-tour";
import { en } from "@/i18n/en";

const NOTE = "Sujeto a verificación de identidad.";
const next = () => fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));

afterEach(cleanup);

/** Adding funds and withdrawing only work after the payment provider checks who the person is,
 *  so the wallet step of both tours must say so instead of promising free movement of money. */
describe("identity-verification disclosure in the tours", () => {
  it("keeps the note off the steps that do not move money", () => {
    render(<AppTour open onOpenChange={vi.fn()} />);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it("shows the note on the guided-tour wallet step and drops it afterwards", () => {
    render(<AppTour open onOpenChange={vi.fn()} />);
    act(() => { next(); next(); next(); });
    expect(screen.getByText("Entras y sales solo en dólares")).toBeInTheDocument();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
    act(next);
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it("shows the same note in Sofía's wallet station during the flying tour", async () => {
    render(<SofiaTour open onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("Sofía", { exact: false })).toBeInTheDocument(), { timeout: 4000 });
    for (let i = 0; i < 3; i++) {
      await waitFor(() => expect(screen.getByRole("button", { name: "Siguiente" })).toBeEnabled(), { timeout: 4000 });
      act(next);
    }
    await waitFor(() => expect(screen.getByText(NOTE)).toBeInTheDocument(), { timeout: 4000 });
  });

  it("ships the English twin of the note", () => {
    expect(en[NOTE]).toBe("Subject to identity verification.");
  });
});

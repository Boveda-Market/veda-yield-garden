import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: unknown }) => children, useRouter: () => null }));

import { Dialog } from "@/components/ui/dialog";
import { ActionSheetContent } from "@/components/ui/action-sheet";
import { ActionSuccess } from "@/components/action-success";

// The sheet already has one close button; the receipt must not add a second one on top of it.
it("shows exactly one close button on the deposit receipt", () => {
  render(
    <Dialog open onOpenChange={vi.fn()}>
      <ActionSheetContent closeLabel="Cerrar">
        <ActionSuccess
          title="¡Depósito exitoso!"
          body="Tu bóveda ya está generando intereses."
          amount={{ value: "20.00", unit: "$" }}
          details={[{ label: "Operación", value: "Depósito en bóveda" }]}
          signature={null}
          onClose={vi.fn()}
        />
      </ActionSheetContent>
    </Dialog>,
  );

  const closes = screen.getAllByRole("button", { name: /cerrar|close/i });
  expect(closes).toHaveLength(1);
});

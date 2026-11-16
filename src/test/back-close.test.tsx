import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { installBackClose } from "@/lib/back-close";

afterEach(cleanup);
const wait = (ms = 80) => act(() => new Promise((r) => setTimeout(r, ms)));

function Card() {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)}>abrir</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogTitle>Tarjeta</DialogTitle><DialogDescription>x</DialogDescription></DialogContent></Dialog></>;
}

describe("phone back button with an open card", () => {
  it("closes the card and keeps the same page", async () => {
    installBackClose();
    let routerSawPop = 0;
    window.addEventListener("popstate", () => { routerSawPop++; });
    const start = window.history.length;
    render(<Card />);
    fireEvent.click(screen.getByText("abrir"));
    await wait();
    expect(screen.queryByText("Tarjeta")).toBeTruthy();
    expect(window.history.length).toBe(start + 1);
    window.history.back();
    await wait(200);
    expect(screen.queryByText("Tarjeta")).toBeNull();
    expect(routerSawPop).toBe(0);
  });

  it("closing with the X removes the extra back step", async () => {
    render(<Card />);
    fireEvent.click(screen.getByText("abrir"));
    await wait();
    const marked = (window.history.state as Record<string, unknown> | null)?.["__bovedaSheet"];
    expect(marked).toBeDefined();
    fireEvent.click(screen.getByText("Close").closest("button")!);
    await wait(200);
    expect((window.history.state as Record<string, unknown> | null)?.["__bovedaSheet"]).toBeUndefined();
  });
});

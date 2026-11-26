import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHideSofia } from "@/lib/preferences";

const KEY = "boveda:hide-sofia";

function Toggle() {
  const [hidden, setHidden] = useHideSofia();
  return <button type="button" aria-pressed={hidden} onClick={() => setHidden(!hidden)}>{hidden ? "oculta" : "visible"}</button>;
}

describe("hiding Sofía's help button", () => {
  afterEach(() => { cleanup(); localStorage.removeItem(KEY); });

  it("starts visible and remembers the choice on this device", () => {
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveTextContent("visible");
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.getItem(KEY)).toBe("1");
    expect(screen.getByRole("button")).toHaveTextContent("oculta");
  });

  it("stays hidden after a reload and comes back when shown again", () => {
    localStorage.setItem(KEY, "1");
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveTextContent("oculta");
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.getItem(KEY)).toBe("0");
    cleanup();
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveTextContent("visible");
  });
});

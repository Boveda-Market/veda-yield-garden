import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHideSofia, useTourBannerDismissed } from "@/lib/preferences";
import { SOFIA_REST_KEY, TOUR_BANNER_KEY } from "@/lib/sofia-controls";

const KEY = "boveda:hide-sofia-session";

function Toggle() {
  const [hidden, setHidden] = useHideSofia();
  return <button type="button" aria-pressed={hidden} onClick={() => setHidden(!hidden)}>{hidden ? "oculta" : "visible"}</button>;
}
function BannerToggle() {
  const [hidden, dismiss] = useTourBannerDismissed();
  return <button type="button" aria-pressed={hidden} onClick={dismiss}>dismiss</button>;
}

describe("hiding Sofía's help button", () => {
  afterEach(() => { cleanup(); sessionStorage.removeItem(KEY); localStorage.removeItem("boveda:hide-sofia"); localStorage.removeItem(SOFIA_REST_KEY); localStorage.removeItem(TOUR_BANNER_KEY); });

  it("hides only in session storage, never permanently", () => {
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveTextContent("visible");
    fireEvent.click(screen.getByRole("button"));
    expect(sessionStorage.getItem(KEY)).toBe("1");
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.getByRole("button")).toHaveTextContent("oculta");
  });

  it("stays hidden after a reload and comes back when shown again", () => {
    sessionStorage.setItem(KEY, "1");
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveTextContent("oculta");
    fireEvent.click(screen.getByRole("button"));
    expect(sessionStorage.getItem(KEY)).toBeNull();
    cleanup();
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveTextContent("visible");
  });

  it("returns in a new session even if the old permanent flag was set", () => {
    localStorage.setItem("boveda:hide-sofia", "1");
    sessionStorage.setItem(KEY, "1");
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    cleanup();
    sessionStorage.clear();
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps the floating button hidden in a new session during its rest", () => {
    localStorage.setItem(SOFIA_REST_KEY, JSON.stringify({ closes: 0, until: Date.now() + 604800000 }));
    render(<Toggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("remembers dismissal of the welcome banner across remounts", () => {
    render(<BannerToggle />);
    fireEvent.click(screen.getByRole("button"));
    expect(localStorage.getItem(TOUR_BANNER_KEY)).toBe("1");
    cleanup();
    render(<BannerToggle />);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });
});

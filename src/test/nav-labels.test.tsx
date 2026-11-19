import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

// Section names the user chose: the pie-chart tab is «Mi Portafolio» and the wallet tab is «Billetera».
vi.mock("@/hooks/use-boveda-session", async () => {
  const { createContext } = await import("react");
  return { BovedaSessionContext: createContext(null) };
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: unknown }) => children,
  useRouter: () => null,
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
}));
vi.mock("@/components/autopilot-toggle", () => ({ AutopilotDefault: () => null, useAutopilot: () => ({ status: null }) }));
vi.mock("@/components/news-bell", () => ({ NewsBell: () => null }));
vi.mock("@/components/security-why", () => ({ SecurityWhyDialog: () => null }));
vi.mock("@/components/install-app", () => ({ InstallAppButton: () => null }));
vi.mock("@/components/language-menu", () => ({ LanguageMenu: () => null }));
vi.mock("@/components/theme-toggle", () => ({ ThemeToggle: () => null }));
vi.mock("@/components/system-status", () => ({ StatusDot: () => null, useSystemState: () => "ok" }));
vi.mock("@/components/suggestion-box", () => ({ SuggestionBox: () => null }));
vi.mock("@/lib/affiliate", () => ({ AFFILIATE_PAYOUT_WALLET: "payout-wallet" }));

import { BottomNav } from "@/components/app-nav";

afterEach(cleanup);

it("names the tabs Mi Portafolio and Billetera", () => {
  render(<BottomNav active="portfolio" guest={false} onSelect={() => {}} />);

  expect(screen.getByText("Mi Portafolio")).toBeTruthy();
  expect(screen.getByText("Billetera")).toBeTruthy();
  expect(screen.queryByText("Ganancias")).toBeNull();
  expect(screen.queryByText("Mi Billetera")).toBeNull();
});

it("keeps the wallet tab away from guests", () => {
  render(<BottomNav active="vaults" guest onSelect={() => {}} />);

  expect(screen.getByText("Mi Portafolio")).toBeTruthy();
  expect(screen.queryByText("Billetera")).toBeNull();
});

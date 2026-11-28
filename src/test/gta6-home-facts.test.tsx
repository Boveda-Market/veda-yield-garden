import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The live price chart below the facts needs a query client; the facts themselves are static copy.
vi.mock("@/components/visitor-btc-chart", () => ({ VisitorBtcChart: () => null }));

import { ThemeSections } from "@/components/home-sections";
import { en } from "@/i18n/en";

afterEach(cleanup);

/** The GTA6 home must state plainly what the coin is: community-run, unlisted on major
 *  exchanges, fully DeFi, with many holders and big past runs — without promising a repeat. */
describe("GTA6 home coin facts", () => {
  it("states the coin is community-run, unverified on major exchanges and 100% DeFi", () => {
    render(<ThemeSections theme="gta6" />);
    const section = screen.getByLabelText("Qué es GTA6 Coin, sin adornos");
    expect(section).toHaveTextContent("Moneda comunitaria");
    expect(section).toHaveTextContent("No verificada en los grandes exchanges");
    expect(section).toHaveTextContent("100% DeFi");
  });

  it("credits the holder base and past runs while refusing to promise a repeat", () => {
    render(<ThemeSections theme="gta6" />);
    const section = screen.getByLabelText("Qué es GTA6 Coin, sin adornos");
    expect(section).toHaveTextContent("Muchos dueños y corridas fuertes");
    expect(section).toHaveTextContent("corridas masivas");
    expect(section).toHaveTextContent("el historial no promete nada");
  });

  it("keeps the honest framing free of network jargon and price promises", () => {
    render(<ThemeSections theme="gta6" />);
    const text = screen.getByLabelText("Qué es GTA6 Coin, sin adornos").textContent ?? "";
    expect(text).toMatch(/No hay una empresa, un fondo ni una figura pública que la respalde/);
    expect(text).not.toMatch(/Solana|Meteora|USDC|APR|garantiz/i);
  });

  it("shows the facts only on the GTA6 home, not on the other versions", () => {
    const { unmount } = render(<ThemeSections theme="gta6" />);
    expect(screen.queryByLabelText("Qué es GTA6 Coin, sin adornos")).toBeTruthy();
    unmount();
    for (const theme of ["trump", "doble", undefined]) {
      render(<ThemeSections theme={theme} />);
      expect(screen.queryByLabelText("Qué es GTA6 Coin, sin adornos")).toBeNull();
      cleanup();
    }
  });

  it("carries an English twin for every coin-fact string", () => {
    for (const key of [
      "Qué es GTA6 Coin, sin adornos",
      "Antes de depositar, conviene tener claro qué hay detrás de la moneda.",
      "Moneda comunitaria",
      "La creó y la mueve una comunidad. No hay una empresa, un fondo ni una figura pública que la respalde.",
      "No verificada en los grandes exchanges",
      "No aparece listada ni verificada en los grandes exchanges. Se compra y se vende solo en mercados descentralizados.",
      "100% DeFi",
      "Vive por completo en mercados descentralizados: ahí se forma su precio y ahí trabaja tu bóveda.",
      "Muchos dueños y corridas fuertes",
      "Tiene una base amplia de holders y ha tenido corridas masivas. También bajones igual de bruscos: el historial no promete nada.",
      "Justo por eso tiene sentido cobrar comisiones en vez de apostar al precio: la bóveda no necesita que la moneda suba para generar intereses.",
    ]) expect(en[key]?.trim(), key).toBeTruthy();
  });
});

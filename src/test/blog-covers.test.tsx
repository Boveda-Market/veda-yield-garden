import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HERO_BY_PATH, heroCover } from "@/components/blog-hero";
import { Callout, Checklist, ProsCons } from "@/components/blog-visuals";
import { POSTS, postHead } from "@/components/blog-layout";

afterEach(cleanup);

describe("blog photo covers", () => {
  it("gives every post a realistic photo cover with alt and caption in both languages", () => {
    for (const p of POSTS) {
      const cover = heroCover(p.to);
      expect(cover, `missing cover for ${p.to}`).not.toBeNull();
      expect(cover!.url.startsWith("/__l5e/assets-v1/"), `${p.to} cover url`).toBe(true);
      for (const text of [cover!.altEs, cover!.altEn, cover!.capEs, cover!.capEn]) {
        expect(text.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("maps covers only through the Spanish path and returns null elsewhere", () => {
    expect(Object.keys(HERO_BY_PATH).every((k) => k.startsWith("/blog/"))).toBe(true);
    expect(heroCover("/en/blog/bitcoin-atms-expensive-risky")).toBeNull();
    expect(heroCover("/blog")).toBeNull();
  });

  it("puts the cover in the post head as an absolute og:image", () => {
    type Meta = { property?: string; name?: string; title?: string; content?: string };
    const head: { meta: Meta[] } = postHead("es", "/blog/bitcoin-atms-forma-cara-riesgosa");
    const img = head.meta.find((m) => m.property === "og:image");
    expect(img?.content).toMatch(/^https?:\/\/[^/]+\/__l5e\/assets-v1\//);
    expect(head.meta.find((m) => m.name === "twitter:card")?.content).toBe("summary_large_image");
    const en: { meta: Meta[] } = postHead("en", "/blog/bitcoin-atms-forma-cara-riesgosa");
    expect(en.meta.find((m) => m.property === "og:image:alt")?.content).toContain("Bitcoin ATM");
  });
});

describe("blog scannability visuals", () => {
  it("shows pros and cons as two separate lists", () => {
    render(<ProsCons prosTitle="A favor" consTitle="En contra" pros={["Convierte efectivo en minutos"]} cons={["Pagas 20% de más"]} />);
    expect(screen.getByText("A favor")).toBeTruthy();
    expect(screen.getByText("En contra")).toBeTruthy();
    expect(screen.getByText("Convierte efectivo en minutos")).toBeTruthy();
    expect(screen.getByText("Pagas 20% de más")).toBeTruthy();
  });

  it("numbers a checklist and highlights a callout", () => {
    render(<><Checklist title="Revisión rápida" items={["Fuente original", "Mira la fecha"]} /><Callout>Cuelga la llamada.</Callout></>);
    expect(screen.getByText("Revisión rápida")).toBeTruthy();
    expect(screen.getByText("1")).toBeTruthy();
    expect(screen.getByText("2")).toBeTruthy();
    expect(screen.getByText("Cuelga la llamada.")).toBeTruthy();
  });
});

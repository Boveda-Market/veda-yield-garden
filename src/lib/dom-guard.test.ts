// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { installDomGuard } from "./dom-guard";

installDomGuard();

describe("DOM guard against translator-moved nodes", () => {
  it("removing a text node that a translator already detached does not throw", () => {
    const p = document.createElement("p");
    const text = document.createTextNode("Hola");
    p.appendChild(text);
    const font = document.createElement("font");
    font.textContent = "Hello";
    p.replaceChild(font, text); // what Google Translate does
    expect(() => p.removeChild(text)).not.toThrow();
    expect(p.textContent).toBe("Hello");
  });

  it("removing a node moved into a wrapper removes it from its new parent", () => {
    const p = document.createElement("p");
    const text = document.createTextNode("Hola");
    const font = document.createElement("font");
    p.appendChild(font);
    font.appendChild(text);
    p.removeChild(text);
    expect(font.childNodes.length).toBe(0);
  });

  it("insertBefore with a reference moved elsewhere still inserts the node", () => {
    const p = document.createElement("p");
    const ref = document.createTextNode("x");
    document.createElement("div").appendChild(ref);
    const span = document.createElement("span");
    expect(() => p.insertBefore(span, ref)).not.toThrow();
    expect(span.parentNode).toBe(p);
  });
});

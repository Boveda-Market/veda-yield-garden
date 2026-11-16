import { useEffect, type RefObject } from "react";

/**
 * Phone back button closes the open card instead of leaving the screen.
 * Each open sheet/dialog adds one silent history entry (same URL, same router state + a marker).
 * Back pops that entry: we close the card and hide the event from the router, so the page
 * underneath never changes. Closing with X / swipe / buttons removes the entry again.
 * Must be installed before the router is created so our popstate listener runs first and the
 * raw pushState (not the router's patched one) is captured.
 */
type Entry = { id: number; close: () => void; popped: boolean };
const KEY = "__bovedaSheet";
const stack: Entry[] = [];
let seq = 0;
let skip = 0;
let rawPush: History["pushState"] | null = null;
let rawReplace: History["replaceState"] | null = null;

const markerOf = (state: unknown) => (state && typeof state === "object" ? (state as Record<string, unknown>)[KEY] : undefined) as number | undefined;
const pushEntry = (id: number) => {
  const current = markerOf(window.history.state);
  // Reuse a leftover entry of a card that just unmounted (re-mounts, quick close→open) instead of stacking extra back presses.
  const reuse = current !== undefined && !stack.some((e) => e.id === current);
  (reuse ? rawReplace : rawPush)?.call(window.history, { ...(window.history.state ?? {}), [KEY]: id }, "", window.location.href);
};

export function installBackClose() {
  if (rawPush || typeof window === "undefined") return;
  rawPush = window.history.pushState;
  rawReplace = window.history.replaceState;
  window.addEventListener("popstate", (e) => {
    if (skip > 0) { skip--; e.stopImmediatePropagation(); return; }
    const top = stack[stack.length - 1];
    const marker = markerOf(e.state);
    if (top && marker !== top.id) {
      e.stopImmediatePropagation();
      top.popped = true;
      top.close();
      // A card that refuses to close (operation in progress) keeps guarding the back button.
      setTimeout(() => { if (stack.includes(top)) { top.popped = false; pushEntry(top.id); } }, 60);
      return;
    }
    // Leftover entry from a card that closed by navigating away: step over it.
    if (!top && marker !== undefined) { e.stopImmediatePropagation(); window.history.back(); }
  });
}

/** Render inside the dialog Content (mounted only while open), next to its Close button. */
export function BackToClose({ closeRef }: { closeRef: RefObject<HTMLElement | null> }) {
  useBackToClose(closeRef);
  return null;
}

function useBackToClose(closeRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!rawPush) return;
    const entry: Entry = { id: ++seq, close: () => closeRef.current?.click(), popped: false };
    stack.push(entry);
    pushEntry(entry.id);
    return () => {
      const i = stack.indexOf(entry);
      if (i >= 0) stack.splice(i, 1);
      if (entry.popped) return;
      // Deferred: if the close also navigated (e.g. «Listo» → Portafolio), the router's new entry is on top and we leave history alone.
      setTimeout(() => { if (markerOf(window.history.state) === entry.id) { skip++; window.history.back(); } }, 0);
    };
  }, [closeRef]);
}

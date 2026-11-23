import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { hasMoreBelow, scrollHintKey, showArrow } from "@/lib/scroll-hint";

/** Phone-only subtle hint that the screen continues: bottom fade until the end, bouncing arrow on the first visits. */
export function ScrollHint({ view }: { view: string }) {
  const [more, setMore] = useState(false);
  const [arrow, setArrow] = useState(false);
  useEffect(() => {
    let seen = 0;
    try { seen = Number(localStorage.getItem(scrollHintKey(view))) || 0; localStorage.setItem(scrollHintKey(view), String(seen + 1)); } catch { /* storage blocked */ }
    setArrow(showArrow(seen));
    const check = () => setMore(hasMoreBelow(window.scrollY, window.innerHeight, document.documentElement.scrollHeight));
    const onScroll = () => { if (window.scrollY > 40) setArrow(false); check(); };
    check();
    const ro = new ResizeObserver(check); ro.observe(document.body);
    window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", check);
    return () => { ro.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", check); };
  }, [view]);
  return <div aria-hidden className={`pointer-events-none fixed inset-x-0 z-30 flex h-16 items-end justify-center bg-gradient-to-t from-background to-transparent pb-1 transition-opacity duration-300 md:hidden ${more ? "opacity-100" : "opacity-0"}`} style={{ bottom: "calc(3.75rem + env(safe-area-inset-bottom))" }}>
    {arrow && <ChevronDown size={22} className="animate-bounce text-muted-foreground [animation-iteration-count:3]" />}
  </div>;
}

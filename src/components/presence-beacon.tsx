import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { presencePing } from "@/lib/admin-users.functions";
import { PING_MS } from "@/lib/admin-users";
import { currentPrivyToken } from "@/lib/privy-token";

const KEY = "boveda:visitor-id";
function visitorId() {
  try { let v = localStorage.getItem(KEY); if (!v || !/^[0-9a-f-]{36}$/i.test(v)) { v = crypto.randomUUID(); localStorage.setItem(KEY, v); } return v; } catch { return crypto.randomUUID(); }
}
const screenOf = (path: string) => (path.split("/").filter(Boolean)[0] ?? "inicio").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);

/** Sends a light «app is open» heartbeat every minute while the tab is visible, so the Control Panel can show who is connected. */
export function PresenceBeacon() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    let last = 0;
    const ping = async (force = false) => {
      if (document.visibilityState !== "visible" || (!force && Date.now() - last < PING_MS - 5_000)) return;
      last = Date.now();
      const token = await currentPrivyToken([]).catch(() => null);
      void presencePing({ data: { visitorId: visitorId(), screen: screenOf(window.location.pathname), ...(token ? { token } : {}) } }).catch(() => {});
    };
    void ping(true);
    const id = window.setInterval(() => void ping(), PING_MS);
    const onVis = () => void ping();
    document.addEventListener("visibilitychange", onVis);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", onVis); };
  }, [pathname]);
  return null;
}

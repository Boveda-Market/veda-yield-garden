import { Suspense, useEffect, type ReactNode } from "react";
import { lazyWithReload } from "@/lib/lazy-reload";
import { BovedaSessionContext } from "@/hooks/use-boveda-session";
import { requestSessionEngine, useHostedSession, useSessionEngineWanted } from "@/lib/session-host";

const PrivyAccess = lazyWithReload(() => import("./privy-access"));

/** Mounted once in the root: loads the secure-access engine the first time a screen needs it and never unmounts it. */
export function SessionEngineHost() {
  const wanted = useSessionEngineWanted();
  if (!wanted) return null;
  return <Suspense fallback={null}><PrivyAccess>{null}</PrivyAccess></Suspense>;
}

/** Gives a screen the shared session; shows the fallback only until the engine first reports. */
export function HostedSession({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  useEffect(() => { requestSessionEngine(); }, []);
  const session = useHostedSession();
  if (!session) return <>{fallback}</>;
  return <BovedaSessionContext.Provider value={session}>{children}</BovedaSessionContext.Provider>;
}

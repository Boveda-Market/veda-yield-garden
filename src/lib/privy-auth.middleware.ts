import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { currentPrivyToken } from "@/lib/privy-token";

const HEADER = "x-boveda-auth";

// Requires a verified Privy session (ES256 JWT checked against Privy JWKS) before a
// server function may spend the private chain-provider quota.
export const requirePrivyAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const token = await currentPrivyToken();
    return next({ headers: token ? { [HEADER]: token } : {} });
  })
  .server(async ({ next }) => {
    const token = getRequestHeader(HEADER);
    if (!token || token.length < 20 || token.length > 12000) throw new Error("Inicia sesión para continuar.");
    let privyUserId: string;
    try {
      const { verifiedPrivyId } = await import("@/lib/account-profile.server");
      privyUserId = await verifiedPrivyId(token);
    } catch {
      throw new Error("Inicia sesión para continuar.");
    }
    return next({ context: { privyUserId } });
  });

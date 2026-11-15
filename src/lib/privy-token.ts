// Browser-side holder for the mounted Privy session's token getter. The lazy Privy
// provider registers it; server-function middleware reads it to prove sign-in.
// It never stores the token itself.
type TokenGetter = () => Promise<string | null>;

let getter: TokenGetter | null = null;

export function setPrivyTokenGetter(next: TokenGetter | null) {
  getter = next;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Right after sign-in the session token can be briefly unavailable; while signed in,
 * retry for a few seconds instead of sending an unauthenticated request that fails
 * and leaves the screen empty until a manual refresh. Signed out returns null at once.
 */
export async function currentPrivyToken(delays: readonly number[] = [250, 500, 750, 1000, 1500]): Promise<string | null> {
  for (let i = 0; ; i++) {
    const current = getter;
    if (!current) return null;
    try {
      const token = await current();
      if (token) return token;
    } catch { /* retry below */ }
    if (i >= delays.length) return null;
    await wait(delays[i]!);
  }
}

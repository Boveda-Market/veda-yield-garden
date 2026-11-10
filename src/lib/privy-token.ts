// Browser-side holder for the mounted Privy session's token getter. The lazy Privy
// provider registers it; server-function middleware reads it to prove sign-in.
// It never stores the token itself.
type TokenGetter = () => Promise<string | null>;

let getter: TokenGetter | null = null;

export function setPrivyTokenGetter(next: TokenGetter | null) {
  getter = next;
}

export async function currentPrivyToken(): Promise<string | null> {
  if (!getter) return null;
  try {
    return await getter();
  } catch {
    return null;
  }
}

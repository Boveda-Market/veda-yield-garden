import * as BufferModule from "buffer";

// Wallet libraries used by Privy's Solana signing path call the Node global
// `Buffer` directly. Browsers lack it, so install it before signing.
//
// Exported as a function and called explicitly so a production build can never
// tree-shake it away. It must never throw: a failure here would stop the whole
// page from loading (sign-in stuck on "Preparando acceso…").
type BufferCtor = typeof import("buffer").Buffer & { Buffer?: unknown };

function resolveBuffer(): BufferCtor | undefined {
  const mod = BufferModule as unknown as { Buffer?: BufferCtor; default?: { Buffer?: BufferCtor } | BufferCtor } | undefined;
  if (!mod) return undefined;
  if (mod.Buffer) return mod.Buffer;
  const d = mod.default as { Buffer?: BufferCtor } | undefined;
  return d?.Buffer ?? (typeof d === "function" ? (d as unknown as BufferCtor) : undefined);
}

export function installBufferPolyfill(): BufferCtor | undefined {
  try {
    const scope = globalThis as typeof globalThis & { Buffer?: BufferCtor };
    if (!scope.Buffer) {
      const B = resolveBuffer();
      if (B) scope.Buffer = B;
    }
    const B = scope.Buffer;
    if (B && !B.Buffer) B.Buffer = B;
    return B;
  } catch {
    return undefined;
  }
}

installBufferPolyfill();

import { Buffer } from "buffer";

// Wallet libraries used by Privy's Solana signing path call the Node global
// `Buffer` directly. Browsers lack it, so signing failed with
// "Cannot read properties of undefined (reading 'from')". Install it once,
// before those libraries are evaluated.
//
// Exported as a function and called explicitly (not just a bare import) so a
// production build can never tree-shake it away; package.json also lists this
// file under "sideEffects".
export function installBufferPolyfill(): typeof Buffer {
  const scope = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
  if (!scope.Buffer) scope.Buffer = Buffer;
  // Some CommonJS deps read require("buffer").Buffer; make the nested alias exist too.
  const B = scope.Buffer as typeof Buffer & { Buffer?: typeof Buffer };
  if (!B.Buffer) B.Buffer = B;
  return scope.Buffer;
}

installBufferPolyfill();

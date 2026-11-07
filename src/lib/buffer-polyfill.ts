import { Buffer } from "buffer";

// Wallet libraries used by Privy's Solana signing path call the Node global
// `Buffer` directly. Browsers lack it, so signing failed with
// "Cannot read properties of undefined (reading 'from')". Install it once,
// before those libraries are evaluated.
const scope = globalThis as typeof globalThis & { Buffer?: typeof Buffer };
if (!scope.Buffer) scope.Buffer = Buffer;

export {};

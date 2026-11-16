import { p256 } from "@noble/curves/nist.js";
import { sha256 } from "@noble/hashes/sha2.js";
export { AUTOPILOT_SIGNER_ID, AUTOPILOT_POLICY_ID, AUTOPILOT_PROGRAMS } from "@/lib/autopilot";

/** Public Privy app id (same as the client provider). */
export const PRIVY_APP_ID = "cmw6ftcf900ge0hl0jyw3rc75";

const N = p256.Point.CURVE().n;

/** P-256 private scalar derived from the random seed: sha256(seed) reduced into [1, n-1]. */
export function autopilotPrivateKey(seed: string): Uint8Array {
  const h = sha256(new TextEncoder().encode(seed));
  let v = 0n;
  for (const b of h) v = (v << 8n) | BigInt(b);
  v = (v % (N - 1n)) + 1n;
  const out = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) { out[i] = Number(v & 0xffn); v >>= 8n; }
  return out;
}

const SPKI_P256 = "3059301306072a8648ce3d020106082a8648ce3d030107034200";
const toB64 = (u: Uint8Array) => { let s = ""; for (const b of u) s += String.fromCharCode(b); return btoa(s); };

/** SPKI DER (base64) public key, the format Privy key quorums accept. */
export function autopilotPublicKey(seed: string): string {
  const pub = p256.getPublicKey(autopilotPrivateKey(seed), false);
  const prefix = Uint8Array.from(SPKI_P256.match(/../g)!.map((h) => parseInt(h, 16)));
  const spki = new Uint8Array(prefix.length + pub.length); spki.set(prefix); spki.set(pub, prefix.length);
  return toB64(spki);
}

/** RFC 8785 canonical JSON for the value types Privy request bodies use (no non-integer floats). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isInteger(value)) throw new Error("Non-integer number in signed payload");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
}

/** privy-authorization-signature header: base64 DER ECDSA P-256/SHA-256 over the canonical request payload. */
export function authorizationSignature(seed: string, url: string, body: unknown, headers: Record<string, string> = { "privy-app-id": PRIVY_APP_ID }): string {
  const payload = canonicalJson({ version: 1, method: "POST", url, body, headers });
  const sig = p256.sign(new TextEncoder().encode(payload), autopilotPrivateKey(seed), { prehash: true, format: "der" });
  return toB64(sig);
}

/** Privy wallet RPC call (e.g. Solana signTransaction) authorized by the Autopilot signer. */
export async function privyWalletRpc(walletId: string, body: Record<string, unknown>, creds: { appSecret: string; seed: string }) {
  const url = `https://api.privy.io/v1/wallets/${encodeURIComponent(walletId)}/rpc`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${PRIVY_APP_ID}:${creds.appSecret}`)}`, "privy-app-id": PRIVY_APP_ID, "Content-Type": "application/json",
      "privy-authorization-signature": authorizationSignature(creds.seed, url, body),
    },
    body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { data?: { signed_transaction?: string }; error?: string; message?: string };
  if (!res.ok) throw new Error(`Privy ${res.status}: ${json.error ?? json.message ?? "error"}`);
  return json;
}

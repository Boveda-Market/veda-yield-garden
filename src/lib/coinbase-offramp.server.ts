import { ed25519 } from "@noble/curves/ed25519.js";
import { importPKCS8, SignJWT } from "jose";

const HOST = "api.developer.coinbase.com";
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const randomHex = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (x) => x.toString(16).padStart(2, "0")).join("");

async function cdpJwt(method: string, path: string) {
  const keyId = process.env.CDP_API_KEY_ID;
  const secret = process.env.CDP_API_KEY_SECRET?.replace(/\\n/g, "\n").trim();
  if (!keyId || !secret) throw new Error("Coinbase no está configurado.");
  const now = Math.floor(Date.now() / 1000);
  const payload = { sub: keyId, iss: "cdp", nbf: now, exp: now + 120, uri: `${method} ${HOST}${path}` };
  if (secret.includes("BEGIN")) {
    if (secret.includes("EC PRIVATE KEY")) throw new Error("Usa una clave Ed25519 o PKCS8 de Coinbase.");
    const key = await importPKCS8(secret, "ES256");
    return new SignJWT(payload).setProtectedHeader({ alg: "ES256", kid: keyId, typ: "JWT", nonce: randomHex() } as never).sign(key);
  }
  const raw = fromB64(secret);
  if (raw.length !== 64 && raw.length !== 32) throw new Error("Clave de Coinbase no válida.");
  const header = { alg: "EdDSA", kid: keyId, typ: "JWT", nonce: randomHex() };
  const enc = new TextEncoder();
  const input = `${b64url(enc.encode(JSON.stringify(header)))}.${b64url(enc.encode(JSON.stringify(payload)))}`;
  const sig = ed25519.sign(enc.encode(input), raw.slice(0, 32));
  return `${input}.${b64url(sig)}`;
}

async function cdp(method: "GET" | "POST", path: string, body?: unknown) {
  const res = await fetch(`https://${HOST}${path}`, { method, headers: { Authorization: `Bearer ${await cdpJwt(method, path.split("?")[0]!)}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : null });
  const text = await res.text();
  if (!res.ok) { console.error("[coinbase]", res.status, text.slice(0, 300)); throw new Error("Coinbase no respondió. Inténtalo de nuevo."); }
  return JSON.parse(text);
}

export async function partnerId(privyUserId: string) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`boveda:${privyUserId}`)));
  return Array.from(h.slice(0, 20), (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function coinbaseSellUrl(wallet: string, privyUserId: string, clientIp: string | undefined, amount: string | undefined, redirectUrl: string) {
  const r = await cdp("POST", "/onramp/v1/token", { addresses: [{ address: wallet, blockchains: ["solana"] }], assets: ["USDC"], ...(clientIp ? { clientIp } : {}) });
  const token = r.token ?? r.data?.token;
  if (typeof token !== "string") throw new Error("Coinbase no respondió. Inténtalo de nuevo.");
  const q = new URLSearchParams({ sessionToken: token, partnerUserId: await partnerId(privyUserId), defaultAsset: "USDC", defaultNetwork: "solana", redirectUrl });
  if (amount) q.set("presetCryptoAmount", amount);
  return `https://pay.coinbase.com/v3/sell/input?${q}`;
}

export async function coinbasePendingSell(privyUserId: string) {
  const r = await cdp("GET", `/onramp/v1/sell/user/${await partnerId(privyUserId)}/transactions?page_size=5`);
  const list: Array<any> = r.transactions ?? [];
  const t = list.find((x) => x.status === "TRANSACTION_STATUS_STARTED" && String(x.asset).toUpperCase() === "USDC" && String(x.network).toLowerCase() === "solana" && x.to_address);
  if (!t) return null;
  return { id: String(t.transaction_id ?? ""), toAddress: String(t.to_address), amount: String(t.sell_amount?.value ?? ""), fiat: t.total?.value ? `${t.total.value} ${t.total.currency ?? ""}`.trim() : null };
}

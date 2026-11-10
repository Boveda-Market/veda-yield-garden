import { getRequestHeader } from "@tanstack/react-start/server";

const API = "https://sideshift.ai/api/v2";
const PAIR = { depositCoin: "usdc", depositNetwork: "solana", settleCoin: "btc", settleNetwork: "bitcoin" } as const;

function creds() {
  const affiliateId = process.env["SIDESHIFT_ACCOUNT_ID"];
  const secret = process.env["SIDESHIFT_SECRET"];
  if (!affiliateId || !secret) throw new Error("El retiro a Bitcoin aún no está activado.");
  return { affiliateId, secret };
}

async function call<T>(path: string, body?: unknown): Promise<T> {
  const { secret } = creds();
  const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", "x-sideshift-secret": secret, ...(ip ? { "x-user-ip": ip } : {}) },
    body: body ? JSON.stringify(body) : null,
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;
  if (!res.ok || !json || json.error) {
    console.error("sideshift", path, res.status, json?.error?.message);
    const msg = json?.error?.message ?? "";
    if (/amount|minimum|maximum/i.test(msg)) throw new Error("El monto está fuera del rango permitido por el proveedor.");
    if (/address/i.test(msg)) throw new Error("La dirección de Bitcoin no es válida.");
    if (/country|region|restricted/i.test(msg)) throw new Error("El proveedor no está disponible en tu región.");
    throw new Error("El proveedor no respondió. Inténtalo de nuevo en unos minutos.");
  }
  return json;
}

export async function sideshiftQuote(amountUsdc: string) {
  const { affiliateId } = creds();
  const q = await call<{ id: string; depositAmount: string; settleAmount: string; expiresAt: string }>("/quotes", { ...PAIR, depositAmount: amountUsdc, affiliateId });
  const ref = await call<{ rate: string }>("/pair/btc-bitcoin/usdc-solana");
  return { quoteId: q.id, depositAmount: q.depositAmount, settleAmount: q.settleAmount, expiresAt: q.expiresAt, usdcPerBtc: Number(ref.rate) };
}

export async function sideshiftCreate(quoteId: string, settleAddress: string, refundAddress: string) {
  const { affiliateId } = creds();
  const s = await call<{ id: string; depositAddress: string; depositAmount: string; settleAmount: string; depositCoin: string; depositNetwork: string; settleCoin: string; settleNetwork: string; settleAddress: string; expiresAt: string }>(
    "/shifts/fixed", { quoteId, settleAddress, refundAddress, affiliateId });
  if (s.depositCoin.toLowerCase() !== "usdc" || s.depositNetwork !== "solana" || s.settleCoin.toLowerCase() !== "btc" || s.settleNetwork !== "bitcoin" || s.settleAddress !== settleAddress)
    throw new Error("La orden del proveedor no coincide. No se envió nada.");
  return { shiftId: s.id, depositAddress: s.depositAddress, depositAmount: s.depositAmount, settleAmount: s.settleAmount, expiresAt: s.expiresAt };
}

export async function sideshiftStatus(shiftId: string) {
  const s = await call<{ status: string; settleHash?: string }>(`/shifts/${encodeURIComponent(shiftId)}`);
  return { status: s.status, settleHash: s.settleHash ?? null };
}

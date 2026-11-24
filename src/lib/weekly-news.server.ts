import { generateResponse } from "@lovable.dev/ai-gateway";
import { NEWS_ACCOUNTS, newsDigestPost, pickTopPosts, type NewsItem, type NewsPost } from "./weekly-news";

const GATEWAY = "https://connector-gateway.lovable.dev/x";

async function accountPosts(account: string, since: string): Promise<NewsPost[]> {
  const lk = process.env["LOVABLE_API_KEY"], xk = process.env["X_API_KEY"];
  if (!lk || !xk) throw new Error("X connection not configured");
  const q = new URLSearchParams({ query: `from:${account} -is:retweet -is:reply`, max_results: "50", start_time: since, "tweet.fields": "created_at,public_metrics" });
  const r = await fetch(`${GATEWAY}/tweets/search/recent?${q}`, { headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": xk } });
  if (!r.ok) throw new Error(`X ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json() as { data?: { id: string; text: string; public_metrics?: { like_count?: number; retweet_count?: number } }[] };
  return (j.data ?? []).map((t) => ({ id: t.id, account, text: t.text, likes: t.public_metrics?.like_count ?? 0, reposts: t.public_metrics?.retweet_count ?? 0 }));
}

const PROMPT = `Eres editor del canal de Telegram de Bóveda Market, una app para personas que saben muy poco de cripto.
Con las publicaciones de X que te paso, elige las 3 o 4 noticias más importantes para alguien interesado en Bitcoin y su dinero. Prioriza: bancos o grandes fondos adoptando Bitcoin o dólares digitales, movimientos fuertes del precio de Bitcoin y noticias económicas que afecten el bolsillo (tasas, inflación, aranceles). Evita chismes de empresas o políticos sin impacto en el dinero.
El "lead" es una frase que resume la semana; nunca hables de las publicaciones ni de lo que no incluyen.
Reglas: español sencillo y neutro, cero jerga (di "dólares digitales", no stablecoins/USDC; no menciones Solana ni Meteora ni nombres de blockchains), sin promesas de ganancias, sin inventar datos que no estén en las publicaciones, frases cortas.
Cada noticia: un emoji, un título de máx 6 palabras, un texto de 1-2 frases y la cuenta fuente exacta.
"meaning": 1-2 frases que conecten la semana con poner tu dinero a trabajar en bóvedas, sin prometer nada.
Responde solo JSON: {"title": string, "lead": string, "items": [{"icon","title","text","source"}], "meaning": string}`;

/** Builds the weekly channel post from the last 7 days of the chosen X accounts; null when no news could be read. */
export async function buildNewsDigest(now = Date.now()): Promise<string | null> {
  const since = new Date(now - 7 * 86_400_000 + 60_000).toISOString();
  const res = await Promise.allSettled(NEWS_ACCOUNTS.map((a) => accountPosts(a, since)));
  res.forEach((r) => { if (r.status === "rejected") console.error("weekly-news X read failed:", r.reason); });
  const top = pickTopPosts(res.flatMap((r) => r.status === "fulfilled" ? r.value : []), 32);
  if (!top.length) return null;
  const out = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions: PROMPT,
    input: `Publicaciones (responde en JSON):\n\n${top.map((p) => `@${p.account}: ${p.text}`).join("\n\n")}`,
    text: { format: { type: "json_object" } },
  });
  const raw = (out.output ?? []).flatMap((o) => o.type === "message" ? o.content : []).map((c) => c.type === "output_text" ? c.text : "").join("");
  const d = JSON.parse(raw) as { title?: string; lead?: string; items?: NewsItem[]; meaning?: string };
  const allowed = new Set<string>(NEWS_ACCOUNTS.map((a) => a.toLowerCase()));
  const items = (d.items ?? []).filter((i) => i?.title && i?.text && allowed.has(String(i.source).replace(/^@/, "").toLowerCase())).slice(0, 4);
  if (!items.length) return null;
  const date = new Date(now - 4 * 3_600_000).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return newsDigestPost({ date, title: d.title || "Resumen semanal de noticias", lead: d.lead || "Lo más importante de la semana para tu dinero:", items, meaning: d.meaning || "" });
}

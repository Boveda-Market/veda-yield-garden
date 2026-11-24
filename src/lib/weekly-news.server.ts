import { generateResponse } from "@lovable.dev/ai-gateway";
import { NEWS_ACCOUNTS, NEWS_FEEDS, NEWS_SOURCES, newsDigestPost, parseRss, pickTopPosts, type NewsItem, type NewsPost } from "./weekly-news";

const X_GATEWAY = "https://connector-gateway.lovable.dev/x";

async function feedHeadlines(f: (typeof NEWS_FEEDS)[number], now: number) {
  const r = await fetch(f.url, { headers: { "user-agent": "Mozilla/5.0 (BovedaMarket news)", accept: "application/rss+xml, application/xml, text/xml" } });
  if (!r.ok) throw new Error(`${f.source} RSS ${r.status}`);
  return parseRss(await r.text(), f.source, now).slice(0, 15);
}

async function accountPosts(account: string, since: string): Promise<NewsPost[]> {
  const lk = process.env["LOVABLE_API_KEY"], xk = process.env["X_API_KEY"];
  if (!lk || !xk) throw new Error("X connection not configured");
  const q = new URLSearchParams({ query: `from:${account} -is:retweet -is:reply`, max_results: "50", start_time: since, "tweet.fields": "created_at,public_metrics" });
  const r = await fetch(`${X_GATEWAY}/tweets/search/recent?${q}`, { headers: { Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": xk } });
  if (!r.ok) throw new Error(`X ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = await r.json() as { data?: { id: string; text: string; public_metrics?: { like_count?: number; retweet_count?: number } }[] };
  return (j.data ?? []).map((t) => ({ id: t.id, account, text: t.text, likes: t.public_metrics?.like_count ?? 0, reposts: t.public_metrics?.retweet_count ?? 0 }));
}

const PROMPT = `Eres editor del canal de Telegram de Bóveda Market, una app para personas que saben muy poco de cripto.
Con los titulares que te paso (cada uno con su medio), elige las 3 o 4 noticias más importantes para alguien interesado en Bitcoin y su dinero. Prioriza: movimientos fuertes del precio de Bitcoin, bancos o grandes fondos adoptando Bitcoin o dólares digitales y noticias económicas que afecten el bolsillo (tasas, inflación, aranceles, empleo). Evita chismes de empresas o políticos sin impacto en el dinero.
Reglas: español sencillo y neutro, cero jerga (di "dólares digitales", no stablecoins/USDC; no menciones Solana ni Meteora ni nombres de blockchains), sin promesas de ganancias, sin inventar datos que no estén en los titulares, frases cortas.
Cada noticia: un emoji, un título de máx 6 palabras, un texto de 1-2 frases y el medio fuente exacto tal como aparece entre corchetes.
"lead": una frase que resume la semana; nunca hables de los titulares ni de lo que no incluyen.
"meaning": 1-2 frases que conecten la semana con poner tu dinero a trabajar en bóvedas, sin prometer nada.
Responde solo JSON: {"title": string, "lead": string, "items": [{"icon","title","text","source"}], "meaning": string}`;

/** Weekly channel post from mainstream RSS feeds (X accounts only as backup when feeds return too little); null when no news could be read. */
export async function buildNewsDigest(now = Date.now()): Promise<string | null> {
  const res = await Promise.allSettled(NEWS_FEEDS.map((f) => feedHeadlines(f, now)));
  res.forEach((r) => { if (r.status === "rejected") console.error("weekly-news RSS failed:", r.reason); });
  const lines = res.flatMap((r) => r.status === "fulfilled" ? r.value : []).map((h) => `[${h.source}] ${h.title}${h.summary && h.summary !== h.title ? ` — ${h.summary}` : ""}`);
  if (lines.length < 12) {
    const since = new Date(now - 7 * 86_400_000 + 60_000).toISOString();
    const x = await Promise.allSettled(NEWS_ACCOUNTS.map((a) => accountPosts(a, since)));
    lines.push(...pickTopPosts(x.flatMap((r) => r.status === "fulfilled" ? r.value : []), 24).map((p) => `[@${p.account}] ${p.text}`));
  }
  if (!lines.length) return null;
  const out = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions: PROMPT,
    input: `Titulares de la semana (responde en JSON):\n\n${lines.join("\n")}`,
    text: { format: { type: "json_object" } },
  });
  const raw = (out.output ?? []).flatMap((o) => o.type === "message" ? o.content : []).map((c) => c.type === "output_text" ? c.text : "").join("");
  const d = JSON.parse(raw) as { title?: string; lead?: string; items?: NewsItem[]; meaning?: string };
  const allowed = new Map(NEWS_SOURCES.map((s) => [s.toLowerCase(), s]));
  const items = (d.items ?? []).flatMap((i) => { const s = allowed.get(String(i?.source ?? "").toLowerCase()); return s && i.title && i.text ? [{ ...i, source: s }] : []; }).slice(0, 4);
  if (!items.length) return null;
  const date = new Date(now - 4 * 3_600_000).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return newsDigestPost({ date, title: d.title || "Resumen semanal de noticias", lead: d.lead || "Lo más importante de la semana para tu dinero:", items, meaning: d.meaning || "" });
}

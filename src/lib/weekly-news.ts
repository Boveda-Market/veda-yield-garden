import { TG_RULE, tgEsc } from "./telegram-format";

/** Mainstream news feeds (free RSS) for the weekly channel post: plain-language outlets for people new to crypto. */
export const NEWS_FEEDS = [
  { source: "Yahoo Finanzas", url: "https://es-us.finanzas.yahoo.com/rss/topstories" },
  { source: "CNN en Español", url: "https://news.google.com/rss/search?q=site:cnnespanol.cnn.com+economia+when:7d&hl=es-419&gl=US&ceid=US:es-419" },
  { source: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  { source: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
] as const;
/** X accounts used only as a backup when the feeds return too little. */
export const NEWS_ACCOUNTS = ["WatcherGuru", "CoinDesk", "KobeissiLetter", "DocumentingBTC"] as const;
export const NEWS_SOURCES: readonly string[] = [...NEWS_FEEDS.map((f) => f.source), ...NEWS_ACCOUNTS.map((a) => `@${a}`)];

export type NewsPost = { id: string; account: string; text: string; likes: number; reposts: number };
export type NewsHeadline = { source: string; title: string; summary: string; at: number };
export type NewsItem = { icon: string; title: string; text: string; source: string };

const decode = (s: string) => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const tag = (xml: string, t: string) => { const m = xml.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)); return m ? decode(m[1] ?? "") : ""; };

/** Parses RSS items from the last `days` (undated items kept), newest first, deduplicated by title. */
export function parseRss(xml: string, source: string, now: number, days = 7): NewsHeadline[] {
  const seen = new Set<string>();
  return [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)].flatMap((m) => {
    const it = m[0];
    const title = tag(it, "title").replace(/\s+-\s+[^-]{2,40}$/, "");
    const at = Date.parse(tag(it, "pubDate") || tag(it, "dc:date")) || now;
    if (!title || seen.has(title) || at < now - days * 86_400_000) return [];
    seen.add(title);
    return [{ source, title, summary: tag(it, "description").slice(0, 280), at }];
  }).sort((a, b) => b.at - a.at);
}

/** Best X posts of the week: most engagement first, at most a quarter of the picks per account (min 2) so no single source dominates. */
export function pickTopPosts(posts: readonly NewsPost[], n = 8): NewsPost[] {
  const per: Record<string, number> = {}, cap = Math.max(2, Math.ceil(n / 4));
  const seen = new Set<string>();
  return [...posts].sort((a, b) => (b.likes + 3 * b.reposts) - (a.likes + 3 * a.reposts)).filter((p) => {
    const key = p.text.slice(0, 60);
    if (seen.has(p.id) || seen.has(key) || (per[p.account] ?? 0) >= cap) return false;
    seen.add(p.id); seen.add(key); per[p.account] = (per[p.account] ?? 0) + 1;
    return true;
  }).slice(0, n);
}

/** Weekly channel post (HTML) built from real headlines rewritten in plain Spanish. */
export function newsDigestPost(p: { date: string; title: string; lead: string; items: NewsItem[]; meaning: string }) {
  const head = [`🗞️ <b>${tgEsc(p.title)}</b>  ·  <i>${tgEsc(p.date)}</i>`, TG_RULE, tgEsc(p.lead)].join("\n");
  const blocks = p.items.map((i) => `${i.icon} <b>${tgEsc(i.title)}</b>\n${tgEsc(i.text)}\n<i>Fuente: ${tgEsc(i.source)}</i>`);
  if (p.meaning) blocks.push(`💡 <b>¿Qué significa para ti?</b>\n${tgEsc(p.meaning)}`);
  blocks.push("👉 Explora la Bóveda Bitcoin:\nhttps://bovedamarket.app/bitcoin");
  return [head, ...blocks, `${TG_RULE}\n<blockquote>🛡️ Solo usamos bovedamarket.app. Nunca te escribiremos primero por privado.</blockquote>`].join("\n\n");
}

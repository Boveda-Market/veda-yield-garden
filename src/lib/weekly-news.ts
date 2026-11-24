import { TG_RULE, tgEsc } from "./telegram-format";

/** X accounts read for the weekly channel news post (chosen by the operator). */
export const NEWS_ACCOUNTS = ["WatcherGuru", "CoinDesk", "KobeissiLetter", "DocumentingBTC"] as const;

export type NewsPost = { id: string; account: string; text: string; likes: number; reposts: number };
export type NewsItem = { icon: string; title: string; text: string; source: string };

/** Best posts of the week: most engagement first, at most a quarter of the picks per account (min 2) so no single source dominates. */
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

/** Weekly channel post (HTML) built from real X headlines rewritten in plain Spanish. */
export function newsDigestPost(p: { date: string; title: string; lead: string; items: NewsItem[]; meaning: string }) {
  const head = [`🗞️ <b>${tgEsc(p.title)}</b>  ·  <i>${tgEsc(p.date)}</i>`, TG_RULE, tgEsc(p.lead)].join("\n");
  const blocks = p.items.map((i) => `${i.icon} <b>${tgEsc(i.title)}</b>\n${tgEsc(i.text)}\n<i>Fuente: @${tgEsc(i.source.replace(/^@/, ""))}</i>`);
  blocks.push(`💡 <b>¿Qué significa para ti?</b>\n${tgEsc(p.meaning)}`);
  blocks.push("👉 Explora la Bóveda Bitcoin:\nhttps://bovedamarket.app/bitcoin");
  return [head, ...blocks, `${TG_RULE}\n<blockquote>🛡️ Solo usamos bovedamarket.app. Nunca te escribiremos primero por privado.</blockquote>`].join("\n\n");
}

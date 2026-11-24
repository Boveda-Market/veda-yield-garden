import { describe, it, expect } from "vitest";
import { NEWS_FEEDS, NEWS_ACCOUNTS, parseRss, pickTopPosts } from "@/lib/weekly-news";

describe("weekly news", () => {
  it("reads Yahoo Finanzas, CNN en Español, CNBC and CoinDesk", () => expect(NEWS_FEEDS.map((f) => f.source)).toEqual(["Yahoo Finanzas", "CNN en Español", "CNBC", "CoinDesk"]));
  it("keeps the four X accounts as backup", () => expect([...NEWS_ACCOUNTS]).toEqual(["WatcherGuru", "CoinDesk", "KobeissiLetter", "DocumentingBTC"]));
  it("parses RSS and drops items older than 7 days", () => {
    const now = Date.parse("2026-11-24T12:00:00Z");
    const xml = `<rss><channel><item><title><![CDATA[Bitcoin sube &amp; baja - CNN]]></title><pubDate>Tue, 24 Nov 2026 10:00:00 GMT</pubDate></item><item><title>Vieja</title><pubDate>Mon, 09 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>`;
    expect(parseRss(xml, "CNN en Español", now).map((h) => h.title)).toEqual(["Bitcoin sube & baja"]);
  });
  it("keeps at most 2 X posts per account when picking 8", () => {
    const p = (id: string, account: string, likes: number) => ({ id, account, text: `post ${id}`, likes, reposts: 0 });
    expect(pickTopPosts([p("1", "WatcherGuru", 10), p("2", "WatcherGuru", 50), p("3", "WatcherGuru", 30), p("4", "CoinDesk", 5)]).map((t) => t.id)).toEqual(["2", "3", "4"]);
  });
});

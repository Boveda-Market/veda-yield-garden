import { describe, it, expect } from "vitest";
import { NEWS_ACCOUNTS, pickTopPosts } from "@/lib/weekly-news";

describe("weekly X news", () => {
  it("reads the four chosen accounts", () => expect([...NEWS_ACCOUNTS]).toEqual(["WatcherGuru", "CoinDesk", "KobeissiLetter", "DocumentingBTC"]));
  it("keeps at most 2 posts per account, most engagement first", () => {
    const p = (id: string, account: string, likes: number) => ({ id, account, text: `post ${id}`, likes, reposts: 0 });
    const top = pickTopPosts([p("1", "WatcherGuru", 10), p("2", "WatcherGuru", 50), p("3", "WatcherGuru", 30), p("4", "CoinDesk", 5)]);
    expect(top.map((t) => t.id)).toEqual(["2", "3", "4"]);
  });
});

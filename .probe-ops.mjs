import { createServer } from "vite";
const server = await createServer({ configFile: "/dev-server/vite.config.ts", server: { middlewareMode: true, hmr: false }, logLevel: "error" });
const K = process.env.HELIUS_API_KEY, W = "5WbsuG4T4FrtwYDCB7YWTDxLj47yqAwAJD9o4Rk886nu", F = "89kr8297BNNY7Hof8XBt9WVM6HnDHgwEuyYtJ6pRtuiR";
const out = (l, r) => console.log(l, JSON.stringify(r, (k, v) => k === "transaction" || k === "prepared" ? (v ? "<tx>" : v) : typeof v === "bigint" ? v.toString() : v).slice(0, 300));
const env = server.environments.ssr;
try {
  const read = await env.runner.import("/src/lib/solana-read.server.ts");
  const fr = await read.readRealWallet(K, F); out("funded wallet", { usdc: fr.usdc, sol: fr.sol });
  const dep = await env.runner.import("/src/lib/deposit-simulation.server.ts");
  for (const vaultId of ["sol", "met", "gta6", "sol", "met", "gta6"]) for (const amount of ["5"]) {
    const r = await dep.simulateDeposit(K, { wallet: F, vaultId, amount }, { preparePilot: true });
    out(`deposit ${vaultId} $${amount}`, { ok: r.success, prepared: !!r.prepared, stage: r.stage, bytes: r.bytes, msg: r.success ? undefined : r.message });
  }
  const r2 = await dep.simulateDeposit(K, { wallet: W, vaultId: "sol", amount: "1" }); out("deposit user (low funds)", { ok: r2.success, stage: r2.stage, msg: r2.message });
} catch (e) { console.log("FAIL", e?.stack?.slice(0, 1200)); }
try {
  const p = await env.runner.import("/src/lib/predict.server.ts");
  const rounds = await p.listRounds(); out("rounds", rounds.map((r) => `${r.asset}-${r.window}`));
  const past = await p.listPastRounds(); out("past rounds", past.length);
  const r = rounds[0];
  for (const isYes of [true, false]) { try { const b = await p.buildBuy(K, { wallet: F, marketId: r.marketId, isYes, amount: 5_000_000n }); out(`predict buy ${isYes ? "up" : "down"}`, { ok: !!b.transaction, quote: b.quote, order: !!b.orderPubkey }); } catch (e) { out("predict buy FAIL", String(e?.message ?? e)); } }
  out("positions user", (await p.listPositions(W)).length);
  out("refunds user", (await p.listRefunds(W)).length);
} catch (e) { console.log("PREDICT FAIL", e?.stack?.slice(0, 800)); }
try {
  const b = await env.runner.import("/src/lib/btc-offramp.server.ts");
  out("btc quote $50", await b.sideshiftQuote("50"));
} catch (e) { console.log("BTC FAIL", String(e?.message ?? e)); }
await server.close(); process.exit(0);

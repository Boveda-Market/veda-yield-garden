import { createServer } from "vite";
const server = await createServer({ configFile: "/dev-server/vite.config.ts", server: { middlewareMode: true, hmr: false }, logLevel: "error" });
const K = process.env.HELIUS_API_KEY, W = "5WbsuG4T4FrtwYDCB7YWTDxLj47yqAwAJD9o4Rk886nu", P = "HH1gzu8jtQCexUxgmvV33bhZ49WszUaEkZomc4TdGvSZ";
const out = (l, r) => console.log(l, JSON.stringify(r, (k, v) => k === "transaction" || k === "prepared" ? (v ? "<tx>" : v) : typeof v === "bigint" ? v.toString() : v).slice(0, 420));
try {
  const env = server.environments.ssr;
  const wd = await env.runner.import("/src/lib/withdrawal.server.ts");
  for (const percent of [100, 75, 50, 25, 50, 100]) { const r = await wd.simulateWithdrawal(K, { wallet: W, position: P, vaultId: "sol", percent }); out(`withdraw ${percent}`, { ok: r.success, msg: r.success ? r.net : r.message }); }
  const pr = await wd.simulateWithdrawal(K, { wallet: W, position: P, vaultId: "sol", percent: 100 });
  const prep = await wd.simulateWithdrawal(K, { wallet: W, position: P, vaultId: "sol", percent: 100 }, { prepare: true, maximumFeeRaw: pr.feeRaw, minimumNetRaw: pr.minimumNetRaw });
  out("withdraw prepare 100", { ok: prep.success, prepared: !!prep.prepared, bytes: prep.bytes, msg: prep.message.slice(0, 80) });
  const hv = await env.runner.import("/src/lib/harvest.server.ts");
  const h = await hv.simulateHarvest(K, { wallet: W, position: P, vaultId: "sol" }); out("harvest", h);
  if (h.feeRaw) { const hp = await hv.simulateHarvest(K, { wallet: W, position: P, vaultId: "sol" }, { prepare: true, maximumFeeRaw: h.feeRaw }); out("harvest prepare", { ok: hp.success, prepared: !!hp.prepared, msg: hp.message }); }
  const cp = await env.runner.import("/src/lib/compound.server.ts");
  out("compound", await cp.prepareCompound(K, { wallet: W, position: P, vaultId: "sol", usdcRaw: "733", tokenRaw: "10907" }));
} catch (e) { console.log("FAIL", e?.stack?.slice(0, 1500)); }
await server.close(); process.exit(0);

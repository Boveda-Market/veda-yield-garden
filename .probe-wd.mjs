import { createServer } from "vite";
const server = await createServer({ configFile: "/dev-server/vite.config.ts", server: { middlewareMode: true, hmr: false }, logLevel: "error" });
const K = process.env.HELIUS_API_KEY, W = "5WbsuG4T4FrtwYDCB7YWTDxLj47yqAwAJD9o4Rk886nu", P = "HH1gzu8jtQCexUxgmvV33bhZ49WszUaEkZomc4TdGvSZ";
const wd = await server.environments.ssr.runner.import("/src/lib/withdrawal.server.ts");
for (const percent of [100, 50, 100, 50, 100, 50, 100, 50, 100, 50, 100, 50, 100, 25]) { const r = await wd.simulateWithdrawal(K, { wallet: W, position: P, vaultId: "sol", percent }); console.log(`withdraw ${percent}`, r.success ? "OK " + r.net : r.message.slice(0, 60)); }
await server.close(); process.exit(0);

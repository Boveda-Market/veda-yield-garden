// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// Never set ssr.external or resolve.external: the Worker has no runtime module resolution, so
// the build fails. Never add compression (compressPublicAssets, vite-plugin-compression):
// hosting already compresses at the edge.
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const anchorCjs = resolve(dirname(require.resolve("@coral-xyz/anchor/package.json")), "dist/cjs/index.js");
const browserEvents = require.resolve("events/");
// The DLMM SDK's ESM entry uses Node-invalid directory imports; its CommonJS build works everywhere.
const dlmmCjs = require.resolve("@meteora-ag/dlmm");

export default defineConfig({
  vite: {
    // Apply before SSR creates shared dependency chunks, not only in Nitro.
    resolve: { alias: [
      { find: /^@coral-xyz\/anchor$/, replacement: anchorCjs },
      { find: /^@meteora-ag\/dlmm$/, replacement: dlmmCjs },
      // Email rendering needs entities v4; a nested v7 copy lacks lib/decode.js.
      { find: /^entities\/lib\/decode\.js$/, replacement: resolve("node_modules/entities/lib/decode.js") },
      { find: /^entities\/lib\/encode\.js$/, replacement: resolve("node_modules/entities/lib/encode.js") },
      { find: /^entities$/, replacement: resolve("node_modules/entities") },
    ] },
    // Pre-bundle lazily imported wallet deps at startup so a mid-session
    // re-optimization cannot load two React copies (null hook dispatcher).
    optimizeDeps: { include: ["buffer", "bs58", "@solana/kit", "@privy-io/react-auth", "@privy-io/react-auth/solana", "@privy-io/react-auth/ui"] },
    define: { "process.env.ANCHOR_BROWSER": "true" },
    plugins: [{
      // Dev SSR only: the alias above points at a CommonJS file, which Vite's module runner would
      // evaluate as ESM ("exports is not defined"). Serve a tiny wrapper that lets Node require it.
      // Builds keep the alias so the Worker bundle includes the transformed CommonJS.
      name: "dev-ssr-dlmm-native",
      apply: "serve",
      enforce: "pre",
      applyToEnvironment: (environment) => environment.name === "ssr",
      resolveId(id) { return id === dlmmCjs || id === "@meteora-ag/dlmm" ? "\0dlmm-cjs" : null; },
      load(id) { return id === "\0dlmm-cjs" ? `import { createRequire } from "node:module";\nexport default createRequire(${JSON.stringify(dlmmCjs)})(${JSON.stringify(dlmmCjs)});` : null; },
    }, {
      // WalletConnect imports Node's events. Without this, the client build
      // emits an empty browser stub and its EventEmitter constructor fails.
      // A per-environment resolve.alias is not applied to these imports.
      name: "client-browser-events",
      enforce: "pre",
      applyToEnvironment: (environment) => environment.name === "client",
      resolveId: { filter: { id: /^(node:)?events$/ }, handler: () => browserEvents },
    }, {
      name: "solana-worker-browser-exports",
      // The final Nitro Worker bundle resolves packages separately from SSR.
      // These pure-JS Solana dependencies export browser/node, but not worker.
      // Use their Web-compatible implementation; never externalize them.
      configEnvironment(name, config) {
        if (name !== "nitro") return;
        const conditions = config.resolve?.conditions ?? ["workerd", "worker", "production", "wasm", "unwasm"];
        return { resolve: {
          conditions: [...new Set([...conditions, "browser"])],
          // Anchor's browser and esm entries contain unwrapped CommonJS.
          // Its explicitly CommonJS source is transformed by the bundler.
          alias: [{ find: /^@coral-xyz\/anchor$/, replacement: anchorCjs }, { find: /^@meteora-ag\/dlmm$/, replacement: dlmmCjs }],
        } };
      },
    }],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

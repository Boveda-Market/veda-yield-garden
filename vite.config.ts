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

export default defineConfig({
  vite: {
    plugins: [{
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
          alias: [{ find: /^@coral-xyz\/anchor$/, replacement: anchorCjs }],
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

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    // Same CommonJS entry the app build uses for the DLMM SDK (its ESM entry is not Node-loadable).
    alias: { "@": path.resolve(__dirname, "./src"), "@meteora-ag/dlmm": require.resolve("@meteora-ag/dlmm") },
  },
});

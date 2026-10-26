import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // Em testes não há React Server Components: o marcador `server-only`
      // deve resolver para o módulo vazio em vez de lançar erro.
      "server-only": path.resolve(
        import.meta.dirname,
        "node_modules/server-only/empty.js",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["./tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});

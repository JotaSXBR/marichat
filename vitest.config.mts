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
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html"],
      // Componentes de UI (shadcn/Kokonut) são cola visual, não regra de
      // negócio: cobrar cobertura deles só empurra teste sem valor.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/**"],
      // Pisos logo abaixo do medido hoje (43/30/39/44): CI quebra se cair.
      thresholds: {
        statements: 42,
        branches: 29,
        functions: 38,
        lines: 43,
      },
    },
  },
});

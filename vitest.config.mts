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
      // Componentes de UI (shadcn/Kokonut) e as páginas/seções são cola
      // visual, não regra de negócio: cobrar cobertura deles só empurra teste
      // sem valor. Consultas e server actions (`.ts`) continuam medidos.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/**", "src/app/**/*.tsx"],
      // Pisos logo abaixo do medido hoje (53/46/61/54): CI quebra se cair.
      thresholds: {
        statements: 51,
        branches: 44,
        functions: 59,
        lines: 53,
      },
    },
  },
});

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
      // Páginas e seções (`.tsx`) só montam layout e estado de UI; decisão pura
      // mora em módulos `.ts` irmãos, testados. Consultas e server actions
      // continuam medidos; `src/components/**` é cola visual do shadcn.
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/components/**", "src/app/**/*.tsx"],
      // Pisos logo abaixo do medido hoje (56/51/64/58): CI quebra se cair.
      thresholds: {
        statements: 55,
        branches: 49,
        functions: 63,
        lines: 56,
      },
    },
  },
});

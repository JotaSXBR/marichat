import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Lint com informações de tipo: pega promessas esquecidas, `String()` de
    // objeto, `await` desnecessário e afins. Roda em src e tests.
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },
  {
    // Nos testes, os mocks de `fetch` são `async` de propósito (imitam a API
    // real) e as fixtures passam por asserções de tipo para virar linhas do
    // banco. Essas três regras só gerariam ruído ali.
    files: ["tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/require-await": "off",
    },
  },
]);

export default eslintConfig;

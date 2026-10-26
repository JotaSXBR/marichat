import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import sonarjs from "eslint-plugin-sonarjs";
import tseslint from "typescript-eslint";

/**
 * Orçamentos de tamanho e complexidade.
 *
 * Continuam como `warn` de propósito: o projeto já tem dívida antiga e virar
 * `error` de uma vez incentiva `eslint-disable` em massa. O portão do CI usa
 * `--max-warnings=<baseline>`: o código novo não pode aumentar o número de
 * avisos. Ao limpar um arquivo, o baseline desce (ver docs/QUALIDADE.md).
 */
const sizeBudgets = {
  "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": [
    "warn",
    { max: 60, skipBlankLines: true, skipComments: true },
  ],
  complexity: ["warn", 12],
  "max-depth": ["warn", 3],
  "max-params": ["warn", 4],
  "max-nested-callbacks": ["warn", 3],
};

const sonarRules = {
  "sonarjs/cognitive-complexity": ["warn", 15],
  "sonarjs/no-identical-functions": "warn",
  "sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
  "sonarjs/no-duplicated-branches": "warn",
  "sonarjs/no-all-duplicated-branches": "warn",
  "sonarjs/no-collapsible-if": "warn",
  "sonarjs/no-useless-catch": "warn",
  "sonarjs/prefer-immediate-return": "warn",
  "sonarjs/prefer-single-boolean-return": "warn",
};

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
    files: ["src/**/*.{ts,tsx}", "scripts/**/*.mjs", "tests/**/*.ts"],
    plugins: { sonarjs },
    rules: { ...sizeBudgets },
  },
  {
    // Cheiros de duplicação e legibilidade só no código de produção.
    files: ["src/**/*.{ts,tsx}"],
    rules: sonarRules,
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
      // Um `describe` inteiro conta como uma função; o tamanho útil ali é o
      // do arquivo.
      "max-lines-per-function": "off",
      complexity: "off",
      "max-lines": [
        "warn",
        { max: 800, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    // API falsa do demo local: um arquivo por rota seria exagero.
    files: ["scripts/**/*.mjs"],
    rules: { "max-lines-per-function": "off" },
  },
  // Desliga regras de estilo do ESLint que brigariam com o Prettier.
  eslintConfigPrettier,
]);

export default eslintConfig;

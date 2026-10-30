import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

/**
 * Harness dos testes de navegador. Roda o pacote standalone (o mesmo do
 * container) na 3100, para não disputar a porta do `npm run dev`.
 *
 * Local: `npm run build` antes da primeira execução. No CI o build é um passo
 * próprio, e as variáveis vêm do job (sem .env.local).
 */

loadEnvConfig(process.cwd());

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;
const password = process.env.ADMIN_PASSWORD;

if (!password) {
  throw new Error(
    "ADMIN_PASSWORD não definido (nem no ambiente, nem no .env.local).",
  );
}

export default defineConfig({
  testDir: "./e2e",
  // Os quatro navegadores dividem o mesmo servidor; cada spec diz se pode
  // paralelizar (ver `projects`).
  workers: 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    httpCredentials: { username: "admin", password },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      // Só leitura: abre a página, mede e fecha. Cada caso é independente.
      name: "a11y",
      testMatch: "a11y.spec.ts",
      fullyParallel: true,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Escrevem no banco (toggle de automação): em série, como antes.
      name: "fluxos",
      testMatch: ["comportamentos.spec.ts", "admin-shell.spec.ts"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `node scripts/start-e2e.mjs ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

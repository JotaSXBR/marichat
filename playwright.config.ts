import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

/**
 * Harness dos testes de navegador. Roda contra o build de produção
 * (`next start`) na 3100, para não disputar a porta do `npm run dev`.
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
  // Um banco só: os specs compartilham estado e não podem correr em paralelo.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    httpCredentials: { username: "admin", password },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

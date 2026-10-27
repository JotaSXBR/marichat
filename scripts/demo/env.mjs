/**
 * Configuração da demonstração local: carrega `.env.local` e expõe as
 * variáveis e constantes usadas pelos demais módulos do demo.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match?.[1]) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    process.env[key] = (match[2] ?? "").replace(/^"(.*)"$/, "$1");
  }
}

loadEnvLocal();

export const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
export const DATABASE_URL = process.env.DATABASE_URL;
export const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
export const CRON_SECRET = process.env.CRON_SECRET;
export const TOKEN_KEY = process.env.TOKEN_ENCRYPTION_KEY;
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

export const MOCK_PORT = 4010;
export const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;

export const DEMO_IG_ID = "17841400000000001";
export const DEMO_USERNAME = "conta_demo";
export const DEMO_COMMENTER = "user_demo_1";
export const DEMO_LINK = "https://marichat.fluxie.com.br/demo";
export const DEMO_TOKEN = "IGQVJ-token-simulado-de-teste";

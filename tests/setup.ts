import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

// O @next/env ignora `.env.local` quando NODE_ENV=test (comportamento do Next).
// Para os testes de integração usarem o MESMO PostgreSQL local de teste,
// carregamos esse arquivo manualmente, sem sobrescrever o ambiente.
const localEnvPath = path.join(process.cwd(), ".env.local");
if (existsSync(localEnvPath)) {
  for (const line of readFileSync(localEnvPath, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match?.[1]) continue;
    const key = match[1];
    const value = match[2] ?? "";
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvConfig(process.cwd());

process.env.TOKEN_ENCRYPTION_KEY ||= Buffer.alloc(32, 7).toString("base64");
process.env.INSTAGRAM_APP_SECRET ||= "test-app-secret";
process.env.META_WEBHOOK_VERIFY_TOKEN ||= "test-verify-token";
process.env.ADMIN_PASSWORD ||= "test-admin-password";
process.env.APP_URL ||= "http://localhost:3000";
process.env.CRON_SECRET ||= "test-cron-secret";

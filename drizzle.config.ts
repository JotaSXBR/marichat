import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Carrega .env.local / .env como o Next faz, para usar as mesmas credenciais
// no desenvolvimento e no CI. Em produção o Coolify injeta as variáveis.
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL não configurada. Defina a variável antes de rodar comandos do Drizzle (db:generate / db:migrate).",
  );
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});

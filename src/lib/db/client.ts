import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { getDatabaseUrl } from "@/lib/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

type DbState = {
  sql: Sql;
  db: Database;
};

/**
 * Em desenvolvimento o Next recarrega os módulos com frequência. Guardar o
 * pool no globalThis evita abrir uma conexão nova a cada hot reload.
 */
const globalForDb = globalThis as unknown as {
  __marichatDb?: DbState;
};

/**
 * Cria a conexão somente quando chamado (nunca no import, nunca no build).
 * Se DATABASE_URL não estiver configurada, falha com mensagem explícita.
 */
export function getDb(): Database {
  const existing = globalForDb.__marichatDb;
  if (existing) return existing.db;

  const url = getDatabaseUrl();
  const sql = postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // O Postgres do Coolify é acessado pela rede interna, sem PgBouncer.
    prepare: true,
  });

  const db = drizzle(sql, { schema });
  globalForDb.__marichatDb = { sql, db };
  return db;
}

/** Encerra o pool (usado por scripts e testes). */
export async function closeDb(): Promise<void> {
  const state = globalForDb.__marichatDb;
  if (!state) return;
  globalForDb.__marichatDb = undefined;
  await state.sql.end({ timeout: 5 });
}

export { schema };

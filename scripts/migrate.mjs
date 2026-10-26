/**
 * Aplica as migrations do Drizzle antes de subir o servidor.
 * Executado pelo container (Coolify). É idempotente: migrations já aplicadas
 * são registradas em drizzle.__drizzle_migrations e ignoradas.
 */
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.error(
    "[marichat] DATABASE_URL não configurada: não é possível aplicar as migrations.",
  );
  process.exit(1);
}

const sql = postgres(url, { max: 1, connect_timeout: 20 });

try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("[marichat] migrations aplicadas com sucesso.");
} catch (error) {
  console.error("[marichat] falha ao aplicar migrations:", error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { getDb } from "@/lib/db/client";

/**
 * Health check usado pelo Coolify.
 * `connection()` garante que a rota só roda em request time, nunca no build.
 */
export async function GET() {
  await connection();

  const startedAt = Date.now();
  try {
    const db = getDb();
    await db.execute(sql`select 1`);
    return Response.json(
      {
        status: "ok",
        database: "ok",
        latencyMs: Date.now() - startedAt,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    // Não expõe detalhes internos (host, usuário ou stack) na resposta.
    return Response.json(
      { status: "error", database: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}

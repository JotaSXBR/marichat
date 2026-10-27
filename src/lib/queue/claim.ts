import "server-only";

import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { outboundMessages } from "@/lib/db/schema";
import type { JobRow } from "@/lib/queue/types";

/** Pega a próxima tarefa pendente com bloqueio atômico (SKIP LOCKED). */
export async function claimNextJob(): Promise<JobRow | null> {
  const db = getDb();
  const lockToken = randomUUID();

  const result = await db.execute<{ id: string }>(sql`
    UPDATE outbound_messages
    SET status = 'processing',
        attempts = attempts + 1,
        locked_at = now(),
        lock_token = ${lockToken},
        last_attempt_at = now(),
        updated_at = now()
    WHERE id = (
      SELECT id FROM outbound_messages
      WHERE status = 'pending' AND next_attempt_at <= now()
      ORDER BY next_attempt_at ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id
  `);

  const row = (result as unknown as Array<{ id: string }>)[0];
  if (!row) return null;

  const [job] = await db
    .select()
    .from(outboundMessages)
    .where(eq(outboundMessages.id, row.id))
    .limit(1);
  return job ?? null;
}

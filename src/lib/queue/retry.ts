import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { outboundMessages } from "@/lib/db/schema";
import { IG } from "@/lib/instagram/config";
import { markFailed } from "@/lib/queue/job-state";
import type { InteractionRow, JobRow, JobOutcome } from "@/lib/queue/types";

/** Devolve a tarefa para a fila quando a conta precisa ser reconectada. */
export async function requeueForConnection(
  job: JobRow,
  message: string,
): Promise<void> {
  const db = getDb();
  const nextAttemptAt = new Date(Date.now() + 60 * 60 * 1000);
  await db
    .update(outboundMessages)
    .set({
      status: "pending",
      attempts: sql`greatest(${outboundMessages.attempts} - 1, 0)`,
      nextAttemptAt,
      errorCode: "CONNECTION_REQUIRED",
      errorMessage: message,
      lockedAt: null,
      lockToken: null,
      updatedAt: new Date(),
    })
    .where(eq(outboundMessages.id, job.id));
}

/**
 * Respostas privadas aceitas na última hora. A Meta permite 750 por conta
 * nesse intervalo; ao chegar no teto, a próxima tentativa espera a mensagem
 * mais antiga sair da janela deslizante.
 */
export async function privateReplyUsage(accountId: string): Promise<{
  count: number;
  retryAt: Date | null;
}> {
  const db = getDb();
  const cutoff = new Date(Date.now() - IG.privateReplyRateWindowMs);
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      oldest: sql<Date | string | null>`min(${outboundMessages.acceptedAt})`,
    })
    .from(outboundMessages)
    .where(
      and(
        eq(outboundMessages.accountId, accountId),
        eq(outboundMessages.kind, "private_reply"),
        eq(outboundMessages.status, "accepted"),
        gte(outboundMessages.acceptedAt, cutoff),
      ),
    );

  const row = rows[0];
  const oldest = row?.oldest ? new Date(row.oldest) : null;
  return {
    count: Number(row?.total ?? 0),
    retryAt: oldest
      ? new Date(oldest.getTime() + IG.privateReplyRateWindowMs + 5_000)
      : null,
  };
}

export async function requeueForRateLimit(
  job: JobRow,
  retryAt: Date,
): Promise<void> {
  const db = getDb();
  await db
    .update(outboundMessages)
    .set({
      status: "pending",
      attempts: sql`greatest(${outboundMessages.attempts} - 1, 0)`,
      nextAttemptAt: retryAt,
      errorCode: "RATE_LIMITED",
      errorMessage:
        "Limite de 750 respostas privadas por hora atingido. A tarefa volta para a fila quando a janela liberar.",
      lockedAt: null,
      lockToken: null,
      updatedAt: new Date(),
    })
    .where(eq(outboundMessages.id, job.id));
}

/** Falha de rede/limite: tenta de novo com espera crescente ou desiste. */
export async function retryOrFail(
  job: JobRow,
  interaction: InteractionRow,
  message: string,
  code: string | null,
): Promise<JobOutcome> {
  const db = getDb();
  const now = Date.now();

  if (job.attempts >= job.maxAttempts) {
    await markFailed(
      job,
      interaction,
      `${message} Tentativas esgotadas (${job.attempts}).`,
      code,
    );
    return "failed";
  }

  const delay =
    IG.retryDelaysMs[Math.min(job.attempts - 1, IG.retryDelaysMs.length - 1)] ??
    IG.retryDelaysMs[0];

  await db
    .update(outboundMessages)
    .set({
      status: "pending",
      nextAttemptAt: new Date(now + delay),
      errorCode: code,
      errorMessage: message,
      lockedAt: null,
      lockToken: null,
      updatedAt: new Date(),
    })
    .where(eq(outboundMessages.id, job.id));

  return "requeued";
}

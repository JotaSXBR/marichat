import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { commentInteractions, outboundMessages } from "@/lib/db/schema";
import type { InteractionRow, JobRow } from "@/lib/queue/types";

/** Condição de trava: só altera se ninguém tomou a tarefa. */
function lockedBy(job: JobRow) {
  return job.lockToken
    ? eq(outboundMessages.lockToken, job.lockToken)
    : sql`true`;
}

export async function updateJobIfLocked(
  job: JobRow,
  values: Partial<typeof outboundMessages.$inferInsert>,
): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(outboundMessages)
    .set({ ...values, updatedAt: new Date() })
    .where(and(eq(outboundMessages.id, job.id), lockedBy(job)))
    .returning({ id: outboundMessages.id });
  return updated.length > 0;
}

export async function markAccepted(
  job: JobRow,
  interaction: InteractionRow,
  messageId: string | null,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(outboundMessages)
      .set({
        status: "accepted",
        acceptedAt: now,
        externalMessageId: messageId,
        errorCode: null,
        errorMessage: null,
        lockedAt: null,
        lockToken: null,
        updatedAt: now,
      })
      .where(and(eq(outboundMessages.id, job.id), lockedBy(job)))
      .returning({ id: outboundMessages.id });

    if (updated.length === 0) return;

    if (job.kind === "private_reply") {
      await tx
        .update(commentInteractions)
        .set({
          state: "accepted",
          firstDmMessageId: messageId,
          firstDmAcceptedAt: now,
          updatedAt: now,
        })
        .where(eq(commentInteractions.id, interaction.id));
      return;
    }

    if (
      job.kind === "followup_link" ||
      job.kind === "link_optional" ||
      job.kind === "link_direct"
    ) {
      await tx
        .update(commentInteractions)
        .set({
          state: "link_sent",
          secondDmMessageId: messageId,
          secondDmAcceptedAt: now,
          updatedAt: now,
        })
        .where(eq(commentInteractions.id, interaction.id));
      return;
    }

    if (job.kind === "follow_gate") {
      await tx
        .update(commentInteractions)
        .set({ state: "gate_pending", updatedAt: now })
        .where(eq(commentInteractions.id, interaction.id));
    }
  });
}

export async function markUncertain(
  job: JobRow,
  interaction: InteractionRow,
  message: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(outboundMessages)
      .set({
        status: "uncertain",
        errorCode: "UNCERTAIN",
        errorMessage: message,
        lockedAt: null,
        lockToken: null,
        updatedAt: now,
      })
      .where(and(eq(outboundMessages.id, job.id), lockedBy(job)))
      .returning({ id: outboundMessages.id });

    if (updated.length === 0) return;

    if (job.kind === "private_reply") {
      await tx
        .update(commentInteractions)
        .set({ state: "uncertain", updatedAt: now })
        .where(eq(commentInteractions.id, interaction.id));
    }
  });
}

export async function markFailed(
  job: JobRow,
  interaction: InteractionRow,
  message: string,
  code: string | null,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(outboundMessages)
      .set({
        status: "failed",
        errorCode: code,
        errorMessage: message,
        lockedAt: null,
        lockToken: null,
        updatedAt: now,
      })
      .where(and(eq(outboundMessages.id, job.id), lockedBy(job)))
      .returning({ id: outboundMessages.id });

    if (updated.length === 0) return;

    if (job.kind === "private_reply") {
      await tx
        .update(commentInteractions)
        .set({ state: "failed", updatedAt: now })
        .where(eq(commentInteractions.id, interaction.id));
    }
  });
}

export async function markExpired(
  job: JobRow,
  interaction: InteractionRow,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(outboundMessages)
      .set({
        status: "expired",
        errorCode: "EXPIRED",
        errorMessage:
          job.kind === "private_reply"
            ? "O prazo de 7 dias para responder ao comentário expirou."
            : "A janela de 24 horas para enviar o link expirou.",
        lockedAt: null,
        lockToken: null,
        updatedAt: now,
      })
      .where(and(eq(outboundMessages.id, job.id), lockedBy(job)))
      .returning({ id: outboundMessages.id });

    if (updated.length === 0) return;

    if (job.kind === "private_reply") {
      await tx
        .update(commentInteractions)
        .set({ state: "expired", updatedAt: now })
        .where(eq(commentInteractions.id, interaction.id));
    } else {
      // Prazo do link venceu: a interação também terminou. Não rebaixa quem
      // já recebeu um link (link_sent).
      await tx
        .update(commentInteractions)
        .set({ state: "expired", updatedAt: now })
        .where(
          and(
            eq(commentInteractions.id, interaction.id),
            inArray(commentInteractions.state, [
              "queued",
              "accepted",
              "gate_pending",
              "uncertain",
            ]),
          ),
        );
    }
  });
}

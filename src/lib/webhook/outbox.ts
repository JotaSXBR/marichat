import "server-only";

import { getDb } from "@/lib/db/client";
import { outboundMessages } from "@/lib/db/schema";

export type OutboundKind =
  | "followup_link"
  | "link_optional"
  | "link_direct"
  | "follow_check"
  | "follow_check_2"
  | "follow_gate";

/**
 * Cria a tarefa de envio. O índice único (interação + tipo) garante que uma
 * repetição não duplique a mensagem; nesse caso devolve `false`.
 */
export async function enqueueOutbound(params: {
  accountId: string;
  interactionId: string;
  kind: OutboundKind;
  payload: unknown;
  delayMs?: number;
}): Promise<boolean> {
  const db = getDb();
  const inserted = await db
    .insert(outboundMessages)
    .values({
      accountId: params.accountId,
      interactionId: params.interactionId,
      kind: params.kind,
      status: "pending",
      // Tarefas de checagem não têm conteúdo de mensagem; o payload guarda
      // apenas o contexto necessário para a auditoria.
      payload: params.payload,
      ...(params.delayMs
        ? { nextAttemptAt: new Date(Date.now() + params.delayMs) }
        : {}),
    })
    .onConflictDoNothing({
      target: [outboundMessages.interactionId, outboundMessages.kind],
    })
    .returning({ id: outboundMessages.id });

  return inserted.length > 0;
}

/**
 * Reagenda a segunda checagem. No modo "travado" a mesma tarefa pode ser
 * reaproveitada a cada toque em "Já segui": em vez de criar outra linha (o
 * índice lógico é por interação + tipo), a existente volta para "pending".
 */
export async function rescheduleFollowCheck(params: {
  accountId: string;
  interactionId: string;
  payload: unknown;
  delayMs?: number;
}): Promise<boolean> {
  const db = getDb();
  const now = new Date();
  const nextAttemptAt = new Date(Date.now() + (params.delayMs ?? 0));

  const rows = await db
    .insert(outboundMessages)
    .values({
      accountId: params.accountId,
      interactionId: params.interactionId,
      kind: "follow_check_2",
      status: "pending",
      payload: params.payload,
      nextAttemptAt,
    })
    .onConflictDoUpdate({
      target: [outboundMessages.interactionId, outboundMessages.kind],
      set: {
        status: "pending",
        attempts: 0,
        payload: params.payload,
        nextAttemptAt,
        acceptedAt: null,
        externalMessageId: null,
        errorCode: null,
        errorMessage: null,
        lockedAt: null,
        lockToken: null,
        updatedAt: now,
      },
    })
    .returning({ id: outboundMessages.id });

  return rows.length > 0;
}

import "server-only";

import { findAccountByInstagramUserId, type Account } from "@/lib/accounts";
import { processComment } from "@/lib/webhook/comment";
import { claimEvent, finishEvent } from "@/lib/webhook/events";
import { processInboundMessage } from "@/lib/webhook/message";
import type {
  CommentValue,
  InboundMessage,
  Outcome,
  WebhookEntry,
  WebhookPayload,
  WebhookSummary,
} from "@/lib/webhook/types";

export { claimEvent, finishEvent } from "@/lib/webhook/events";
export { processComment } from "@/lib/webhook/comment";
export { processInboundMessage } from "@/lib/webhook/message";
export type {
  CommentValue,
  InboundMessage,
  WebhookPayload,
  WebhookSummary,
} from "@/lib/webhook/types";

/**
 * Processamento dos eventos de webhook.
 *
 * Regras principais:
 * - cada evento tem uma chave determinística (dedupe);
 * - a interação e a primeira DM são gravadas na mesma transação;
 * - o conteúdo da mensagem é congelado no momento da criação da tarefa
 *   (editar a automação depois não altera envios já agendados);
 * - a primeira DM é sempre texto puro (sem botão): a pessoa responde para
 *   abrir a janela de 24h e o link é enviado depois;
 * - a porta de seguidor, quando ligada, consulta o perfil somente depois que a
 *   pessoa envia uma mensagem (consentimento) e nunca bloqueia o link para
 *   sempre: no máximo duas checagens e, se a Meta não informar, libera.
 */

const HANDLED_FIELDS = new Set(["comments", "messages", "messaging_postbacks"]);

function eventKeyFor(
  field: string,
  value: CommentValue & InboundMessage,
): string {
  if (field === "comments") return `comment:${value.id ?? "unknown"}`;

  return `message:${
    value.message?.mid ?? value.postback?.mid ?? value.id ?? crypto.randomUUID()
  }`;
}

/**
 * Reserva o evento, executa o processamento e grava o resultado. É o trecho
 * comum aos dois formatos de entrega (changes e messaging) da Meta.
 */
async function runClaimedEvent(params: {
  summary: WebhookSummary;
  eventKey: string;
  field: string;
  instagramUserId: string;
  payload: unknown;
  account: Account | null;
  process: (account: Account) => Promise<Outcome>;
}): Promise<void> {
  params.summary.received += 1;

  const claimed = await claimEvent({
    eventKey: params.eventKey,
    field: params.field,
    instagramUserId: params.instagramUserId,
    payload: params.payload,
  });
  if (!claimed) {
    params.summary.ignored += 1;
    return;
  }

  if (!params.account) {
    await finishEvent(
      params.eventKey,
      "ignored",
      "Conta do Instagram não conectada.",
    );
    params.summary.ignored += 1;
    return;
  }

  let outcome: Outcome;
  try {
    outcome = await params.process(params.account);
  } catch (error) {
    // Sem isso o evento ficaria "received" e o provedor nunca reenviaria.
    await finishEvent(
      params.eventKey,
      "failed",
      error instanceof Error ? error.message : "Falha ao processar o evento.",
    );
    params.summary.failed += 1;
    throw error;
  }
  await finishEvent(params.eventKey, outcome);
  params.summary[outcome] += 1;
}

/** Comentários e, em alguns apps, toques de botão no campo `changes`. */
async function processChangesEntry(params: {
  summary: WebhookSummary;
  account: Account | null;
  entry: WebhookEntry;
  instagramUserId: string;
  notificationTime: Date;
}): Promise<void> {
  const changes = Array.isArray(params.entry.changes)
    ? params.entry.changes
    : [];

  for (const change of changes) {
    const field = change.field;
    if (!field || !HANDLED_FIELDS.has(field)) continue;

    const isComment = field === "comments";
    const value = (change.value ?? {}) as CommentValue & InboundMessage;

    await runClaimedEvent({
      summary: params.summary,
      eventKey: eventKeyFor(field, value),
      field,
      instagramUserId: params.instagramUserId,
      payload: { entryTime: params.entry.time ?? null, change },
      account: params.account,
      process: async (account) => {
        if (isComment) {
          const outcome = await processComment({
            account,
            value,
            notificationTime: params.notificationTime,
          });
          return value.id ? outcome : "ignored";
        }
        return processInboundMessage({ account, message: value });
      },
    });
  }
}

/** Formato alternativo (estilo Messenger) em `entry.messaging`. */
async function processMessagingEntry(params: {
  summary: WebhookSummary;
  account: Account | null;
  entry: WebhookEntry;
  instagramUserId: string;
}): Promise<void> {
  const messaging = Array.isArray(params.entry.messaging)
    ? params.entry.messaging
    : [];

  for (const message of messaging) {
    const mid = message.message?.mid ?? message.postback?.mid;
    if (!mid) continue;

    await runClaimedEvent({
      summary: params.summary,
      eventKey: `message:${mid}`,
      field: "messages",
      instagramUserId: params.instagramUserId,
      payload: { entryTime: params.entry.time ?? null, messaging: message },
      account: params.account,
      process: (account) => processInboundMessage({ account, message }),
    });
  }
}

/**
 * Percorre o payload assinado. Lança apenas quando um evento já reservado
 * falha no processamento (o evento fica marcado como `failed`); a rota
 * responde 5xx para o provedor reenviar e o evento ser retomado.
 */
export async function handleWebhookPayload(
  payload: WebhookPayload,
): Promise<WebhookSummary> {
  const summary: WebhookSummary = {
    received: 0,
    processed: 0,
    ignored: 0,
    failed: 0,
  };

  if (payload.object !== "instagram" || !Array.isArray(payload.entry)) {
    return summary;
  }

  for (const entry of payload.entry) {
    const instagramUserId = entry.id ?? null;
    if (!instagramUserId) continue;

    const notificationTime = entry.time
      ? new Date(entry.time * 1000)
      : new Date();
    const account = await findAccountByInstagramUserId(instagramUserId);

    await processChangesEntry({
      summary,
      account,
      entry,
      instagramUserId,
      notificationTime,
    });
    await processMessagingEntry({
      summary,
      account,
      entry,
      instagramUserId,
    });
  }

  return summary;
}

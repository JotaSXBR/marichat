import "server-only";

import { and, eq } from "drizzle-orm";

import { findAccountByInstagramUserId, type Account } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  outboundMessages,
  webhookEvents,
} from "@/lib/db/schema";
import { IG } from "@/lib/instagram/config";
import {
  commentMatchesKeyword,
  pickAutomation,
} from "@/lib/matching";

/**
 * Processamento dos eventos de webhook.
 *
 * Regras principais:
 * - cada evento tem uma chave determinística (dedupe);
 * - a interação e a primeira DM são gravadas na mesma transação;
 * - o conteúdo da mensagem é congelado no momento da criação da tarefa
 *   (editar a automação depois não altera envios já agendados);
 * - só a segunda DM é agendada quando o usuário toca no botão do quick reply
 *   (o payload opaco é a prova de que houve o toque).
 */

type CommentValue = {
  id?: string;
  text?: string;
  parent_id?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
};

type InboundMessage = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    quick_reply?: { payload?: string };
    reply_to?: { mid?: string };
  };
};

type WebhookEntry = {
  id?: string;
  time?: number;
  changes?: Array<{ field?: string; value?: unknown }>;
  messaging?: InboundMessage[];
};

export type WebhookPayload = {
  object?: string;
  entry?: WebhookEntry[];
};

export type WebhookSummary = {
  received: number;
  processed: number;
  ignored: number;
  failed: number;
};

const MAX_TEXT_BYTES = 1000;

function truncateUtf8(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
  let result = "";
  for (const char of text) {
    if (Buffer.byteLength(result + char, "utf8") > maxBytes) break;
    result += char;
  }
  return result;
}

function truncateChars(text: string, maxChars: number): string {
  return [...text].slice(0, maxChars).join("");
}

function opaqueToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

async function claimEvent(params: {
  eventKey: string;
  field: string;
  instagramUserId: string | null;
  payload: unknown;
}): Promise<boolean> {
  const db = getDb();
  const inserted = await db
    .insert(webhookEvents)
    .values({
      eventKey: params.eventKey,
      field: params.field,
      instagramUserId: params.instagramUserId,
      payload: params.payload,
      status: "received",
    })
    .onConflictDoNothing({ target: webhookEvents.eventKey })
    .returning({ id: webhookEvents.id });
  return inserted.length > 0;
}

async function finishEvent(
  eventKey: string,
  status: "processed" | "ignored" | "failed",
  errorMessage?: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(webhookEvents)
    .set({
      status,
      errorMessage: errorMessage ?? null,
      processedAt: new Date(),
    })
    .where(eq(webhookEvents.eventKey, eventKey));
}

async function findMatchingAutomation(
  account: Account,
  commentText: string,
  mediaId: string,
) {
  const db = getDb();

  const candidates = await db
    .select({
      id: automations.id,
      mediaId: automations.mediaId,
      createdAt: automations.createdAt,
      keyword: automations.keyword,
    })
    .from(automations)
    .where(
      and(
        eq(automations.accountId, account.id),
        eq(automations.isActive, true),
      ),
    )
    .limit(200);

  const matches = candidates.filter((candidate) =>
    commentMatchesKeyword(commentText, candidate.keyword),
  );

  return pickAutomation(matches, mediaId);
}

async function fullAutomation(automationId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(automations)
    .where(eq(automations.id, automationId))
    .limit(1);
  return row ?? null;
}

async function processComment(params: {
  account: Account;
  value: CommentValue;
  notificationTime: Date;
}): Promise<"processed" | "ignored" | "failed"> {
  const { account, value, notificationTime } = params;

  const commentId = value.id;
  const mediaId = value.media?.id;
  const commenterId = value.from?.id;

  // Respostas a outros comentários não recebem resposta privada.
  if (value.parent_id) return "ignored";
  if (!commentId || !mediaId || !commenterId) return "ignored";
  // O próprio perfil comentando não deve receber DM.
  if (commenterId === account.instagramUserId) return "ignored";

  const commentText = value.text ?? null;
  if (!commentText) return "ignored";

  const automation = await findMatchingAutomation(account, commentText, mediaId);
  if (!automation) return "ignored";

  const settings = await fullAutomation(automation.id);
  if (!settings) return "ignored";

  const commentCreatedAt = notificationTime;
  const replyDeadlineAt = new Date(
    commentCreatedAt.getTime() +
      IG.privateReplyWindowMs -
      IG.privateReplySafetyMs,
  );

  const token = opaqueToken();

  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      const [interaction] = await tx
        .insert(commentInteractions)
        .values({
          accountId: account.id,
          automationId: settings.id,
          commentId,
          mediaId,
          commenterIgsid: commenterId,
          commentText,
          commentCreatedAt,
          replyDeadlineAt,
          token,
          state: "queued",
        })
        .onConflictDoNothing({ target: commentInteractions.commentId })
        .returning({ id: commentInteractions.id });

      if (!interaction) return;

      const firstDmText = truncateUtf8(settings.firstDmText, MAX_TEXT_BYTES);
      const quickReplyTitle = truncateChars(settings.quickReplyTitle, 20);

      await tx.insert(outboundMessages).values({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "private_reply",
        status: "pending",
        payload: {
          recipient: { comment_id: commentId },
          message: {
            text: firstDmText,
            quick_replies: [
              {
                content_type: "text",
                title: quickReplyTitle,
                payload: token,
              },
            ],
          },
        },
      });
    });
    return "processed";
  } catch (error) {
    console.error("[webhook] falha ao criar interação de comentário:", error);
    return "failed";
  }
}

async function processInboundMessage(params: {
  account: Account;
  message: InboundMessage;
}): Promise<"processed" | "ignored" | "failed"> {
  const { account, message } = params;
  const senderId = message.sender?.id;
  const mid = message.message?.mid;

  if (!senderId || senderId === account.instagramUserId) return "ignored";
  if (message.message?.is_echo) return "ignored";
  if (!mid) return "ignored";

  const db = getDb();
  const receivedAt = message.timestamp
    ? new Date(message.timestamp * 1000)
    : new Date();

  // Qualquer mensagem do usuário atualiza a janela de 24h das interações
  // conhecidas dele (não é necessário ser o toque no botão).
  await db
    .update(commentInteractions)
    .set({ userLastMessageAt: receivedAt, updatedAt: new Date() })
    .where(
      and(
        eq(commentInteractions.accountId, account.id),
        eq(commentInteractions.commenterIgsid, senderId),
      ),
    );

  const quickReplyPayload = message.message?.quick_reply?.payload;
  if (!quickReplyPayload) return "ignored";

  const [interaction] = await db
    .select()
    .from(commentInteractions)
    .where(
      and(
        eq(commentInteractions.accountId, account.id),
        eq(commentInteractions.token, quickReplyPayload),
        eq(commentInteractions.commenterIgsid, senderId),
      ),
    )
    .limit(1);

  if (!interaction) return "ignored";
  if (interaction.state === "link_sent") return "ignored";

  const deadline =
    (interaction.userLastMessageAt ?? receivedAt).getTime() +
    IG.messagingWindowMs;
  if (Date.now() >= deadline) return "ignored";

  const [settings] = await db
    .select()
    .from(automations)
    .where(eq(automations.id, interaction.automationId))
    .limit(1);

  if (!settings) return "ignored";

  const title = truncateChars(settings.secondDmText, 80);
  const buttonTitle = truncateChars(settings.linkButtonTitle, 20);

  try {
    const inserted = await db
      .insert(outboundMessages)
      .values({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "followup_link",
        status: "pending",
        payload: {
          recipient: { id: senderId },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                elements: [
                  {
                    title,
                    buttons: [
                      {
                        type: "web_url",
                        url: settings.linkUrl,
                        title: buttonTitle,
                      },
                    ],
                  },
                ],
              },
            },
          },
        },
      })
      .onConflictDoNothing({
        target: [outboundMessages.interactionId, outboundMessages.kind],
      })
      .returning({ id: outboundMessages.id });

    if (inserted.length === 0) return "ignored";

    await db
      .update(commentInteractions)
      .set({ userLastMessageAt: receivedAt, updatedAt: new Date() })
      .where(eq(commentInteractions.id, interaction.id));

    return "processed";
  } catch (error) {
    console.error("[webhook] falha ao agendar o link:", error);
    return "failed";
  }
}

/**
 * Percorre o payload assinado. Nunca lança: o webhook precisa responder 200
 * rápido para a Meta. Falhas ficam registradas em webhook_events.
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
    const notificationTime = entry.time
      ? new Date(entry.time * 1000)
      : new Date();

    if (!instagramUserId) continue;

    const account = await findAccountByInstagramUserId(instagramUserId);

    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change.field !== "comments" && change.field !== "messages") continue;
      const value = (change.value ?? {}) as CommentValue & InboundMessage;

      const eventKey =
        change.field === "comments"
          ? `comment:${value.id ?? "unknown"}`
          : `message:${value.message?.mid ?? value.id ?? crypto.randomUUID()}`;

      summary.received += 1;
      const claimed = await claimEvent({
        eventKey,
        field: change.field,
        instagramUserId,
        payload: { entryTime: entry.time ?? null, change },
      });
      if (!claimed) {
        summary.ignored += 1;
        continue;
      }

      if (!account) {
        await finishEvent(eventKey, "ignored", "Conta do Instagram não conectada.");
        summary.ignored += 1;
        continue;
      }

      let outcome: "processed" | "ignored" | "failed" =
        change.field === "comments"
          ? await processComment({
              account,
              value,
              notificationTime,
            })
          : await processInboundMessage({ account, message: value });

      if (change.field === "comments" && !value.id) outcome = "ignored";

      await finishEvent(eventKey, outcome);
      summary[outcome] += 1;
    }

    // Alguns setups entregam mensagens em `entry.messaging` (estilo Messenger).
    const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const message of messaging) {
      const mid = message.message?.mid;
      if (!mid) continue;
      const eventKey = `message:${mid}`;

      summary.received += 1;
      const claimed = await claimEvent({
        eventKey,
        field: "messages",
        instagramUserId,
        payload: { entryTime: entry.time ?? null, messaging: message },
      });
      if (!claimed) {
        summary.ignored += 1;
        continue;
      }

      if (!account) {
        await finishEvent(eventKey, "ignored", "Conta do Instagram não conectada.");
        summary.ignored += 1;
        continue;
      }

      const outcome = await processInboundMessage({ account, message });
      await finishEvent(eventKey, outcome);
      summary[outcome] += 1;
    }
  }

  return summary;
}

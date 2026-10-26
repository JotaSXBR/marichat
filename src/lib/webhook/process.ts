import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { findAccountByInstagramUserId, type Account } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  outboundMessages,
  webhookEvents,
} from "@/lib/db/schema";
import { IG } from "@/lib/instagram/config";
import { isFollowMode, type FollowMode } from "@/lib/follow-mode";
import {
  commentMatchesKeyword,
  pickAutomation,
} from "@/lib/matching";
import {
  buildDirectLinkPayload,
  buildLinkPayload,
  buildOptionalLinkPayload,
  buildPrivateReplyPayload,
} from "@/lib/outbound";

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

export type CommentValue = {
  id?: string;
  text?: string;
  parent_id?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string; media_product_type?: string };
};

export type InboundMessage = {
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
  postback?: {
    mid?: string;
    title?: string;
    payload?: string;
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

type InteractionRow = typeof commentInteractions.$inferSelect;

function opaqueToken(): string {
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function claimEvent(params: {
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

export async function finishEvent(
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

export async function processComment(params: {
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

      // Primeira DM em texto puro, conforme a documentação da Meta para
      // respostas privadas. O botão deixaria de ser garantido e a pessoa
      // responde livremente para abrir a janela de 24h.
      await tx.insert(outboundMessages).values({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "private_reply",
        status: "pending",
        payload: buildPrivateReplyPayload(settings, commentId),
      });
    });
    return "processed";
  } catch (error) {
    console.error("[webhook] falha ao criar interação de comentário:", error);
    return "failed";
  }
}

async function enqueueOutbound(params: {
  accountId: string;
  interactionId: string;
  kind:
    | "followup_link"
    | "link_optional"
    | "link_direct"
    | "follow_check"
    | "follow_check_2"
    | "follow_gate";
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
async function rescheduleFollowCheck(params: {
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

export async function processInboundMessage(params: {
  account: Account;
  message: InboundMessage;
  /** Conversa no provedor (Zernio). Necessária para a DM 2. */
  conversationId?: string;
}): Promise<"processed" | "ignored" | "failed"> {
  const { account, message } = params;
  const senderId = message.sender?.id;
  const postback = message.postback;
  const mid = message.message?.mid ?? postback?.mid;

  if (!senderId || senderId === account.instagramUserId) return "ignored";
  if (message.message?.is_echo) return "ignored";
  if (!mid) return "ignored";

  const db = getDb();
  const receivedAt = message.timestamp
    ? new Date(message.timestamp * 1000)
    : new Date();

  // Qualquer mensagem do usuário atualiza a janela de 24h das interações
  // conhecidas dele (não é necessário ser um toque em botão).
  await db
    .update(commentInteractions)
    .set({
      userLastMessageAt: receivedAt,
      ...(params.conversationId
        ? { providerConversationId: params.conversationId }
        : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(commentInteractions.accountId, account.id),
        eq(commentInteractions.commenterIgsid, senderId),
      ),
    );

  // O botão "Já segui" chega como postback; o formato antigo de quick reply
  // também continua aceito para não quebrar conversas em andamento.
  const quickReplyPayload = message.message?.quick_reply?.payload;
  const postbackPayload = postback?.payload;
  const tokenFromPayload = quickReplyPayload
    ? quickReplyPayload
    : postbackPayload?.startsWith("gate:")
      ? postbackPayload.slice("gate:".length)
      : null;

  let interaction: InteractionRow | undefined;
  if (tokenFromPayload) {
    [interaction] = await db
      .select()
      .from(commentInteractions)
      .where(
        and(
          eq(commentInteractions.accountId, account.id),
          eq(commentInteractions.token, tokenFromPayload),
          eq(commentInteractions.commenterIgsid, senderId),
        ),
      )
      .limit(1);
  } else {
    // Texto livre: a interação mais recente desta pessoa nesta conta.
    [interaction] = await db
      .select()
      .from(commentInteractions)
      .where(
        and(
          eq(commentInteractions.accountId, account.id),
          eq(commentInteractions.commenterIgsid, senderId),
        ),
      )
      .orderBy(desc(commentInteractions.createdAt))
      .limit(1);
  }

  if (!interaction) return "ignored";
  if (
    interaction.state === "link_sent" ||
    interaction.state === "expired" ||
    interaction.state === "failed" ||
    interaction.state === "canceled"
  ) {
    return "ignored";
  }

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

  const isGateTap = postbackPayload === `gate:${interaction.token}`;
  const mode: FollowMode = isFollowMode(settings.followMode)
    ? settings.followMode
    : "off";

  try {
    if (mode === "off") {
      const created = await enqueueOutbound({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "followup_link",
        payload: buildLinkPayload(settings, senderId),
      });
      return created ? "processed" : "ignored";
    }

    if (mode === "optional") {
      const created = await enqueueOutbound({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "link_optional",
        payload: buildOptionalLinkPayload({
          settings,
          username: account.username,
          senderId,
        }),
      });
      return created ? "processed" : "ignored";
    }

    if (mode === "direct") {
      const created = await enqueueOutbound({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "link_direct",
        payload: buildDirectLinkPayload({ settings, senderId }),
      });
      return created ? "processed" : "ignored";
    }

    // Modos com checagem de perfil (soft e locked).
    if (isGateTap) {
      if (mode === "soft" && interaction.followChecks >= 2) {
        // No modo tolerante o limite libera o link de qualquer forma.
        const created = await enqueueOutbound({
          accountId: account.id,
          interactionId: interaction.id,
          kind: "followup_link",
          payload: buildLinkPayload(settings, senderId),
        });
        return created ? "processed" : "ignored";
      }

      if (
        mode === "locked" &&
        interaction.followChecks >= IG.maxLockedFollowChecks
      ) {
        // "Travado" é travado: depois do limite não insistimos com a Meta.
        return "ignored";
      }

      const created = await rescheduleFollowCheck({
        accountId: account.id,
        interactionId: interaction.id,
        payload: { check: interaction.followChecks + 1, senderId },
        // Dá tempo para a Meta refletir o follow recém-feito.
        delayMs: IG.followCheckDelayMs,
      });
      return created ? "processed" : "ignored";
    }

    if (interaction.state === "accepted" || interaction.state === "queued") {
      const created = await enqueueOutbound({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "follow_check",
        payload: { check: 1, senderId },
      });
      return created ? "processed" : "ignored";
    }

    // Ainda aguardando o toque em "Já segui": mensagens livres não geram
    // novas checagens.
    return "ignored";
  } catch (error) {
    console.error("[webhook] falha ao agendar a continuação:", error);
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
      const field = change.field;
      if (
        field !== "comments" &&
        field !== "messages" &&
        field !== "messaging_postbacks"
      ) {
        continue;
      }
      const isComment = field === "comments";
      // O toque em botão pode chegar neste campo, dependendo do app da Meta.
      const value = (change.value ?? {}) as CommentValue & InboundMessage;

      const eventKey = isComment
        ? `comment:${value.id ?? "unknown"}`
        : `message:${
            value.message?.mid ??
            value.postback?.mid ??
            value.id ??
            crypto.randomUUID()
          }`;

      summary.received += 1;
      const claimed = await claimEvent({
        eventKey,
        field,
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

      let outcome: "processed" | "ignored" | "failed" = isComment
        ? await processComment({
            account,
            value,
            notificationTime,
          })
        : await processInboundMessage({ account, message: value });

      if (isComment && !value.id) outcome = "ignored";

      await finishEvent(eventKey, outcome);
      summary[outcome] += 1;
    }

    // Alguns setups entregam mensagens em `entry.messaging` (estilo Messenger).
    const messaging = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const message of messaging) {
      const mid = message.message?.mid ?? message.postback?.mid;
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

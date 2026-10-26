import "server-only";

import { findAccountByProviderAccountId, type Account } from "@/lib/accounts";
import {
  claimEvent,
  finishEvent,
  processComment,
  processInboundMessage,
  type CommentValue,
  type InboundMessage,
  type WebhookSummary,
} from "@/lib/webhook/process";

/**
 * Tradução dos eventos da Zernio para o motor que já existe.
 *
 * A Zernio entrega `comment.received` e `message.received` com nomes de campo
 * próprios. Em vez de duplicar as regras (palavra-chave, cinco modos, prazos),
 * convertemos cada evento para o formato interno e chamamos as mesmas funções
 * do webhook da Meta.
 */

export type ZernioEvent = {
  id?: string;
  event?: string;
  timestamp?: string;
  test?: boolean;
  account?: { accountId?: string; id?: string; platform?: string };
  comment?: {
    id?: string;
    postId?: string | null;
    platformPostId?: string;
    platform?: string;
    text?: string;
    createdAt?: string;
    isReply?: boolean;
    parentCommentId?: string | null;
    author?: {
      id?: string;
      username?: string;
      isOwnAccount?: boolean;
    };
  };
  message?: {
    id?: string;
    conversationId?: string;
    platform?: string;
    platformMessageId?: string;
    direction?: string;
    text?: string | null;
    sender?: { id?: string };
    sentAt?: string;
  };
  metadata?: {
    postbackPayload?: string;
    interactiveType?: string;
    interactiveId?: string;
    standby?: boolean;
  } | null;
};

function accountIdOf(event: ZernioEvent): string | null {
  return event.account?.accountId ?? event.account?.id ?? null;
}

function eventTime(event: ZernioEvent): Date {
  const raw = event.timestamp ?? event.comment?.createdAt ?? event.message?.sentAt;
  if (!raw) return new Date();
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export async function handleZernioEvent(
  event: ZernioEvent,
  /** `X-Zernio-Event-Id`; usado quando o corpo não traz `id`. */
  headerEventId?: string | null,
): Promise<WebhookSummary> {
  const summary: WebhookSummary = {
    received: 0,
    processed: 0,
    ignored: 0,
    failed: 0,
  };

  if (event.test) return summary;
  if (event.event !== "comment.received" && event.event !== "message.received") {
    return summary;
  }

  const providerAccountId = accountIdOf(event);
  if (!providerAccountId) return summary;

  const account = await findAccountByProviderAccountId(providerAccountId);
  const eventKey = `zernio:${event.id ?? headerEventId ?? crypto.randomUUID()}`;
  const field = event.event === "comment.received" ? "comments" : "messages";

  summary.received += 1;
  const claimed = await claimEvent({
    eventKey,
    field,
    instagramUserId: account?.instagramUserId ?? providerAccountId,
    payload: event,
  });
  if (!claimed) {
    summary.ignored += 1;
    return summary;
  }

  if (!account) {
    await finishEvent(
      eventKey,
      "ignored",
      "Conta da Zernio não encontrada no MARICHAT. Reconecte em Conexão.",
    );
    summary.ignored += 1;
    return summary;
  }

  let outcome: "processed" | "ignored" | "failed" = "ignored";

  if (event.event === "comment.received") {
    outcome = await handleComment(account, event);
  } else {
    outcome = await handleMessage(account, event);
  }

  await finishEvent(eventKey, outcome);
  summary[outcome] += 1;
  return summary;
}

async function handleComment(
  account: Account,
  event: ZernioEvent,
): Promise<"processed" | "ignored" | "failed"> {
  const comment = event.comment;
  if (!comment) return "ignored";

  // Comentário do próprio perfil não gera DM.
  if (comment.author?.isOwnAccount) return "ignored";

  const value: CommentValue = {
    id: comment.id,
    text: comment.text,
    // `isReply` marca resposta a outro comentário: sem resposta privada.
    parent_id: comment.isReply
      ? (comment.parentCommentId ?? "reply")
      : undefined,
    from: { id: comment.author?.id, username: comment.author?.username },
    media: { id: comment.platformPostId },
  };

  return processComment({
    account,
    value,
    notificationTime: eventTime(event),
  });
}

async function handleMessage(
  account: Account,
  event: ZernioEvent,
): Promise<"processed" | "ignored" | "failed"> {
  const message = event.message;
  if (!message) return "ignored";
  // Eco da nossa própria mensagem ou conversa dominada por outro app.
  if (message.direction === "outgoing") return "ignored";
  if (event.metadata?.standby) return "ignored";

  const metadata = event.metadata ?? {};
  const postbackPayload = metadata.postbackPayload;
  const quickReplyPayload = metadata.interactiveId;

  const inbound: InboundMessage = {
    sender: { id: message.sender?.id },
    recipient: { id: account.instagramUserId },
    timestamp: Math.floor(eventTime(event).getTime() / 1000),
    message: {
      mid: message.platformMessageId ?? message.id,
      text: message.text ?? undefined,
      ...(postbackPayload
        ? {}
        : quickReplyPayload
          ? { quick_reply: { payload: quickReplyPayload } }
          : {}),
    },
    ...(postbackPayload
      ? {
          postback: {
            mid: message.platformMessageId ?? message.id,
            payload: postbackPayload,
          },
        }
      : {}),
  };

  return processInboundMessage({
    account,
    message: inbound,
    conversationId: message.conversationId,
  });
}

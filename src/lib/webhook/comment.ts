import "server-only";

import type { Account } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import { commentInteractions, outboundMessages } from "@/lib/db/schema";
import { IG } from "@/lib/instagram/config";
import { buildPrivateReplyPayload } from "@/lib/outbound";
import { pickPublicReply } from "@/lib/public-replies";
import {
  fullAutomation,
  findMatchingAutomation,
} from "@/lib/webhook/automation";
import { opaqueToken } from "@/lib/webhook/events";
import type { CommentValue, Outcome } from "@/lib/webhook/types";

type CommentCreation = {
  account: Account;
  settings: NonNullable<Awaited<ReturnType<typeof fullAutomation>>>;
  commentId: string;
  mediaId: string;
  commenterId: string;
  commenterUsername: string | null | undefined;
  commentText: string;
  commentCreatedAt: Date;
  replyDeadlineAt: Date;
};

/** Grava a interação e a primeira DM na mesma transação. */
async function createInteractionWithFirstDm(
  params: CommentCreation,
): Promise<Outcome> {
  const db = getDb();
  try {
    await db.transaction(async (tx) => {
      const [interaction] = await tx
        .insert(commentInteractions)
        .values({
          accountId: params.account.id,
          automationId: params.settings.id,
          commentId: params.commentId,
          mediaId: params.mediaId,
          commenterIgsid: params.commenterId,
          commenterUsername: params.commenterUsername?.trim() || null,
          commentText: params.commentText,
          commentCreatedAt: params.commentCreatedAt,
          replyDeadlineAt: params.replyDeadlineAt,
          token: opaqueToken(),
          state: "queued",
        })
        .onConflictDoNothing({ target: commentInteractions.commentId })
        .returning({
          id: commentInteractions.id,
          token: commentInteractions.token,
        });

      if (!interaction) return;

      // A resposta pública sai antes da DM: é o que o comentário mostra em
      // público, e não gasta a resposta privada se falhar.
      const publicReply = pickPublicReply(params.settings.publicReplies);
      if (publicReply) {
        await tx.insert(outboundMessages).values({
          accountId: params.account.id,
          interactionId: interaction.id,
          kind: "public_reply",
          status: "pending",
          payload: { message: publicReply },
          // Um segundo à frente da DM: a fila atende por next_attempt_at e as
          // duas tarefas nascem no mesmo instante.
          nextAttemptAt: new Date(Date.now() - 1000),
        });
      }

      // A primeira DM entra na mesma transação. Com botão, o postback carrega
      // o token da interação para o toque cair na conversa certa.
      await tx.insert(outboundMessages).values({
        accountId: params.account.id,
        interactionId: interaction.id,
        kind: "private_reply",
        status: "pending",
        payload: buildPrivateReplyPayload(
          params.settings,
          params.commentId,
          interaction.token,
        ),
      });
    });
    return "processed";
  } catch (error) {
    console.error("[webhook] falha ao criar interação de comentário:", error);
    return "failed";
  }
}

/** @ do comentarista quando o webhook manda; a Meta não permite buscar por ID. */
function usernameOf(value: CommentValue): string | null {
  return value.from?.username ?? null;
}

/**
 * Comentário que casa com uma automação ativa: cria a interação e a primeira
 * DM (texto puro) na mesma transação.
 */
export async function processComment(params: {
  account: Account;
  value: CommentValue;
  notificationTime: Date;
}): Promise<Outcome> {
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

  const automation = await findMatchingAutomation(
    account,
    commentText,
    mediaId,
  );
  if (!automation) return "ignored";

  const settings = await fullAutomation(automation.id);
  if (!settings) return "ignored";

  const commentCreatedAt = notificationTime;
  const replyDeadlineAt = new Date(
    commentCreatedAt.getTime() +
      IG.privateReplyWindowMs -
      IG.privateReplySafetyMs,
  );

  return createInteractionWithFirstDm({
    account,
    settings,
    commentId,
    mediaId,
    commenterId,
    commenterUsername: usernameOf(value),
    commentText,
    commentCreatedAt,
    replyDeadlineAt,
  });
}

import "server-only";

import { markAccountReconnectRequired, setAppStateValue } from "@/lib/accounts";
import { decryptToken } from "@/lib/crypto";
import { InstagramApiError, sendMessage } from "@/lib/instagram/client";
import { IG } from "@/lib/instagram/config";
import { toZernioMessage } from "@/lib/outbound";
import { deadlineFor } from "@/lib/queue/deadline";
import { processFollowCheck } from "@/lib/queue/follow-check";
import {
  markAccepted,
  markExpired,
  markFailed,
  markUncertain,
} from "@/lib/queue/job-state";
import {
  privateReplyUsage,
  requeueForConnection,
  requeueForRateLimit,
  retryOrFail,
} from "@/lib/queue/retry";
import type {
  AccountRow,
  InteractionRow,
  JobOutcome,
  JobRow,
} from "@/lib/queue/types";
import {
  ZernioApiError,
  sendConversationMessage,
  sendPrivateReply,
} from "@/lib/zernio/client";

/** Prazo e conexão: devolve um resultado quando a tarefa não pode seguir. */
async function blockedIfNotSendable(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<JobOutcome | null> {
  const deadline = deadlineFor(job, interaction);
  if (deadline === null || Date.now() >= deadline) {
    await markExpired(job, interaction);
    return "expired";
  }

  if (account.connectionStatus !== "connected") {
    await requeueForConnection(
      job,
      "A conexão com o Instagram precisa ser restabelecida antes do envio.",
    );
    return "requeued";
  }

  return null;
}

type TokenResult = { token: string | null } | { outcome: JobOutcome };

async function readAccessToken(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<TokenResult> {
  if (account.provider === "zernio") return { token: null };

  try {
    return { token: decryptToken(account.accessTokenEncrypted) };
  } catch {
    await markAccountReconnectRequired(account.id);
    await markFailed(
      job,
      interaction,
      "Não foi possível ler o token guardado. Reconecte o Instagram.",
      "TOKEN_UNREADABLE",
    );
    return { outcome: "failed" };
  }
}

/**
 * Envio pela Zernio.
 *
 * A resposta privada usa IDs da própria Meta (`mediaId` e `commentId`), então
 * funciona em posts antigos. As demais mensagens vão para a conversa aberta
 * quando a pessoa respondeu — por isso `providerConversationId` é obrigatório.
 *
 * A `Idempotency-Key` é o id da tarefa: se a resposta se perder e a tarefa for
 * repetida dentro de 24h, a Zernio devolve o resultado anterior em vez de
 * mandar duas vezes.
 */
async function sendWithZernio(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<{ messageId: string }> {
  if (!account.providerAccountId) {
    throw new ZernioApiError(
      "A conta da Zernio não está vinculada. Reconecte em Conexão.",
      409,
      "provider_account_missing",
    );
  }

  const content = toZernioMessage(job.payload);

  if (job.kind === "private_reply") {
    return sendPrivateReply({
      accountId: account.providerAccountId,
      postId: interaction.mediaId,
      commentId: interaction.commentId,
      ...content,
      idempotencyKey: job.id,
    });
  }

  if (!interaction.providerConversationId) {
    throw new ZernioApiError(
      "A conversa ainda não foi registrada. A pessoa precisa responder à primeira mensagem para abrir a janela.",
      409,
      "conversation_missing",
    );
  }

  return sendConversationMessage({
    accountId: account.providerAccountId,
    conversationId: interaction.providerConversationId,
    ...content,
    idempotencyKey: job.id,
  });
}

function sendViaProvider(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
  accessToken: string | null,
): Promise<{ messageId: string }> {
  if (account.provider === "zernio") {
    return sendWithZernio(job, account, interaction);
  }

  return sendMessage({
    igUserId: account.instagramUserId,
    accessToken: accessToken ?? "",
    body: job.payload,
  });
}

async function handleZernioError(
  error: ZernioApiError,
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<JobOutcome> {
  if (error.authProblem) {
    await markAccountReconnectRequired(account.id);
    await markFailed(
      job,
      interaction,
      "A Zernio recusou a chave de API. Confira ZERNIO_API_KEY e reconecte.",
      error.code ?? "AUTH",
    );
    return "failed";
  }

  // A resposta privada deste comentário já foi gasta: repetir nunca funciona
  // e a Meta recusa a segunda tentativa.
  if (error.privateReplyConsumed) {
    await markFailed(
      job,
      interaction,
      "A resposta privada deste comentário já foi usada. Não é possível reenviar.",
      "PRIVATE_REPLY_CONSUMED",
    );
    return "failed";
  }

  // Falha depois do envio: pode ter sido entregue. Não repetir às cegas.
  if (error.outcomeUnknown || error.status === 0) {
    await markUncertain(
      job,
      interaction,
      "A Zernio não confirmou se a mensagem foi entregue. Confira a conversa antes de reenviar.",
    );
    return "uncertain";
  }

  if (error.retryable) {
    return retryOrFail(
      job,
      interaction,
      `A Zernio limitou ou está instável: ${error.message}`,
      error.code ?? null,
    );
  }

  await markFailed(job, interaction, error.message, error.code ?? null);
  return "failed";
}

async function handleInstagramError(
  error: InstagramApiError,
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<JobOutcome> {
  const code = error.code ? String(error.code) : null;

  if (error.authProblem) {
    await markAccountReconnectRequired(account.id);
    await markFailed(
      job,
      interaction,
      "O Instagram recusou o token. Reconecte a conta para continuar.",
      code ?? "AUTH",
    );
    return "failed";
  }

  if (error.retryable) {
    return retryOrFail(
      job,
      interaction,
      `A Meta limitou ou está instável: ${error.message}`,
      code,
    );
  }

  await markFailed(job, interaction, error.message, code);
  return "failed";
}

async function handleSendError(
  error: unknown,
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<JobOutcome> {
  if (error instanceof ZernioApiError) {
    return handleZernioError(error, job, account, interaction);
  }
  if (error instanceof InstagramApiError) {
    return handleInstagramError(error, job, account, interaction);
  }

  // Timeout/rede: não é possível saber se a Meta recebeu a mensagem.
  await markUncertain(
    job,
    interaction,
    "Não foi possível confirmar se a Meta recebeu esta mensagem. Uma nova tentativa manual pode gerar duplicação.",
  );
  return "uncertain";
}

export async function processJob(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<JobOutcome> {
  if (job.kind === "follow_check" || job.kind === "follow_check_2") {
    return processFollowCheck(job, account, interaction);
  }

  const blocked = await blockedIfNotSendable(job, account, interaction);
  if (blocked) return blocked;

  const token = await readAccessToken(job, account, interaction);
  if ("outcome" in token) return token.outcome;

  if (job.kind === "private_reply") {
    const usage = await privateReplyUsage(account.id);
    if (usage.count >= IG.privateReplyLimitPerHour && usage.retryAt) {
      await requeueForRateLimit(job, usage.retryAt);
      return "requeued";
    }
  }

  try {
    const sent = await sendViaProvider(job, account, interaction, token.token);
    await markAccepted(job, interaction, sent.messageId);
    await setAppStateValue("last_send_accepted_at", new Date().toISOString());
    return "accepted";
  } catch (error) {
    return handleSendError(error, job, account, interaction);
  }
}

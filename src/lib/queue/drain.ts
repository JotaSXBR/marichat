import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, gte, sql } from "drizzle-orm";

import {
  getActiveAccount,
  getAppStateValue,
  markAccountReconnectRequired,
  setAppStateValue,
} from "@/lib/accounts";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  instagramAccounts,
  outboundMessages,
} from "@/lib/db/schema";
import {
  InstagramApiError,
  getUserProfile,
  refreshLongLivedToken,
  sendMessage,
} from "@/lib/instagram/client";
import { IG } from "@/lib/instagram/config";
import { isFollowMode } from "@/lib/follow-mode";
import {
  buildGatePayload,
  buildLinkPayload,
  toZernioMessage,
} from "@/lib/outbound";
import {
  ZernioApiError,
  getFollowStatus,
  sendConversationMessage,
  sendPrivateReply,
} from "@/lib/zernio/client";

type JobRow = typeof outboundMessages.$inferSelect;
type InteractionRow = typeof commentInteractions.$inferSelect;
type AccountRow = typeof instagramAccounts.$inferSelect;

export type DrainSummary = {
  processed: number;
  accepted: number;
  failed: number;
  uncertain: number;
  expired: number;
  requeued: number;
};

const EMPTY_SUMMARY: DrainSummary = {
  processed: 0,
  accepted: 0,
  failed: 0,
  uncertain: 0,
  expired: 0,
  requeued: 0,
};

/**
 * Recupera tarefas que ficaram "processing" porque o processo morreu.
 * O resultado do envio é desconhecido: NÃO reenvia automaticamente.
 */
export async function recoverStuckJobs(): Promise<number> {
  const db = getDb();
  const result = await db.execute(sql`
    UPDATE outbound_messages
    SET status = 'uncertain',
        error_code = 'INTERRUPTED',
        error_message = 'O processo foi interrompido durante o envio; o resultado é desconhecido.',
        locked_at = NULL,
        lock_token = NULL,
        updated_at = now()
    WHERE status = 'processing'
      AND locked_at < now() - interval '10 minutes'
  `);

  await db.execute(sql`
    UPDATE comment_interactions ci
    SET state = 'uncertain', updated_at = now()
    WHERE ci.state IN ('queued')
      AND EXISTS (
        SELECT 1 FROM outbound_messages om
        WHERE om.interaction_id = ci.id
          AND om.kind = 'private_reply'
          AND om.status = 'uncertain'
      )
  `);

  return (result as unknown as { count?: number }).count ?? 0;
}

/** Marca como expiradas as tarefas cujo prazo da Meta já passou. */
export async function expireOverdueJobs(): Promise<number> {
  const db = getDb();

  const result = await db.execute(sql`
    UPDATE outbound_messages om
    SET status = 'expired',
        error_code = 'EXPIRED',
        error_message = 'O prazo permitido pela Meta para esta mensagem expirou.',
        locked_at = NULL,
        lock_token = NULL,
        updated_at = now()
    FROM comment_interactions ci
    WHERE om.interaction_id = ci.id
      AND om.status = 'pending'
      AND (
        (om.kind = 'private_reply' AND ci.reply_deadline_at <= now())
        OR (
          om.kind IN (
            'followup_link',
            'link_optional',
            'link_direct',
            'follow_gate',
            'follow_check',
            'follow_check_2'
          )
          AND ci.user_last_message_at IS NOT NULL
          AND ci.user_last_message_at <= now() - interval '24 hours'
        )
      )
  `);

  await db.execute(sql`
    UPDATE comment_interactions ci
    SET state = 'expired', updated_at = now()
    WHERE ci.state IN ('queued', 'uncertain')
      AND EXISTS (
        SELECT 1 FROM outbound_messages om
        WHERE om.interaction_id = ci.id
          AND om.kind = 'private_reply'
          AND om.status = 'expired'
      )
  `);

  return (result as unknown as { count?: number }).count ?? 0;
}

async function claimNextJob(): Promise<JobRow | null> {
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

async function updateJobIfLocked(
  job: JobRow,
  values: Partial<typeof outboundMessages.$inferInsert>,
): Promise<boolean> {
  const db = getDb();
  const updated = await db
    .update(outboundMessages)
    .set({ ...values, updatedAt: new Date() })
    .where(
      and(
        eq(outboundMessages.id, job.id),
        job.lockToken ? eq(outboundMessages.lockToken, job.lockToken) : sql`true`,
      ),
    )
    .returning({ id: outboundMessages.id });
  return updated.length > 0;
}

function deadlineFor(
  job: JobRow,
  interaction: InteractionRow,
): number | null {
  if (job.kind === "private_reply") {
    return interaction.replyDeadlineAt.getTime();
  }
  if (!interaction.userLastMessageAt) return null;
  return interaction.userLastMessageAt.getTime() + IG.messagingWindowMs;
}

async function markAccepted(
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
      .where(
        and(
          eq(outboundMessages.id, job.id),
          job.lockToken
            ? eq(outboundMessages.lockToken, job.lockToken)
            : sql`true`,
        ),
      )
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

    if (job.kind === "followup_link" || job.kind === "link_optional" || job.kind === "link_direct") {
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

async function markUncertain(
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
      .where(
        and(
          eq(outboundMessages.id, job.id),
          job.lockToken
            ? eq(outboundMessages.lockToken, job.lockToken)
            : sql`true`,
        ),
      )
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

async function markFailed(
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
      .where(
        and(
          eq(outboundMessages.id, job.id),
          job.lockToken
            ? eq(outboundMessages.lockToken, job.lockToken)
            : sql`true`,
        ),
      )
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

async function markExpired(
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
      .where(
        and(
          eq(outboundMessages.id, job.id),
          job.lockToken
            ? eq(outboundMessages.lockToken, job.lockToken)
            : sql`true`,
        ),
      )
      .returning({ id: outboundMessages.id });

    if (updated.length === 0) return;

    if (job.kind === "private_reply") {
      await tx
        .update(commentInteractions)
        .set({ state: "expired", updatedAt: now })
        .where(eq(commentInteractions.id, interaction.id));
    }
  });
}

async function requeueForConnection(
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
async function privateReplyUsage(accountId: string): Promise<{
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

async function requeueForRateLimit(
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

async function retryOrFail(
  job: JobRow,
  interaction: InteractionRow,
  message: string,
  code: string | null,
): Promise<"failed" | "requeued"> {
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
    IG.retryDelaysMs[
      Math.min(job.attempts - 1, IG.retryDelaysMs.length - 1)
    ] ?? IG.retryDelaysMs[0];

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

/**
 * Porta de seguidor: consulta o perfil (somente depois que a pessoa enviou
 * uma mensagem) e decide entre liberar o link ou enviar a mensagem com os
 * botões "Seguir agora" e "Já segui".
 *
 * Regras de segurança do fluxo:
 * - nunca bloqueia para sempre: no máximo duas checagens;
 * - se a Meta não informar o status, o link é liberado;
 * - a tarefa de checagem não envia nada: só agenda a próxima mensagem.
 */
async function processFollowCheck(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<"accepted" | "failed" | "uncertain" | "requeued" | "expired"> {
  const deadline = deadlineFor(job, interaction);
  if (deadline === null || Date.now() >= deadline) {
    await markExpired(job, interaction);
    return "expired";
  }

  if (account.connectionStatus !== "connected") {
    await requeueForConnection(
      job,
      "A conexão com o Instagram precisa ser restabelecida antes da checagem.",
    );
    return "requeued";
  }

  let accessToken: string | null = null;
  if (account.provider !== "zernio") {
    try {
      accessToken = decryptToken(account.accessTokenEncrypted);
    } catch {
      await markAccountReconnectRequired(account.id);
      await markFailed(
        job,
        interaction,
        "Não foi possível ler o token guardado. Reconecte o Instagram.",
        "TOKEN_UNREADABLE",
      );
      return "failed";
    }
  }

  const db = getDb();
  const [settings] = await db
    .select()
    .from(automations)
    .where(eq(automations.id, interaction.automationId))
    .limit(1);

  if (!settings) {
    await markFailed(
      job,
      interaction,
      "A automação original não existe mais.",
      "AUTOMATION_MISSING",
    );
    return "failed";
  }

  let isFollowing: boolean | null;
  let profileError: string | undefined;

  if (account.provider === "zernio") {
    if (!account.providerAccountId) {
      await markFailed(
        job,
        interaction,
        "A conta da Zernio não está vinculada. Reconecte em Conexão.",
        "PROVIDER_ACCOUNT_MISSING",
      );
      return "failed";
    }
    try {
      const status = await getFollowStatus({
        accountId: account.providerAccountId,
        userId: interaction.commenterIgsid,
        // O follow recém-feito demora alguns segundos para aparecer no perfil.
        refresh: true,
      });
      isFollowing = status.isFollowing;
      profileError = status.unavailableReason;
    } catch (error) {
      // Consulta indisponível não deve travar o fluxo: tratamos como
      // "desconhecido" e a decisão segue igual à da Meta.
      profileError = error instanceof Error ? error.message : "erro desconhecido";
      isFollowing = null;
    }
  } else {
    const profile = await getUserProfile({
      accessToken: accessToken ?? "",
      igsid: interaction.commenterIgsid,
    });
    isFollowing = profile.isFollowing;
    profileError = profile.error;
  }

  const checks = interaction.followChecks + 1;
  const mode = isFollowMode(settings.followMode) ? settings.followMode : "off";
  // "soft" libera em true, false (já tentou duas vezes) ou null (desconhecido).
  // "locked" só libera quando a Meta confirma o follow (true); null e false
  // mantêm o pedido — é o que "travado" significa.
  const releaseLink =
    mode === "locked"
      ? isFollowing === true
      : mode === "soft"
        ? isFollowing !== false || checks >= 2
        : // Modo alterado depois que a checagem foi agendada: não retém ninguém.
          true;
  const now = new Date();

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(outboundMessages)
      .set({
        status: "accepted",
        acceptedAt: now,
        externalMessageId: null,
        errorCode: null,
        errorMessage: releaseLink ? null : (profileError ?? null),
        lockedAt: null,
        lockToken: null,
        updatedAt: now,
      })
      .where(
        and(
          eq(outboundMessages.id, job.id),
          job.lockToken
            ? eq(outboundMessages.lockToken, job.lockToken)
            : sql`true`,
        ),
      )
      .returning({ id: outboundMessages.id });

    if (updated.length === 0) return;

    await tx
      .update(commentInteractions)
      .set({
        followChecks: checks,
        state: releaseLink
          ? interaction.state === "gate_pending"
            ? "accepted"
            : interaction.state
          : "gate_pending",
        updatedAt: now,
      })
      .where(eq(commentInteractions.id, interaction.id));

    if (releaseLink) {
      const payload = buildLinkPayload(settings, interaction.commenterIgsid);

      await tx
        .insert(outboundMessages)
        .values({
          accountId: account.id,
          interactionId: interaction.id,
          kind: "followup_link",
          status: "pending",
          payload,
        })
        .onConflictDoNothing({
          target: [outboundMessages.interactionId, outboundMessages.kind],
        });

      await tx
        .update(outboundMessages)
        .set({ nextAttemptAt: now, updatedAt: now })
        .where(
          and(
            eq(outboundMessages.interactionId, interaction.id),
            eq(outboundMessages.kind, "followup_link"),
            eq(outboundMessages.status, "pending"),
          ),
        );
      return;
    }

    // Ainda não é seguidor confirmado: (re)apresenta a porta. O upsert é
    // necessário no modo "travado", em que o mesmo aviso pode ser reenviado
    // após cada nova checagem.
    const gatePayload = buildGatePayload({
      settings,
      username: account.username,
      senderId: interaction.commenterIgsid,
      token: interaction.token,
    });

    await tx
      .insert(outboundMessages)
      .values({
        accountId: account.id,
        interactionId: interaction.id,
        kind: "follow_gate",
        status: "pending",
        payload: gatePayload,
      })
      .onConflictDoUpdate({
        target: [outboundMessages.interactionId, outboundMessages.kind],
        set: {
          status: "pending",
          attempts: 0,
          payload: gatePayload,
          nextAttemptAt: now,
          acceptedAt: null,
          externalMessageId: null,
          errorCode: null,
          errorMessage: null,
          lockedAt: null,
          lockToken: null,
          updatedAt: now,
        },
      });
  });

  return "accepted";
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

async function processJob(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<"accepted" | "failed" | "uncertain" | "requeued" | "expired"> {  if (job.kind === "follow_check" || job.kind === "follow_check_2") {
    return processFollowCheck(job, account, interaction);
  }

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

  let accessToken: string | null = null;
  if (account.provider !== "zernio") {
    try {
      accessToken = decryptToken(account.accessTokenEncrypted);
    } catch {
      await markAccountReconnectRequired(account.id);
      await markFailed(
        job,
        interaction,
        "Não foi possível ler o token guardado. Reconecte o Instagram.",
        "TOKEN_UNREADABLE",
      );
      return "failed";
    }
  }

  if (job.kind === "private_reply") {
    const usage = await privateReplyUsage(account.id);
    if (usage.count >= IG.privateReplyLimitPerHour && usage.retryAt) {
      await requeueForRateLimit(job, usage.retryAt);
      return "requeued";
    }
  }

  try {
    const sent =
      account.provider === "zernio"
        ? await sendWithZernio(job, account, interaction)
        : await sendMessage({
            igUserId: account.instagramUserId,
            accessToken: accessToken ?? "",
            body: job.payload,
          });
    await markAccepted(job, interaction, sent.messageId);
    await setAppStateValue("last_send_accepted_at", new Date().toISOString());
    return "accepted";
  } catch (error) {
    if (error instanceof ZernioApiError) {
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

      // A resposta privada deste comentário já foi gasta: repetir nunca
      // funciona e a Meta recusa a segunda tentativa.
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

    if (error instanceof InstagramApiError) {
      if (error.authProblem) {
        await markAccountReconnectRequired(account.id);
        await markFailed(
          job,
          interaction,
          "O Instagram recusou o token. Reconecte a conta para continuar.",
          error.code ? String(error.code) : "AUTH",
        );
        return "failed";
      }

      if (error.retryable) {
        return retryOrFail(
          job,
          interaction,
          `A Meta limitou ou está instável: ${error.message}`,
          error.code ? String(error.code) : null,
        );
      }

      await markFailed(job, interaction, error.message, error.code ? String(error.code) : null);
      return "failed";
    }

    // Timeout/rede: não é possível saber se a Meta recebeu a mensagem.
    await markUncertain(
      job,
      interaction,
      "Não foi possível confirmar se a Meta recebeu esta mensagem. Uma nova tentativa manual pode gerar duplicação.",
    );
    return "uncertain";
  }
}

/**
 * Processa até `limit` tarefas pendentes. A fonte de verdade é o PostgreSQL;
 * o bloqueio atômico evita que dois processos peguem a mesma tarefa.
 */
export async function drainQueue(limit = 10): Promise<DrainSummary> {
  const db = getDb();
  const summary: DrainSummary = { ...EMPTY_SUMMARY };

  for (let index = 0; index < limit; index += 1) {
    const job = await claimNextJob();
    if (!job) break;

    summary.processed += 1;

    const [interaction] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, job.interactionId))
      .limit(1);

    if (!interaction) {
      await updateJobIfLocked(job, {
        status: "failed",
        errorCode: "INTERACTION_MISSING",
        errorMessage: "A interação original não existe mais.",
        lockedAt: null,
        lockToken: null,
      });
      summary.failed += 1;
      continue;
    }

    const [account] = await db
      .select()
      .from(instagramAccounts)
      .where(eq(instagramAccounts.id, job.accountId))
      .limit(1);

    if (!account) {
      await updateJobIfLocked(job, {
        status: "failed",
        errorCode: "ACCOUNT_MISSING",
        errorMessage: "A conta do Instagram não existe mais.",
        lockedAt: null,
        lockToken: null,
      });
      summary.failed += 1;
      continue;
    }

    const outcome = await processJob(job, account, interaction);
    if (outcome === "accepted") summary.accepted += 1;
    if (outcome === "failed") summary.failed += 1;
    if (outcome === "uncertain") summary.uncertain += 1;
    if (outcome === "expired") summary.expired += 1;
    if (outcome === "requeued") summary.requeued += 1;
  }

  await setAppStateValue("last_drain_at", new Date().toISOString());
  await setAppStateValue("last_drain_summary", summary);
  return summary;
}

/** Remove o conteúdo de payloads antigos, preservando IDs e estados. */
export async function cleanupOldData(): Promise<void> {
  const db = getDb();
  await db.execute(sql`
    UPDATE webhook_events
    SET payload = '{"removed": true}'::jsonb
    WHERE received_at < now() - interval '30 days'
      AND payload <> '{"removed": true}'::jsonb
  `);
  await db.execute(sql`
    UPDATE outbound_messages
    SET payload = '{"removed": true}'::jsonb
    WHERE status IN ('accepted', 'failed', 'uncertain', 'expired', 'canceled')
      AND updated_at < now() - interval '30 days'
      AND payload <> '{"removed": true}'::jsonb
  `);
}

/**
 * Renova o token de longa duração preventivamente (quando faltam menos de
 * 10 dias), respeitando a idade mínima de 24h e um backoff de 1h em falhas.
 */
export async function refreshTokenIfNeeded(): Promise<{
  refreshed: boolean;
  error?: string;
}> {
  const account = await getActiveAccount();
  if (!account || account.connectionStatus !== "connected") {
    return { refreshed: false };
  }
  // A Zernio cuida do token da Meta: não há token nosso para renovar.
  if (account.provider === "zernio") return { refreshed: false };
  if (!account.tokenExpiresAt) return { refreshed: false };

  const now = Date.now();
  if (account.tokenExpiresAt.getTime() - now > IG.tokenRefreshLeadMs) {
    return { refreshed: false };
  }
  if (
    account.lastTokenRefreshAt &&
    now - account.lastTokenRefreshAt.getTime() < IG.tokenRefreshMinAgeMs
  ) {
    return { refreshed: false };
  }

  const failedAt = await getAppStateValue<number>("token_refresh_failed_at");
  if (failedAt && now - failedAt < 60 * 60 * 1000) {
    return { refreshed: false };
  }

  try {
    const currentToken = decryptToken(account.accessTokenEncrypted);
    const refreshed = await refreshLongLivedToken(currentToken);
    const db = getDb();
    await db
      .update(instagramAccounts)
      .set({
        accessTokenEncrypted: encryptToken(refreshed.accessToken),
        tokenExpiresAt: new Date(now + refreshed.expiresInSeconds * 1000),
        lastTokenRefreshAt: new Date(now),
        connectionStatus: "connected",
        lastVerifiedAt: new Date(now),
        updatedAt: new Date(now),
      })
      .where(eq(instagramAccounts.id, account.id));

    await setAppStateValue("token_refresh_failed_at", null);
    await setAppStateValue("last_token_refresh_at", new Date(now).toISOString());
    return { refreshed: true };
  } catch (error) {
    await setAppStateValue("token_refresh_failed_at", now);
    if (error instanceof InstagramApiError && error.authProblem) {
      await markAccountReconnectRequired(account.id);
    }
    return {
      refreshed: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

/** Executado pela tarefa agendada do Coolify a cada minuto. */
export async function runTick(): Promise<{
  recovered: number;
  expired: number;
  drain: DrainSummary;
  refresh: { refreshed: boolean; error?: string };
}> {
  const recovered = await recoverStuckJobs();
  const expired = await expireOverdueJobs();
  const drain = await drainQueue(10);
  const refresh = await refreshTokenIfNeeded();
  await cleanupOldData();
  await setAppStateValue("last_tick_at", new Date().toISOString());
  return { recovered, expired, drain, refresh };
}

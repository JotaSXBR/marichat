import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { markAccountReconnectRequired } from "@/lib/accounts";
import { decryptToken } from "@/lib/crypto";
import { getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  outboundMessages,
} from "@/lib/db/schema";
import { getUserProfile } from "@/lib/instagram/client";
import { isFollowMode, type FollowMode } from "@/lib/follow-mode";
import { buildGatePayload, buildLinkPayload } from "@/lib/outbound";
import { deadlineFor } from "@/lib/queue/deadline";
import { markExpired, markFailed } from "@/lib/queue/job-state";
import { requeueForConnection } from "@/lib/queue/retry";
import type {
  AccountRow,
  InteractionRow,
  JobOutcome,
  JobRow,
} from "@/lib/queue/types";
import { getFollowStatus } from "@/lib/zernio/client";

type Settings = typeof automations.$inferSelect;
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

type FollowStatus = {
  isFollowing: boolean | null;
  error?: string;
};

/** "soft" libera em true, false (já tentou duas vezes) ou null (desconhecido). */
function decideRelease(
  mode: FollowMode,
  isFollowing: boolean | null,
  checks: number,
): boolean {
  if (mode === "locked") return isFollowing === true;
  if (mode === "soft") return isFollowing !== false || checks >= 2;
  // Modo alterado depois que a checagem foi agendada: não retém ninguém.
  return true;
}

async function loadSettings(
  interaction: InteractionRow,
): Promise<Settings | null> {
  const db = getDb();
  const [settings] = await db
    .select()
    .from(automations)
    .where(eq(automations.id, interaction.automationId))
    .limit(1);
  return settings ?? null;
}

async function resolveFollowStatus(
  account: AccountRow,
  interaction: InteractionRow,
  accessToken: string | null,
): Promise<FollowStatus> {
  if (account.provider !== "zernio") {
    const profile = await getUserProfile({
      accessToken: accessToken ?? "",
      igsid: interaction.commenterIgsid,
    });
    return { isFollowing: profile.isFollowing, error: profile.error };
  }

  try {
    const status = await getFollowStatus({
      accountId: account.providerAccountId ?? "",
      userId: interaction.commenterIgsid,
      // O follow recém-feito demora alguns segundos para aparecer no perfil.
      refresh: true,
    });
    return {
      isFollowing: status.isFollowing,
      error: status.unavailableReason,
    };
  } catch (error) {
    // Consulta indisponível não deve travar o fluxo: tratamos como
    // "desconhecido" e a decisão segue igual à da Meta.
    return {
      isFollowing: null,
      error: error instanceof Error ? error.message : "erro desconhecido",
    };
  }
}

/** Enfileira o link (ou reabre a tarefa) depois de confirmar o follow. */
async function enqueueLinkAfterCheck(
  tx: Tx,
  params: {
    account: AccountRow;
    interaction: InteractionRow;
    settings: Settings;
    now: Date;
  },
): Promise<void> {
  const { account, interaction, settings, now } = params;
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
}

/**
 * Ainda não é seguidor confirmado: (re)apresenta a porta. O upsert é
 * necessário no modo "travado", em que o mesmo aviso pode ser reenviado após
 * cada nova checagem.
 */
async function enqueueGateAgain(
  tx: Tx,
  params: {
    account: AccountRow;
    interaction: InteractionRow;
    settings: Settings;
    now: Date;
  },
): Promise<void> {
  const { account, interaction, settings, now } = params;
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
}

async function applyFollowCheck(params: {
  account: AccountRow;
  interaction: InteractionRow;
  settings: Settings;
  job: JobRow;
  checks: number;
  releaseLink: boolean;
  profileError?: string;
  now: Date;
}): Promise<void> {
  const { account, interaction, settings, job, checks, releaseLink, now } =
    params;
  const db = getDb();

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(outboundMessages)
      .set({
        status: "accepted",
        acceptedAt: now,
        externalMessageId: null,
        errorCode: null,
        errorMessage: releaseLink ? null : (params.profileError ?? null),
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
      await enqueueLinkAfterCheck(tx, { account, interaction, settings, now });
      return;
    }

    await enqueueGateAgain(tx, { account, interaction, settings, now });
  });
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
export async function processFollowCheck(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<JobOutcome> {
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

  const settings = await loadSettings(interaction);
  if (!settings) {
    await markFailed(
      job,
      interaction,
      "A automação original não existe mais.",
      "AUTOMATION_MISSING",
    );
    return "failed";
  }

  if (account.provider === "zernio" && !account.providerAccountId) {
    await markFailed(
      job,
      interaction,
      "A conta da Zernio não está vinculada. Reconecte em Conexão.",
      "PROVIDER_ACCOUNT_MISSING",
    );
    return "failed";
  }

  const status = await resolveFollowStatus(account, interaction, accessToken);
  const checks = interaction.followChecks + 1;
  const mode: FollowMode = isFollowMode(settings.followMode)
    ? settings.followMode
    : "off";

  await applyFollowCheck({
    account,
    interaction,
    settings,
    job,
    checks,
    releaseLink: decideRelease(mode, status.isFollowing, checks),
    profileError: status.error,
    now: new Date(),
  });

  return "accepted";
}

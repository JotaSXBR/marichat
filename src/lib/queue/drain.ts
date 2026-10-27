import "server-only";

import { eq } from "drizzle-orm";

import { setAppStateValue } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import { commentInteractions, instagramAccounts } from "@/lib/db/schema";
import { claimNextJob } from "@/lib/queue/claim";
import { updateJobIfLocked } from "@/lib/queue/job-state";
import {
  cleanupOldData,
  expireOverdueJobs,
  recoverStuckJobs,
} from "@/lib/queue/maintenance";
import { processJob } from "@/lib/queue/send";
import { refreshTokenIfNeeded } from "@/lib/queue/token";
import {
  EMPTY_SUMMARY,
  type AccountRow,
  type DrainSummary,
  type InteractionRow,
  type JobOutcome,
  type JobRow,
} from "@/lib/queue/types";

export { cleanupOldData, expireOverdueJobs, recoverStuckJobs };
export { refreshTokenIfNeeded } from "@/lib/queue/token";
export type { DrainSummary } from "@/lib/queue/types";

/** Interação dona da tarefa; falha a tarefa quando ela não existe mais. */
async function loadInteraction(job: JobRow): Promise<InteractionRow | null> {
  const db = getDb();
  const [interaction] = await db
    .select()
    .from(commentInteractions)
    .where(eq(commentInteractions.id, job.interactionId))
    .limit(1);

  if (interaction) return interaction;

  await updateJobIfLocked(job, {
    status: "failed",
    errorCode: "INTERACTION_MISSING",
    errorMessage: "A interação original não existe mais.",
    lockedAt: null,
    lockToken: null,
  });
  return null;
}

/** Conta dona da tarefa; falha a tarefa quando ela não existe mais. */
async function loadAccount(job: JobRow): Promise<AccountRow | null> {
  const db = getDb();
  const [account] = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.id, job.accountId))
    .limit(1);

  if (account) return account;

  await updateJobIfLocked(job, {
    status: "failed",
    errorCode: "ACCOUNT_MISSING",
    errorMessage: "A conta do Instagram não existe mais.",
    lockedAt: null,
    lockToken: null,
  });
  return null;
}

/** Soma o resultado no resumo (as chaves têm o mesmo nome). */
function recordOutcome(summary: DrainSummary, outcome: JobOutcome): void {
  summary[outcome] += 1;
}

/**
 * Processa até `limit` tarefas pendentes. A fonte de verdade é o PostgreSQL;
 * o bloqueio atômico evita que dois processos peguem a mesma tarefa.
 */
export async function drainQueue(limit = 10): Promise<DrainSummary> {
  const summary: DrainSummary = { ...EMPTY_SUMMARY };

  for (let index = 0; index < limit; index += 1) {
    const job = await claimNextJob();
    if (!job) break;

    summary.processed += 1;

    const interaction = await loadInteraction(job);
    if (!interaction) {
      summary.failed += 1;
      continue;
    }

    const account = await loadAccount(job);
    if (!account) {
      summary.failed += 1;
      continue;
    }

    recordOutcome(summary, await processJob(job, account, interaction));
  }

  await setAppStateValue("last_drain_at", new Date().toISOString());
  await setAppStateValue("last_drain_summary", summary);
  return summary;
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

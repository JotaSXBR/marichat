import "server-only";

import { count, desc, eq, sql } from "drizzle-orm";

import { getActiveAccount, getAppStateValue } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  outboundMessages,
  webhookEvents,
} from "@/lib/db/schema";

/**
 * Consultas e contas da visão geral. A página só monta o layout; as consultas
 * e os cálculos ficam aqui, cada um com nome.
 */

type InteractionStat = { state: string; total: number | string };
type JobStat = { status: string; total: number | string };

function loadRecentInteractions(db: ReturnType<typeof getDb>) {
  return db
    .select({
      id: commentInteractions.id,
      commenter: commentInteractions.commenterIgsid,
      state: commentInteractions.state,
      createdAt: commentInteractions.createdAt,
      automationName: automations.name,
    })
    .from(commentInteractions)
    .leftJoin(automations, eq(automations.id, commentInteractions.automationId))
    .orderBy(desc(commentInteractions.createdAt))
    .limit(8);
}

function loadRecentEvents(db: ReturnType<typeof getDb>) {
  return db
    .select({
      eventKey: webhookEvents.eventKey,
      status: webhookEvents.status,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(3);
}

function sumByState(rows: InteractionStat[]): Map<string, number> {
  return new Map(rows.map((row) => [row.state, Number(row.total)]));
}

function sumJobs(rows: JobStat[]): Map<string, number> {
  return new Map(rows.map((row) => [row.status, Number(row.total)]));
}

export function tokenDaysLeft(
  account: Awaited<ReturnType<typeof getActiveAccount>>,
  dbNow: Date | null,
): number | null {
  const expiresAt = account?.tokenExpiresAt ?? null;
  if (!expiresAt || !dbNow) return null;
  return Math.ceil((expiresAt.getTime() - dbNow.getTime()) / 86_400_000);
}

function computeMetrics(params: {
  interactionStats: InteractionStat[];
  jobStats: JobStat[];
  account: Awaited<ReturnType<typeof getActiveAccount>>;
  dbNow: Date | null;
}) {
  const byState = sumByState(params.interactionStats);
  const byJob = sumJobs(params.jobStats);

  return {
    waitingReply:
      (byState.get("accepted") ?? 0) + (byState.get("gate_pending") ?? 0),
    queuedJobs: byJob.get("pending") ?? 0,
    needAttention:
      (byState.get("failed") ?? 0) +
      (byState.get("uncertain") ?? 0) +
      (byState.get("expired") ?? 0),
    tokenDaysLeft: tokenDaysLeft(params.account, params.dbNow),
  };
}

export async function loadDashboard() {
  const db = getDb();
  const account = await getActiveAccount();
  // Hora do banco: evita divergência entre servidores e mantém a renderização
  // determinística do ponto de vista do React.
  const nowRows = await db.execute<{ now: Date | string }>(
    sql`select now() as now`,
  );
  const rawNow = nowRows[0]?.now ?? null;
  const dbNow = rawNow ? new Date(rawNow) : null;

  const [interactionStats, jobStats, recent, recentEvents] = await Promise.all([
    db
      .select({ state: commentInteractions.state, total: count() })
      .from(commentInteractions)
      .groupBy(commentInteractions.state),
    db
      .select({ status: outboundMessages.status, total: count() })
      .from(outboundMessages)
      .groupBy(outboundMessages.status),
    loadRecentInteractions(db),
    loadRecentEvents(db),
  ]);

  const [lastTickAt, webhookError] = await Promise.all([
    getAppStateValue<string>("last_tick_at"),
    getAppStateValue<string>("webhook_subscription_error"),
  ]);

  return {
    account,
    recent,
    recentEvents,
    lastTickAt,
    webhookError,
    ...computeMetrics({
      interactionStats,
      jobStats,
      account,
      dbNow,
    }),
  };
}

export type DashboardData = Awaited<ReturnType<typeof loadDashboard>>;

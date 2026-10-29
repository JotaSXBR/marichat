import "server-only";

import { desc, eq, sql } from "drizzle-orm";

import { getActiveAccount, getAppStateValue } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  outboundMessages,
  webhookEvents,
} from "@/lib/db/schema";
import {
  CONNECTION_TEST_KEY,
  type ConnectionTestResult,
} from "@/lib/instagram/diagnostics";
import type { DrainSummary } from "@/lib/queue/drain";
import { backfillCommenterUsernames } from "@/lib/queue/maintenance";

/**
 * Consultas da página de Atividade. Ficam fora do componente para a página
 * cuidar só do layout e para cada consulta ter um nome.
 */

export const ACTIVITY_LIMIT = 30;
// shortcut: teto de leitura da tela; subir se o diagnóstico precisar de mais.
export const ACTIVITY_MAX_LIMIT = 300;
/** Situações pelas quais a lista de interações pode ser filtrada. */
export const ACTIVITY_FILTERS = [
  "queued",
  "accepted",
  "gate_pending",
  "link_sent",
  "uncertain",
  "expired",
  "failed",
  "canceled",
] as const;

export type ActivityFilter = (typeof ACTIVITY_FILTERS)[number];

export function isActivityFilter(
  value: string | undefined,
): value is ActivityFilter {
  return ACTIVITY_FILTERS.includes(value as ActivityFilter);
}
/** Se a tarefa agendada não roda, nada anda; avisamos depois deste tempo. */
const STALE_TICK_MS = 5 * 60 * 1000;

type Db = ReturnType<typeof getDb>;

function loadInteractions(
  db: Db,
  situation: ActivityFilter | undefined,
  limit: number,
) {
  return db
    .select({
      id: commentInteractions.id,
      commenter: commentInteractions.commenterIgsid,
      commenterUsername: commentInteractions.commenterUsername,
      commentText: commentInteractions.commentText,
      state: commentInteractions.state,
      followChecks: commentInteractions.followChecks,
      mediaId: commentInteractions.mediaId,
      createdAt: commentInteractions.createdAt,
      userLastMessageAt: commentInteractions.userLastMessageAt,
      secondDmAcceptedAt: commentInteractions.secondDmAcceptedAt,
      automationName: automations.name,
    })
    .from(commentInteractions)
    .leftJoin(automations, eq(automations.id, commentInteractions.automationId))
    .where(situation ? eq(commentInteractions.state, situation) : undefined)
    .orderBy(desc(commentInteractions.createdAt))
    .limit(limit);
}

function loadJobs(db: Db, limit: number) {
  return db
    .select({
      id: outboundMessages.id,
      interactionId: outboundMessages.interactionId,
      commenter: commentInteractions.commenterIgsid,
      commenterUsername: commentInteractions.commenterUsername,
      kind: outboundMessages.kind,
      status: outboundMessages.status,
      attempts: outboundMessages.attempts,
      maxAttempts: outboundMessages.maxAttempts,
      nextAttemptAt: outboundMessages.nextAttemptAt,
      errorCode: outboundMessages.errorCode,
      errorMessage: outboundMessages.errorMessage,
      updatedAt: outboundMessages.updatedAt,
    })
    .from(outboundMessages)
    .leftJoin(
      commentInteractions,
      eq(commentInteractions.id, outboundMessages.interactionId),
    )
    .orderBy(desc(outboundMessages.updatedAt))
    .limit(limit);
}

function loadEvents(db: Db, limit: number) {
  return db
    .select({
      eventKey: webhookEvents.eventKey,
      field: webhookEvents.field,
      status: webhookEvents.status,
      errorMessage: webhookEvents.errorMessage,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(limit);
}

function loadDiagnostics() {
  return Promise.all([
    getAppStateValue<string>("last_tick_at"),
    getAppStateValue<string>("last_drain_at"),
    getAppStateValue<DrainSummary>("last_drain_summary"),
    getAppStateValue<string>("last_send_accepted_at"),
    getAppStateValue<string>("webhook_subscription_error"),
    getAppStateValue<ConnectionTestResult>(CONNECTION_TEST_KEY),
  ] as const);
}

function drainSummaryOf(summary: DrainSummary | null): string {
  if (!summary) return "—";
  return `${summary.accepted} aceitas, ${summary.failed} falhas, ${summary.requeued} reenfileiradas, ${summary.expired} expiradas`;
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function isTickStale(tickDate: Date | null, dbNow: Date | null): boolean {
  if (!tickDate || !dbNow) return false;
  return dbNow.getTime() - tickDate.getTime() > STALE_TICK_MS;
}

export async function loadActivity({
  situation,
  limit = ACTIVITY_LIMIT,
}: { situation?: ActivityFilter; limit?: number } = {}) {
  const db = getDb();
  // Quem comentou antes desta versão ganha o @ na primeira visita, sem esperar
  // o ciclo de limpeza (que roda a cada 20h).
  await backfillCommenterUsernames();
  const account = await getActiveAccount();
  // Hora do banco: mantém a página determinística e alinhada ao cron.
  const nowRows = await db.execute<{ now: Date | string }>(
    sql`select now() as now`,
  );
  const dbNow = nowRows[0]?.now ? new Date(nowRows[0].now) : null;

  const [interactions, jobs, events, interactionTotal, jobTotal, eventTotal] =
    await Promise.all([
      loadInteractions(db, situation, limit),
      loadJobs(db, limit),
      loadEvents(db, limit),
      db.$count(
        commentInteractions,
        situation ? eq(commentInteractions.state, situation) : undefined,
      ),
      db.$count(outboundMessages),
      db.$count(webhookEvents),
    ]);

  const [
    lastTickAt,
    lastDrainAt,
    lastDrainSummary,
    lastSendAt,
    webhookError,
    connectionTest,
  ] = await loadDiagnostics();

  const tickDate = toDate(lastTickAt);

  return {
    account,
    interactions,
    jobs,
    events,
    totals: {
      interactions: interactionTotal,
      jobs: jobTotal,
      events: eventTotal,
    },
    lastTickAt,
    lastDrainAt,
    lastSendAt,
    tickDate,
    tickStale: isTickStale(tickDate, dbNow),
    drainSummary: drainSummaryOf(lastDrainSummary),
    webhookError,
    connectionTest,
  };
}

export type ActivityData = Awaited<ReturnType<typeof loadActivity>>;

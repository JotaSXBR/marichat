import Link from "next/link";
import { connection } from "next/server";

import {
  formatDateTime,
  interactionLabels,
  jobKindLabels,
  jobStatusLabels,
  webhookStatusLabels,
} from "@/app/admin/labels";
import { getActiveAccount, getAppStateValue } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  outboundMessages,
  webhookEvents,
} from "@/lib/db/schema";
import { CONNECTION_TEST_KEY, type ConnectionTestResult } from "@/lib/instagram/diagnostics";
import type { DrainSummary } from "@/lib/queue/drain";
import { desc, eq, sql } from "drizzle-orm";

/**
 * Página de diagnóstico: mostra o que o webhook gravou, o que a fila tentou
 * enviar e o que falhou. Serve para acompanhar o primeiro teste em produção
 * sem precisar abrir o banco ou os logs do Coolify.
 */

export const instant = false;

const LIMIT = 30;
/** Se a tarefa agendada não roda, nada anda; avisamos depois deste tempo. */
const STALE_TICK_MS = 5 * 60 * 1000;

function short(value: string | null, max = 80): string {
  if (!value) return "—";
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function statusClass(status: string): string {
  if (status === "failed" || status === "uncertain" || status === "expired") {
    return "text-red-700";
  }
  if (status === "accepted" || status === "processed" || status === "link_sent") {
    return "text-green-700";
  }
  return "text-zinc-700";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export default async function ActivityPage() {
  await connection();
  await requireAdmin();

  const db = getDb();
  const account = await getActiveAccount();
  // Hora do banco: mantém a página determinística e alinhada ao cron.
  const nowRows = await db.execute<{ now: Date | string }>(sql`select now() as now`);
  const dbNow = nowRows[0]?.now ? new Date(nowRows[0].now) : null;

  const [interactions, jobs, events] = await Promise.all([
    db
      .select({
        id: commentInteractions.id,
        commenter: commentInteractions.commenterIgsid,
        commentText: commentInteractions.commentText,
        state: commentInteractions.state,
        followChecks: commentInteractions.followChecks,
        mediaId: commentInteractions.mediaId,
        createdAt: commentInteractions.createdAt,
        userLastMessageAt: commentInteractions.userLastMessageAt,
        firstDmAcceptedAt: commentInteractions.firstDmAcceptedAt,
        secondDmAcceptedAt: commentInteractions.secondDmAcceptedAt,
        automationName: automations.name,
      })
      .from(commentInteractions)
      .leftJoin(automations, eq(automations.id, commentInteractions.automationId))
      .orderBy(desc(commentInteractions.createdAt))
      .limit(LIMIT),
    db
      .select({
        id: outboundMessages.id,
        interactionId: outboundMessages.interactionId,
        commenter: commentInteractions.commenterIgsid,
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
      .limit(LIMIT),
    db
      .select({
        eventKey: webhookEvents.eventKey,
        field: webhookEvents.field,
        status: webhookEvents.status,
        errorMessage: webhookEvents.errorMessage,
        receivedAt: webhookEvents.receivedAt,
      })
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(LIMIT),
  ]);

  const lastTickAt = await getAppStateValue<string>("last_tick_at");
  const lastDrainAt = await getAppStateValue<string>("last_drain_at");
  const lastDrainSummary =
    await getAppStateValue<DrainSummary>("last_drain_summary");
  const lastSendAt = await getAppStateValue<string>("last_send_accepted_at");
  const webhookError = await getAppStateValue<string>("webhook_subscription_error");
  const connectionTest =
    await getAppStateValue<ConnectionTestResult>(CONNECTION_TEST_KEY);

  const tickDate = lastTickAt ? new Date(lastTickAt) : null;
  const tickStale =
    tickDate !== null &&
    dbNow !== null &&
    dbNow.getTime() - tickDate.getTime() > STALE_TICK_MS;

  const drainSummary = lastDrainSummary
    ? `${lastDrainSummary.accepted} aceitas, ${lastDrainSummary.failed} falhas, ${lastDrainSummary.requeued} reenfileiradas, ${lastDrainSummary.expired} expiradas`
    : "—";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Atividade</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Últimos {LIMIT} registros de interações, envios e webhooks. Use esta
            página para acompanhar o primeiro teste em produção.
          </p>
        </div>
        <Link
          href="/admin/atividade"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50"
        >
          Atualizar
        </Link>
      </div>

      {!account ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nenhuma conta conectada.{" "}
          <Link href="/admin/conexao" className="font-medium underline">
            Conectar agora
          </Link>
        </div>
      ) : null}

      {tickStale ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          A tarefa agendada não roda desde {formatDateTime(tickDate)}. Confira o
          cron do Coolify em <code>/api/cron/tick</code>: sem ela, a fila para.
        </div>
      ) : null}

      {webhookError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Inscrição de webhooks com erro: {webhookError}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Última tarefa agendada"
          value={lastTickAt ? formatDateTime(new Date(lastTickAt)) : "nunca"}
        />
        <Stat
          label="Último dreno da fila"
          value={lastDrainAt ? formatDateTime(new Date(lastDrainAt)) : "nunca"}
        />
        <Stat label="Resultado do último dreno" value={drainSummary} />
        <Stat
          label="Último envio aceito"
          value={lastSendAt ? formatDateTime(new Date(lastSendAt)) : "—"}
        />
      </section>

      {connectionTest ? (
        <p className="text-xs text-zinc-500">
          Último teste de conexão em{" "}
          {formatDateTime(new Date(connectionTest.checkedAt))}:{" "}
          {connectionTest.problems.length === 0
            ? "tudo certo."
            : connectionTest.problems.join(" ")}
        </p>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium">Interações</h2>
        </div>
        {interactions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">
            Nenhum comentário recebido ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Quando</th>
                  <th className="px-4 py-2 font-medium">Automação</th>
                  <th className="px-4 py-2 font-medium">Comentário</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                  <th className="px-4 py-2 font-medium">Checagens</th>
                  <th className="px-4 py-2 font-medium">Resposta</th>
                  <th className="px-4 py-2 font-medium">Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {interactions.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-2">{row.automationName ?? "—"}</td>
                    <td className="px-4 py-2 text-zinc-700">
                      {short(row.commentText)}
                      <span className="block font-mono text-[11px] text-zinc-400">
                        {row.commenter} · mídia {row.mediaId}
                      </span>
                    </td>
                    <td className={`px-4 py-2 ${statusClass(row.state)}`}>
                      {interactionLabels[row.state] ?? row.state}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{row.followChecks}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {formatDateTime(row.userLastMessageAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {formatDateTime(row.secondDmAcceptedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium">Envios e tarefas da fila</h2>
        </div>
        {jobs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">
            Nenhuma tarefa criada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Atualizado</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Quem</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                  <th className="px-4 py-2 font-medium">Tentativas</th>
                  <th className="px-4 py-2 font-medium">Próxima</th>
                  <th className="px-4 py-2 font-medium">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {jobs.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {formatDateTime(row.updatedAt)}
                    </td>
                    <td className="px-4 py-2">
                      {jobKindLabels[row.kind] ?? row.kind}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                      {row.commenter ?? "—"}
                    </td>
                    <td className={`px-4 py-2 ${statusClass(row.status)}`}>
                      {jobStatusLabels[row.status] ?? row.status}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {row.attempts}/{row.maxAttempts}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {row.status === "pending"
                        ? formatDateTime(row.nextAttemptAt)
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-red-700">
                      {row.errorMessage ? (
                        <>
                          <span className="font-mono text-zinc-500">
                            {row.errorCode ?? "ERRO"}
                          </span>{" "}
                          {short(row.errorMessage, 120)}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium">Webhooks recebidos</h2>
        </div>
        {events.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-600">
            Nenhum evento recebido ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Quando</th>
                  <th className="px-4 py-2 font-medium">Evento</th>
                  <th className="px-4 py-2 font-medium">Campo</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                  <th className="px-4 py-2 font-medium">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {events.map((row) => (
                  <tr key={row.eventKey}>
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-600">
                      {formatDateTime(row.receivedAt)}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">{row.eventKey}</td>
                    <td className="px-4 py-2 text-zinc-600">{row.field}</td>
                    <td className={`px-4 py-2 ${statusClass(row.status)}`}>
                      {webhookStatusLabels[row.status] ?? row.status}
                    </td>
                    <td className="px-4 py-2 text-xs text-red-700">
                      {row.errorMessage ? short(row.errorMessage, 120) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-sm">
        <Link href="/admin/conexao" className="text-zinc-600 underline">
          Ir para Conexão
        </Link>
      </p>
    </div>
  );
}

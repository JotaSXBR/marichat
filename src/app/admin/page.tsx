import { count, desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";

import { getActiveAccount, getAppStateValue } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  outboundMessages,
  webhookEvents,
} from "@/lib/db/schema";

const interactionLabels: Record<string, string> = {
  queued: "Na fila",
  accepted: "DM enviada (aceita)",
  link_sent: "Link enviado",
  uncertain: "Incerta",
  expired: "Expirada",
  failed: "Falhou",
  canceled: "Cancelada",
};

function formatDateTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function Card({
  title,
  value,
  hint,
}: {
  title: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

// Painel depende do banco e da autenticação a cada acesso.
export const instant = false;

export default async function AdminDashboard() {
  await connection();
  await requireAdmin();

  const db = getDb();
  const account = await getActiveAccount();
  // Hora do banco: evita divergência entre servidores e mantém a renderização
  // determinística do ponto de vista do React.
  const nowRows = await db.execute<{ now: Date | string }>(sql`select now() as now`);
  const rawNow = nowRows[0]?.now ?? null;
  const dbNow = rawNow ? new Date(rawNow) : null;

  const automationStats = await db
    .select({ isActive: automations.isActive, total: count() })
    .from(automations)
    .groupBy(automations.isActive);

  const interactionStats = await db
    .select({ state: commentInteractions.state, total: count() })
    .from(commentInteractions)
    .groupBy(commentInteractions.state);

  const jobStats = await db
    .select({ status: outboundMessages.status, total: count() })
    .from(outboundMessages)
    .groupBy(outboundMessages.status);

  const recent = await db
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

  const recentEvents = await db
    .select({
      eventKey: webhookEvents.eventKey,
      status: webhookEvents.status,
      receivedAt: webhookEvents.receivedAt,
    })
    .from(webhookEvents)
    .orderBy(desc(webhookEvents.receivedAt))
    .limit(3);

  const lastTickAt = await getAppStateValue<string>("last_tick_at");
  const webhookError = await getAppStateValue<string>("webhook_subscription_error");

  const byState = new Map(interactionStats.map((row) => [row.state, Number(row.total)]));
  const byJob = new Map(jobStats.map((row) => [row.status, Number(row.total)]));

  const totalAutomations = automationStats.reduce(
    (sum, row) => sum + Number(row.total),
    0,
  );
  const activeAutomations =
    automationStats.find((row) => row.isActive)?.total ?? 0;

  const waitingTap = byState.get("accepted") ?? 0;
  const linkSent = byState.get("link_sent") ?? 0;
  const queuedJobs = byJob.get("pending") ?? 0;
  const needAttention =
    (byState.get("failed") ?? 0) +
    (byState.get("uncertain") ?? 0) +
    (byState.get("expired") ?? 0);

  const tokenExpiresAt = account?.tokenExpiresAt ?? null;
  const tokenDaysLeft =
    tokenExpiresAt && dbNow
      ? Math.ceil((tokenExpiresAt.getTime() - dbNow.getTime()) / 86_400_000)
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Visão geral</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Fluxo: comentário com a palavra-chave → DM com botão → toque no botão →
            mensagem com o link.
          </p>
        </div>
        <Link
          href="/admin/automacoes/nova"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Nova automação
        </Link>
      </div>

      {!account ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Nenhuma conta do Instagram conectada.{" "}
          <Link href="/admin/conexao" className="font-medium underline">
            Conectar agora
          </Link>
        </div>
      ) : null}

      {account && account.connectionStatus !== "connected" ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          A conexão com o Instagram precisa ser refeita: os envios ficam parados
          até reconectar.{" "}
          <Link href="/admin/conexao" className="font-medium underline">
            Ir para Conexão
          </Link>
        </div>
      ) : null}

      {webhookError ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          A inscrição dos webhooks falhou na última tentativa. Abra a página
          Conexão para mais detalhes.
        </div>
      ) : null}

      {tokenDaysLeft !== null && tokenDaysLeft <= 10 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          O token do Instagram expira em {tokenDaysLeft} dia(s). A renovação
          automática roda a cada minuto; se falhar, reconecte em Conexão.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Automações ativas"
          value={activeAutomations}
          hint={`${totalAutomations} no total`}
        />
        <Card
          title="Aguardando toque"
          value={waitingTap}
          hint="Primeira DM aceita pela Meta"
        />
        <Card title="Links enviados" value={linkSent} hint="Segunda mensagem aceita" />
        <Card
          title="Precisam de atenção"
          value={needAttention}
          hint="Falhas, incertezas ou expirações"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
          <h2 className="font-medium">Conta conectada</h2>
          {account ? (
            <dl className="mt-2 space-y-1 text-zinc-600">
              <div className="flex justify-between gap-4">
                <dt>Perfil</dt>
                <dd className="font-medium text-zinc-900">@{account.username}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Status</dt>
                <dd>{account.connectionStatus}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt>Token expira em</dt>
                <dd>{formatDateTime(account.tokenExpiresAt)}</dd>
              </div>
            </dl>
          ) : (
            <p className="mt-2 text-zinc-600">Ainda não conectada.</p>
          )}
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
          <h2 className="font-medium">Operação</h2>
          <dl className="mt-2 space-y-1 text-zinc-600">
            <div className="flex justify-between gap-4">
              <dt>Mensagens na fila</dt>
              <dd className="font-medium text-zinc-900">{queuedJobs}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Última execução da tarefa agendada</dt>
              <dd>{lastTickAt ? formatDateTime(new Date(lastTickAt)) : "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Último webhook</dt>
              <dd>
                {recentEvents[0]
                  ? formatDateTime(recentEvents[0].receivedAt)
                  : "—"}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-zinc-500">
            &quot;Aceita&quot; significa que a Meta recebeu a solicitação. O Instagram
            não informa confirmação de entrega nem de leitura.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
          <h2 className="text-sm font-medium">Últimos comentários atendidos</h2>
          <Link
            href="/admin/automacoes"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            Ver automações
          </Link>
        </div>
        {recent.length === 0 ? (
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
                  <th className="px-4 py-2 font-medium">Quem comentou</th>
                  <th className="px-4 py-2 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recent.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-2 text-zinc-600">
                      {formatDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-2">{row.automationName ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                      {row.commenter}
                    </td>
                    <td className="px-4 py-2">
                      {interactionLabels[row.state] ?? row.state}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

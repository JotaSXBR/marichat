import type { ReactNode } from "react";

import Link from "next/link";

import { formatDateTime, interactionLabels } from "@/app/admin/labels";
import type { DashboardData } from "@/app/admin/dashboard";

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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function DashboardHeader() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Visão geral</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Fluxo: comentário com a palavra-chave → DM pedindo uma resposta →
          resposta da pessoa → mensagem com o link, conforme a porta de seguidor
          escolhida em cada automação.
        </p>
      </div>
      <Link
        href="/admin/automacoes/nova"
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Nova automação
      </Link>
    </div>
  );
}

export function DashboardAlerts({
  account,
  webhookError,
  tokenDaysLeft,
}: Pick<DashboardData, "account" | "webhookError" | "tokenDaysLeft">) {
  return (
    <>
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
    </>
  );
}

export function DashboardCards({
  activeAutomations,
  totalAutomations,
  waitingReply,
  linkSent,
  needAttention,
}: Pick<
  DashboardData,
  | "activeAutomations"
  | "totalAutomations"
  | "waitingReply"
  | "linkSent"
  | "needAttention"
>) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card
        title="Automações ativas"
        value={activeAutomations}
        hint={`${totalAutomations} no total`}
      />
      <Card
        title="Aguardando resposta"
        value={waitingReply}
        hint="Primeira DM aceita; link ainda não enviado"
      />
      <Card
        title="Links enviados"
        value={linkSent}
        hint="Segunda mensagem aceita"
      />
      <Card
        title="Precisam de atenção"
        value={needAttention}
        hint="Falhas, incertezas ou expirações"
      />
    </section>
  );
}

export function AccountPanel({ account }: Pick<DashboardData, "account">) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
      <h2 className="font-medium">Conta conectada</h2>
      {account ? (
        <dl className="mt-2 space-y-1 text-zinc-600">
          <Row label="Perfil">
            <dd className="font-medium text-zinc-900">@{account.username}</dd>
          </Row>
          <Row label="Status">{account.connectionStatus}</Row>
          <Row label="Token expira em">
            {formatDateTime(account.tokenExpiresAt)}
          </Row>
        </dl>
      ) : (
        <p className="mt-2 text-zinc-600">Ainda não conectada.</p>
      )}
    </div>
  );
}

export function OperationsPanel({
  queuedJobs,
  lastTickAt,
  recentEvents,
}: Pick<DashboardData, "queuedJobs" | "lastTickAt" | "recentEvents">) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm">
      <h2 className="font-medium">Operação</h2>
      <dl className="mt-2 space-y-1 text-zinc-600">
        <Row label="Mensagens na fila">
          <dd className="font-medium text-zinc-900">{queuedJobs}</dd>
        </Row>
        <Row label="Última execução da tarefa agendada">
          {lastTickAt ? formatDateTime(new Date(lastTickAt)) : "—"}
        </Row>
        <Row label="Último webhook">
          {recentEvents[0] ? formatDateTime(recentEvents[0].receivedAt) : "—"}
        </Row>
      </dl>
      <p className="mt-3 text-xs text-zinc-500">
        &quot;Aceita&quot; significa que a Meta recebeu a solicitação. O
        Instagram não informa confirmação de entrega nem de leitura.
      </p>
    </div>
  );
}

export function RecentCommentsSection({
  rows,
}: {
  rows: DashboardData["recent"];
}) {
  return (
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
      {rows.length === 0 ? (
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
              {rows.map((row) => (
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
  );
}

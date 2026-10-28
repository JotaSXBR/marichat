import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  KeyRoundIcon,
  PlugZapIcon,
  PlusIcon,
  ShieldAlertIcon,
} from "lucide-react";

import {
  formatDateTime,
  interactionLabels,
  interactionTones,
} from "@/app/admin/labels";
import type { DashboardData } from "@/app/admin/dashboard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/marichat/page-header";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ R2 */

export function DashboardHeader() {
  return (
    <PageHeader
      action={
        <Button asChild className="hidden md:inline-flex" size="lg">
          <Link href="/admin/automacoes/nova">
            <PlusIcon aria-hidden />
            Nova automação
          </Link>
        </Button>
      }
      description="Comentário com a palavra-chave → DM pedindo resposta → link."
      title="Visão geral"
    />
  );
}

/* ------------------------------------------------------------------ R3 */

type DashboardAlert = {
  id: string;
  /** 0 é o mais urgente. */
  priority: number;
  variant: "danger" | "warning" | "info";
  icon: typeof AlertTriangleIcon;
  title: string;
  description: string;
  href: string;
  action: string;
};

/**
 * Alertas da Visão geral, do mais para o menos urgente.
 * A tela mostra no máximo 2 (§9.1): o resto vive na página Conexão.
 */
function buildAlerts({
  account,
  webhookError,
  tokenDaysLeft,
}: Pick<DashboardData, "account" | "webhookError" | "tokenDaysLeft">) {
  const alerts: DashboardAlert[] = [];

  if (!account) {
    alerts.push({
      id: "no-account",
      priority: 0,
      variant: "warning",
      icon: PlugZapIcon,
      title: "Nenhuma conta conectada",
      description: "Conecte o Instagram para começar a receber comentários.",
      href: "/admin/conexao",
      action: "Conectar",
    });
  }

  if (account && account.connectionStatus !== "connected") {
    alerts.push({
      id: "connection",
      priority: 0,
      variant: "danger",
      icon: ShieldAlertIcon,
      title: "A conexão precisa ser refeita",
      description:
        "Os envios ficam parados até reconectar o perfil do Instagram.",
      href: "/admin/conexao",
      action: "Ir para Conexão",
    });
  }

  if (webhookError) {
    alerts.push({
      id: "webhook",
      priority: 1,
      variant: "danger",
      icon: AlertTriangleIcon,
      title: "A inscrição dos webhooks falhou",
      description: "A última tentativa de registro falhou.",
      href: "/admin/conexao",
      action: "Ver detalhes",
    });
  }

  if (tokenDaysLeft !== null && tokenDaysLeft <= 10) {
    alerts.push({
      id: "token",
      priority: 2,
      variant: "warning",
      icon: KeyRoundIcon,
      title: `O token expira em ${tokenDaysLeft} dia(s)`,
      description:
        "A renovação automática roda a cada minuto. Se falhar, reconecte.",
      href: "/admin/conexao",
      action: "Conexão",
    });
  }

  return alerts.sort((a, b) => a.priority - b.priority).slice(0, 2);
}

export function DashboardAlerts({
  account,
  webhookError,
  tokenDaysLeft,
}: Pick<DashboardData, "account" | "webhookError" | "tokenDaysLeft">) {
  const alerts = buildAlerts({ account, webhookError, tokenDaysLeft });
  if (alerts.length === 0) return null;

  return (
    <section aria-label="Avisos" className="grid gap-3">
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <Alert key={alert.id} variant={alert.variant}>
            <Icon aria-hidden />
            <AlertTitle>{alert.title}</AlertTitle>
            <AlertDescription>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {alert.description}
                <Link
                  className="inline-flex items-center gap-1 font-medium text-current"
                  href={alert.href}
                >
                  {alert.action}
                  <ArrowRightIcon aria-hidden className="size-3.5" />
                </Link>
              </span>
            </AlertDescription>
          </Alert>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ R4 */

/** O caminho real do produto, com número de cada etapa. */
export function FlowPanel({
  totalInteractions,
  acceptedDms,
  linksSent,
}: Pick<
  DashboardData,
  "totalInteractions" | "acceptedDms" | "linksSent"
>) {
  const stages = [
    {
      step: "01",
      label: "Comentários",
      value: totalInteractions,
      hint: "palavra-chave encontrada",
    },
    {
      step: "02",
      label: "DMs aceitas",
      value: acceptedDms,
      hint: "a Meta confirmou o envio",
    },
    {
      step: "03",
      label: "Links enviados",
      value: linksSent,
      hint: "a pessoa recebeu o link",
    },
  ];

  return (
    <section aria-labelledby="fluxo-title" className="border-y border-border">
      <h2 className="sr-only" id="fluxo-title">
        Fluxo dos comentários
      </h2>
      <dl className="grid divide-y divide-line-subtle sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {stages.map((stage) => (
          <div
            className="py-5 sm:px-5 sm:first:pl-0 sm:last:pr-0"
            key={stage.step}
          >
            <dt className="flex items-baseline gap-2">
              <span className="font-mono text-micro text-muted-foreground">
                {stage.step}
              </span>
              <span className="text-label text-foreground">{stage.label}</span>
            </dt>
            <dd className="mt-3 text-figure text-foreground" data-numeric>
              {stage.value}
              <span className="mt-2 block font-sans text-label font-normal tracking-normal text-muted-soft">
                {stage.hint}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function AttentionLedger({
  needAttention,
  waitingReply,
}: Pick<DashboardData, "needAttention" | "waitingReply">) {
  return (
    <section aria-labelledby="pendencias-title">
      <h2 className="sr-only" id="pendencias-title">
        Pendências
      </h2>
      <dl className="divide-y divide-line-subtle border-b border-border">
        <div className="flex items-baseline justify-between gap-6 py-4">
          <dt>
            <span className="text-body text-foreground">
              Precisam de atenção
            </span>
            <span className="mt-0.5 block text-label text-muted-soft">
              Falhas, incertezas ou expirações
            </span>
          </dt>
          <dd
            className={cn(
              "text-figure",
              needAttention > 0 ? "text-warning" : "text-foreground",
            )}
            data-numeric
          >
            {needAttention}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-6 py-4">
          <dt>
            <span className="text-body text-foreground">
              Aguardando resposta
            </span>
            <span className="mt-0.5 block text-label text-muted-soft">
              Primeira DM aceita, link ainda não enviado
            </span>
          </dt>
          <dd className="text-figure text-foreground" data-numeric>
            {waitingReply}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Readout({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd
        className="text-right font-mono text-mono text-foreground"
        data-numeric
      >
        {value}
      </dd>
    </div>
  );
}

export function OperationsPanel({
  queuedJobs,
  lastTickAt,
  recentEvents,
}: Pick<DashboardData, "queuedJobs" | "lastTickAt" | "recentEvents">) {
  return (
    <aside aria-labelledby="operacao-title" className="min-w-0">
      <h2
        className="border-b border-border pb-3 text-title text-foreground"
        id="operacao-title"
      >
        Operação
      </h2>
      <dl className="divide-y divide-line-subtle">
        <Readout label="Mensagens na fila" value={queuedJobs} />
        <Readout
          label="Última tarefa"
          value={lastTickAt ? formatDateTime(new Date(lastTickAt)) : "—"}
        />
        <Readout
          label="Último webhook"
          value={
            recentEvents[0]
              ? formatDateTime(recentEvents[0].receivedAt)
              : "—"
          }
        />
      </dl>
      <p className="mt-4 text-label text-muted-soft">
        &quot;Aceita&quot; significa que a Meta recebeu a solicitação; não é
        confirmação de leitura.
      </p>
    </aside>
  );
}

/* ------------------------------------------------------------------ R4 */

const RECENT_LIMIT = 5;
const MOBILE_LIMIT = 3;

export function RecentCommentsSection({
  rows,
}: {
  rows: DashboardData["recent"];
}) {
  const visible = rows.slice(0, RECENT_LIMIT);

  return (
    <section aria-labelledby="recentes-title" className="min-w-0">
      <div className="border-b border-border pb-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-section text-foreground" id="recentes-title">
            Últimos comentários atendidos
          </h2>
          {visible.length > 0 ? (
            <span className="hidden font-mono text-micro text-muted-foreground sm:inline">
              {visible.length} de {rows.length}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-label text-muted-foreground">
          {rows.length === 0
            ? "Os comentários aparecem aqui assim que chegam."
            : visible.length === 1
              ? "O mais recente."
              : `Os ${visible.length} mais recentes.`}
        </p>
      </div>

      {visible.length > 0 ? (
        <Table className="table-stack">
          <caption className="sr-only">
            Últimos comentários atendidos, com data, automação, autor e situação
          </caption>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Automação</TableHead>
              <TableHead>Quem comentou</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((row, index) => (
              <TableRow
                className={cn(index >= MOBILE_LIMIT && "table-stack-extra")}
                key={row.id}
              >
                <TableCell
                  className="font-mono text-mono text-muted-foreground"
                  data-label="Quando"
                >
                  {formatDateTime(row.createdAt)}
                </TableCell>
                <TableCell className="text-foreground" data-label="Automação">
                  {row.automationName ?? "—"}
                </TableCell>
                <TableCell
                  className="font-mono text-mono text-muted-foreground"
                  data-label="Quem comentou"
                >
                  {row.commenter}
                </TableCell>
                <TableCell data-label="Situação">
                  <StatusChip tone={interactionTones[row.state] ?? "neutral"}>
                    {interactionLabels[row.state] ?? row.state}
                  </StatusChip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </section>
  );
}

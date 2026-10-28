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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <h1 className="text-display text-foreground">Visão geral</h1>
        <p className="mt-2 text-body text-muted-foreground">
          Comentário com a palavra-chave → DM pedindo resposta → link.
        </p>
      </div>
      <Button asChild className="hidden md:inline-flex" size="lg">
        <Link href="/admin/automacoes/nova">
          <PlusIcon aria-hidden />
          Nova automação
        </Link>
      </Button>
    </div>
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

export function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number | string;
  hint: string;
  tone?: "warning";
}) {
  return (
    <Card
      className={cn(
        "gap-2 p-5",
        tone === "warning" && "border-l-2 border-l-warning",
      )}
    >
      <p className="text-micro text-muted-foreground uppercase">{label}</p>
      <p className="text-section text-foreground" data-numeric>
        {value}
      </p>
      <p className="text-label text-muted-soft">{hint}</p>
    </Card>
  );
}

export function DashboardCards({
  waitingReply,
  needAttention,
}: Pick<DashboardData, "waitingReply" | "needAttention">) {
  return (
    <section
      aria-label="Resumo do período"
      className="grid grid-cols-2 gap-3 md:gap-4"
    >
      <Metric
        hint="Falhas, incertezas ou expirações"
        label="Precisam de atenção"
        tone={needAttention > 0 ? "warning" : undefined}
        value={needAttention}
      />
      <Metric
        hint="Primeira DM aceita, link ainda não enviado"
        label="Aguardando resposta"
        value={waitingReply}
      />
    </section>
  );
}

export function OperationsPanel({
  queuedJobs,
  lastTickAt,
  recentEvents,
}: Pick<DashboardData, "queuedJobs" | "lastTickAt" | "recentEvents">) {
  return (
    <Card className="gap-4 p-5">
      <CardHeader>
        <CardTitle>Operação</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-micro text-muted-foreground uppercase">
              Mensagens na fila
            </dt>
            <dd className="mt-1 text-section text-foreground" data-numeric>
              {queuedJobs}
            </dd>
          </div>
          <div>
            <dt className="text-micro text-muted-foreground uppercase">
              Última tarefa
            </dt>
            <dd className="mt-1 text-body text-foreground">
              {lastTickAt ? formatDateTime(new Date(lastTickAt)) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-micro text-muted-foreground uppercase">
              Último webhook
            </dt>
            <dd className="mt-1 text-body text-foreground">
              {recentEvents[0]
                ? formatDateTime(recentEvents[0].receivedAt)
                : "—"}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-label text-muted-soft">
          &quot;Aceita&quot; significa que a Meta recebeu a solicitação; não é
          confirmação de leitura.
        </p>
      </CardContent>
    </Card>
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
    <Card className="gap-0 overflow-hidden p-0">
      <CardHeader className="px-5 pt-5 md:px-6 md:pt-6">
        <CardTitle>Últimos comentários atendidos</CardTitle>
        <CardDescription>
          {rows.length === 0
            ? "Os comentários aparecem aqui assim que chegam."
            : `Os ${visible.length} mais recentes.`}
        </CardDescription>
      </CardHeader>

      {visible.length > 0 ? (
        <div className="mt-4">
          <Table className="table-stack">
            <caption className="sr-only">
              Últimos comentários atendidos, com data, automação, autor e
              situação
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
                    className="text-muted-foreground"
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
        </div>
      ) : null}
    </Card>
  );
}

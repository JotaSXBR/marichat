import Link from "next/link";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  KeyRoundIcon,
  PlugZapIcon,
  PlusIcon,
  ShieldAlertIcon,
} from "lucide-react";

import type { DashboardData } from "@/app/admin/dashboard";
import {
  attentionReasons,
  formatDateTime,
  formatRelative,
  interactionLabels,
  interactionTones,
} from "@/app/admin/labels";
import { SectionHeading } from "@/components/marichat/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <section aria-label="Avisos" className="grid gap-2">
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

const ATTENTION_TONES: Record<string, "warning" | "danger"> = {
  failed: "danger",
  uncertain: "warning",
  expired: "danger",
  gate_pending: "warning",
};

const ATTENTION_SHORT: Record<string, string> = {
  failed: "falhou",
  uncertain: "incerta",
  expired: "expirada",
  gate_pending: "aguardando",
};

function handleOf(row: DashboardData["attention"][number]) {
  return row.commenterUsername ? `@${row.commenterUsername}` : row.commenter;
}

/** O que o painel pede para uma pessoa resolver, com o caso real. */
export function AttentionSection({
  rows,
  now,
}: {
  rows: DashboardData["attention"];
  now: Date | null;
}) {
  return (
    <section aria-label="Precisa de atenção">
      <SectionHeading
        action={
          <Link
            className="hidden text-[0.75rem] text-muted-soft hover:text-foreground md:block"
            href="/admin/atividade"
          >
            Ver na atividade
          </Link>
        }
        meta={`${rows.length} ${rows.length === 1 ? "interação" : "interações"}`}
        title="Precisa de atenção"
      />

      {rows.length === 0 ? (
        <p className="border-b border-line-subtle py-4 text-sm text-muted-foreground">
          Nada precisa de atenção agora. A fila segue sozinha.
        </p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                className="-mx-2 block border-b border-line-subtle px-2 py-3.5 hover:bg-surface-hover md:flex md:flex-wrap md:items-baseline md:gap-x-3.5"
                href={`/admin/atividade?situacao=${row.state}`}
              >
                <span className="block font-mono text-[0.8125rem] font-medium text-foreground md:min-w-[7.5rem]">
                  {handleOf(row)}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground md:mt-0 md:min-w-0 md:flex-1">
                  {attentionReasons[row.state] ??
                    interactionLabels[row.state] ??
                    row.state}
                </span>
                <span className="mt-1 flex items-baseline gap-3 md:mt-0">
                  <span className="font-mono text-[0.75rem] text-muted-soft">
                    {now ? formatRelative(row.createdAt, now) : "—"}
                  </span>
                  <StatusChip tone={ATTENTION_TONES[row.state] ?? "warning"}>
                    {ATTENTION_SHORT[row.state] ?? row.state}
                  </StatusChip>
                  <span className="ml-auto text-label text-foreground underline decoration-border underline-offset-[3px]">
                    Revisar
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const RECENT_LIMIT = 8;
const MOBILE_LIMIT = 5;

function stateOf(state: string) {
  return (
    <StatusChip tone={interactionTones[state] ?? "neutral"}>
      {interactionLabels[state] ?? state}
    </StatusChip>
  );
}

type RecentComment = DashboardData["recent"][number];

function RecentCommentsTable({ rows }: { rows: RecentComment[] }) {
  return (
    <div className="hidden md:block">
      <Table className="[&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
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
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-[0.75rem] text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {row.automationName ?? "—"}
              </TableCell>
              <TableCell className="font-mono text-[0.75rem] text-muted-foreground">
                {handleOf(row)}
              </TableCell>
              <TableCell>{stateOf(row.state)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function RecentCommentsList({ rows }: { rows: RecentComment[] }) {
  return (
    <ul className="md:hidden">
      {rows.map((row) => (
        <li className="border-b border-line-subtle py-3" key={row.id}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-foreground">
              {row.automationName ?? "—"}
            </span>
            {stateOf(row.state)}
          </div>
          <div className="mt-0.5 flex items-baseline justify-between gap-3">
            <span className="truncate font-mono text-[0.75rem] text-muted-foreground">
              {handleOf(row)}
            </span>
            <span className="font-mono text-[0.75rem] text-muted-soft">
              {formatDateTime(row.createdAt)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Últimos comentários: tabela no desktop, registro de duas linhas no mobile. */
export function RecentCommentsSection({
  rows,
  total,
}: {
  rows: RecentComment[];
  total: number;
}) {
  const visible = rows.slice(0, RECENT_LIMIT);

  return (
    <section aria-label="Últimos comentários" className="min-w-0">
      <SectionHeading
        meta={visible.length > 0 ? `${visible.length} de ${total}` : undefined}
        title="Últimos comentários"
      />

      {visible.length === 0 ? (
        <p className="border-b border-line-subtle py-4 text-sm text-muted-foreground">
          Os comentários aparecem aqui assim que chegam.
        </p>
      ) : (
        <>
          <RecentCommentsTable rows={visible} />
          <RecentCommentsList rows={visible.slice(0, MOBILE_LIMIT)} />
        </>
      )}
    </section>
  );
}

function Readout({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line-subtle py-2.5">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono text-[0.8125rem] text-foreground">
        {value}
      </dd>
    </div>
  );
}

export function OperationsPanel({
  queuedJobs,
  waitingReply,
  lastTickAt,
  recentEvents,
}: Pick<
  DashboardData,
  "queuedJobs" | "waitingReply" | "lastTickAt" | "recentEvents"
>) {
  return (
    <aside aria-labelledby="operacao-title" className="min-w-0">
      <SectionHeading title="Operação" />
      <dl>
        <Readout label="Mensagens na fila" value={queuedJobs} />
        <Readout label="Aguardando resposta" value={waitingReply} />
        <Readout
          label="Última tarefa"
          value={lastTickAt ? formatDateTime(new Date(lastTickAt)) : "—"}
        />
        <Readout
          label="Último webhook"
          value={
            recentEvents[0] ? formatDateTime(recentEvents[0].receivedAt) : "—"
          }
        />
      </dl>
      <p className="mt-5 max-w-[34ch] text-[0.8125rem] leading-5 text-muted-soft">
        &quot;Aceita&quot; significa que a Meta recebeu a solicitação; não é
        confirmação de leitura.
      </p>
    </aside>
  );
}

export function NewAutomationButton() {
  return (
    <Button asChild className="hidden md:inline-flex" size="lg">
      <Link href="/admin/automacoes/nova">
        <PlusIcon aria-hidden />
        Nova automação
      </Link>
    </Button>
  );
}

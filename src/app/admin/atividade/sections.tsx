import Link from "next/link";
import {
  ArrowRightIcon,
  ClockIcon,
  PlugZapIcon,
  RefreshCwIcon,
  ShieldAlertIcon,
} from "lucide-react";

import {
  ACTIVITY_FILTERS,
  type ActivityFilter,
} from "@/app/admin/atividade/data";
import { Metric } from "@/app/admin/dashboard-sections";
import { formatDateTime, interactionLabels } from "@/app/admin/labels";
import type { ActivityData } from "@/app/admin/atividade/data";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ R2 */

export function ActivityHeader({ situation }: { situation?: ActivityFilter }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <h1 className="text-display text-foreground">Atividade</h1>
        <p className="mt-2 text-body text-muted-foreground">
          Últimos registros de interações, envios e webhooks. Use esta página
          para acompanhar o primeiro teste em produção.
        </p>
      </div>
      <Button asChild size="lg">
        <Link
          href={
            situation
              ? `/admin/atividade?situacao=${situation}`
              : "/admin/atividade"
          }
        >
          <RefreshCwIcon aria-hidden />
          Atualizar
        </Link>
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ R3 */

type ActivityAlert = {
  id: string;
  variant: "warning" | "danger";
  icon: typeof PlugZapIcon;
  title: string;
  description: string;
  href?: string;
  action?: string;
};

function buildAlerts({
  account,
  tickDate,
  tickStale,
  webhookError,
}: Pick<
  ActivityData,
  "account" | "tickDate" | "tickStale" | "webhookError"
>): ActivityAlert[] {
  const alerts: ActivityAlert[] = [];

  if (!account) {
    alerts.push({
      id: "account",
      variant: "warning",
      icon: PlugZapIcon,
      title: "Nenhuma conta conectada",
      description: "Conecte o Instagram para começar a receber comentários.",
      href: "/admin/conexao",
      action: "Conectar agora",
    });
  }

  if (tickStale) {
    alerts.push({
      id: "tick",
      variant: "danger",
      icon: ClockIcon,
      title: "A tarefa agendada parou",
      description: `A fila não anda desde ${formatDateTime(tickDate)}. Confira o cron em /api/cron/tick.`,
    });
  }

  if (webhookError) {
    alerts.push({
      id: "webhook",
      variant: "danger",
      icon: ShieldAlertIcon,
      title: "A inscrição dos webhooks falhou",
      description: webhookError,
      href: "/admin/conexao",
      action: "Ver Conexão",
    });
  }

  // §4: no máximo 2 alertas empilhados.
  return alerts.slice(0, 2);
}

export function ActivityAlerts(props: Parameters<typeof buildAlerts>[0]) {
  const alerts = buildAlerts(props);
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
                {alert.href ? (
                  <Link
                    className="inline-flex items-center gap-1 font-medium text-current"
                    href={alert.href}
                  >
                    {alert.action}
                    <ArrowRightIcon aria-hidden className="size-3.5" />
                  </Link>
                ) : null}
              </span>
            </AlertDescription>
          </Alert>
        );
      })}
    </section>
  );
}

/* ------------------------------------------------------------------ R4 */

export function ActivityStats({
  lastTickAt,
  lastDrainAt,
  drainSummary,
  lastSendAt,
}: Pick<
  ActivityData,
  "lastTickAt" | "lastDrainAt" | "drainSummary" | "lastSendAt"
>) {
  return (
    <section
      aria-label="Estado da operação"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Metric
        hint="Se parar, a fila para"
        label="Última tarefa agendada"
        value={lastTickAt ? formatDateTime(new Date(lastTickAt)) : "nunca"}
      />
      <Metric
        hint="Rodada da fila"
        label="Último dreno"
        value={lastDrainAt ? formatDateTime(new Date(lastDrainAt)) : "nunca"}
      />
      <Metric
        hint="Aceitas, falhas e expiradas"
        label="Resultado"
        value={drainSummary}
      />
      <Metric
        hint="Aceita pela Meta"
        label="Último envio"
        value={lastSendAt ? formatDateTime(new Date(lastSendAt)) : "—"}
      />
    </section>
  );
}

/** Filtro da lista de interações; o estado vive na URL. */
export function ActivityFilterBar({
  situation,
}: {
  situation?: ActivityFilter;
}) {
  return (
    <nav
      aria-label="Filtrar interações por situação"
      className="flex flex-wrap items-center gap-2"
    >
      <Button asChild size="sm" variant={situation ? "ghost" : "secondary"}>
        <Link
          aria-current={situation ? undefined : "page"}
          href="/admin/atividade"
        >
          Todas
        </Link>
      </Button>
      {ACTIVITY_FILTERS.map((filter) => (
        <Button
          key={filter}
          asChild
          size="sm"
          variant={situation === filter ? "secondary" : "ghost"}
        >
          <Link
            aria-current={situation === filter ? "page" : undefined}
            href={`/admin/atividade?situacao=${filter}`}
          >
            {interactionLabels[filter] ?? filter}
          </Link>
        </Button>
      ))}
    </nav>
  );
}

export function ConnectionTestNote({
  result,
}: {
  result: NonNullable<ActivityData["connectionTest"]>;
}) {
  return (
    <p className="text-label text-muted-foreground">
      Último teste de conexão em {formatDateTime(new Date(result.checkedAt))}:{" "}
      {result.problems.length === 0 ? "tudo certo." : result.problems.join(" ")}
    </p>
  );
}

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
import { cn } from "@/lib/utils";

export const ACTIVITY_TABS = ["interacoes", "envios", "webhooks"] as const;
export type ActivityTab = (typeof ACTIVITY_TABS)[number];

export function isActivityTab(value: string | undefined): value is ActivityTab {
  return ACTIVITY_TABS.includes(value as ActivityTab);
}

const TAB_ITEMS: { id: ActivityTab; label: string }[] = [
  { id: "interacoes", label: "Interações" },
  { id: "envios", label: "Envios" },
  { id: "webhooks", label: "Webhooks" },
];

function tabHref(tab: ActivityTab, situation?: ActivityFilter) {
  const params = new URLSearchParams();
  if (tab !== "interacoes") params.set("aba", tab);
  if (tab === "interacoes" && situation) params.set("situacao", situation);
  const query = params.toString();
  return query ? `/admin/atividade?${query}` : "/admin/atividade";
}

/* ------------------------------------------------------------------ R2 */

export function ActivityHeader({ href }: { href: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-6">
      <div className="max-w-2xl">
        <h1 className="text-display text-foreground">Atividade</h1>
        <p className="mt-2 text-body text-muted-foreground">
          Interações, envios e webhooks do primeiro teste em produção.
        </p>
      </div>
      <Button asChild className="w-full sm:w-auto" size="lg">
        <Link href={href}>
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

/** As três listas vivem em abas; o estado fica na URL. */
export function ActivityTabs({
  tab,
  situation,
}: {
  tab: ActivityTab;
  situation?: ActivityFilter;
}) {
  return (
    <nav
      aria-label="Tipo de registro"
      className="grid grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1"
    >
      {TAB_ITEMS.map((item) => {
        const active = tab === item.id;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center justify-center rounded-md px-2 text-label transition-colors duration-150 ease-out",
              active
                ? "bg-secondary text-primary"
                : "text-muted-foreground hover:bg-surface-hover hover:text-foreground",
            )}
            href={tabHref(item.id, situation)}
            key={item.id}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
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
    <>
      <form
        action="/admin/atividade"
        className="flex items-end gap-2 sm:hidden"
        method="get"
      >
        <label className="sr-only" htmlFor="situacao">
          Situação
        </label>
        <select
          className="h-12 min-w-0 flex-1 rounded-md border border-input bg-muted px-3 text-body text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          defaultValue={situation ?? ""}
          id="situacao"
          name="situacao"
        >
          <option value="">Todas as situações</option>
          {ACTIVITY_FILTERS.map((filter) => (
            <option key={filter} value={filter}>
              {interactionLabels[filter] ?? filter}
            </option>
          ))}
        </select>
        <Button className="h-12" type="submit" variant="secondary">
          Filtrar
        </Button>
      </form>

      <nav
        aria-label="Filtrar interações por situação"
        className="hidden flex-wrap items-center gap-2 sm:flex"
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
    </>
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

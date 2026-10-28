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
import { formatDateTime, interactionLabels } from "@/app/admin/labels";
import type { ActivityData } from "@/app/admin/atividade/data";
import { PageHeader } from "@/components/marichat/page-header";
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
    <PageHeader
      action={
        <Button asChild className="w-full sm:w-auto" size="lg" variant="secondary">
          <Link href={href}>
            <RefreshCwIcon aria-hidden />
            Atualizar
          </Link>
        </Button>
      }
      description="Interações, envios e webhooks do primeiro teste em produção."
      title="Atividade"
    />
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
    <nav aria-label="Tipo de registro" className="flex border-b border-border">
      {TAB_ITEMS.map((item) => {
        const active = tab === item.id;
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-12 flex-1 items-center justify-center px-2 text-label transition-colors duration-150 ease-out md:flex-none md:justify-start md:px-5 md:first:pl-0",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={tabHref(item.id, situation)}
            key={item.id}
          >
            {item.label}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-2 bottom-0 h-0.5 bg-primary md:inset-x-5"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Readout({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-micro text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 text-title text-foreground" data-numeric>
        {value}
      </dd>
      <p className="mt-0.5 text-label text-muted-soft">{hint}</p>
    </div>
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
    <dl
      aria-label="Estado da operação"
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
    >
      <Readout
        hint="Se parar, a fila para"
        label="Última tarefa agendada"
        value={lastTickAt ? formatDateTime(new Date(lastTickAt)) : "nunca"}
      />
      <Readout
        hint="Rodada da fila"
        label="Último dreno"
        value={lastDrainAt ? formatDateTime(new Date(lastDrainAt)) : "nunca"}
      />
      <Readout
        hint="Aceitas, falhas e expiradas"
        label="Resultado"
        value={drainSummary}
      />
      <Readout
        hint="Aceita pela Meta"
        label="Último envio"
        value={lastSendAt ? formatDateTime(new Date(lastSendAt)) : "—"}
      />
    </dl>
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

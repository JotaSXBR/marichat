import Link from "next/link";
import {
  ArrowRightIcon,
  ChevronDownIcon,
  ClockIcon,
  PlugZapIcon,
  ShieldAlertIcon,
} from "lucide-react";

import { buildActivityAlerts } from "@/app/admin/atividade/alerts";
import {
  ACTIVITY_FILTERS,
  type ActivityFilter,
} from "@/app/admin/atividade/data";
import {
  activityTabHref,
  type ActivityTab,
} from "@/app/admin/atividade/navigation";
import { formatDateTime, interactionLabels } from "@/app/admin/labels";
import type { ActivityData } from "@/app/admin/atividade/data";
import { FilterSelect } from "@/components/marichat/filter-select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const ALERT_ICONS = {
  plug: PlugZapIcon,
  clock: ClockIcon,
  shield: ShieldAlertIcon,
};

const TAB_ITEMS: { id: ActivityTab; label: string }[] = [
  { id: "interacoes", label: "Interações" },
  { id: "envios", label: "Envios" },
  { id: "webhooks", label: "Webhooks" },
];

/* ------------------------------------------------------------------ R3 */

export function ActivityAlerts(
  props: Parameters<typeof buildActivityAlerts>[0],
) {
  const alerts = buildActivityAlerts(props);
  if (alerts.length === 0) return null;

  return (
    <section aria-label="Avisos" className="grid gap-2">
      {alerts.map((alert) => {
        const Icon = ALERT_ICONS[alert.icon];
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
              "relative flex min-h-11 flex-1 items-center justify-center px-2 text-[0.875rem] transition-colors duration-150 ease-out md:flex-none md:justify-start md:px-5 md:first:pl-0",
              active
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            href={activityTabHref(item.id, situation)}
            key={item.id}
          >
            {item.label}
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground"
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
    <div className="min-w-0 border-b border-line-subtle py-2.5">
      <dt className="text-[0.75rem] text-muted-soft">{label}</dt>
      <dd className="mt-0.5 font-mono text-[0.8125rem] text-foreground">
        {value}
      </dd>
      <p className="mt-0.5 text-[0.75rem] text-muted-soft">{hint}</p>
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
    <dl aria-label="Estado da operação" className="grid gap-x-8 sm:grid-cols-2">
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
    <form
      action="/admin/atividade"
      className="flex flex-wrap items-center gap-2"
      method="get"
    >
      <label className="sr-only" htmlFor="situacao">
        Situação
      </label>
      <FilterSelect
        className="h-11 w-[240px] rounded-md border border-input bg-muted px-3 text-label text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:h-9"
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
      </FilterSelect>
    </form>
  );
}

export function ConnectionTestNote({
  result,
}: {
  result: NonNullable<ActivityData["connectionTest"]>;
}) {
  return (
    <p className="text-[0.8125rem] text-muted-foreground">
      Último teste de conexão em {formatDateTime(new Date(result.checkedAt))}:{" "}
      {result.problems.length === 0 ? "tudo certo." : result.problems.join(" ")}
    </p>
  );
}

/** Diagnóstico fica fechado: é consulta, não a tarefa da tela. */
export function ActivityDiagnostics({
  data,
}: {
  data: Pick<
    ActivityData,
    | "lastTickAt"
    | "lastDrainAt"
    | "drainSummary"
    | "lastSendAt"
    | "connectionTest"
  >;
}) {
  return (
    <details className="group border-t border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-[0.875rem] font-medium text-foreground [&::-webkit-details-marker]:hidden">
        Diagnóstico da operação
        <ChevronDownIcon
          aria-hidden
          className="size-4 text-muted-soft transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 pb-2">
        <ActivityStats
          drainSummary={data.drainSummary}
          lastDrainAt={data.lastDrainAt}
          lastSendAt={data.lastSendAt}
          lastTickAt={data.lastTickAt}
        />

        {data.connectionTest ? (
          <ConnectionTestNote result={data.connectionTest} />
        ) : null}
      </div>
    </details>
  );
}

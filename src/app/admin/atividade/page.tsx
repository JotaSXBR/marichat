import { connection } from "next/server";
import { ChevronDownIcon } from "lucide-react";

import { isActivityFilter, loadActivity } from "@/app/admin/atividade/data";
import {
  ActivityAlerts,
  ActivityFilterBar,
  ActivityHeader,
  ActivityStats,
  ActivityTabs,
  ConnectionTestNote,
  isActivityTab,
} from "@/app/admin/atividade/sections";
import {
  EventsSection,
  InteractionsSection,
  JobsSection,
} from "@/app/admin/atividade/tables";
import { StatusToast } from "@/app/admin/status-toast";
import { requireAdmin } from "@/lib/auth";

/**
 * Página de diagnóstico: mostra o que o webhook gravou, o que a fila tentou
 * enviar e o que falhou. Serve para acompanhar o primeiro teste em produção
 * sem precisar abrir o banco ou os logs do Coolify.
 */

export const instant = false;

export default async function ActivityPage({
  searchParams,
}: PageProps<"/admin/atividade">) {
  await connection();
  await requireAdmin();

  const params = await searchParams;
  const rawFilter =
    typeof params.situacao === "string" ? params.situacao : undefined;
  const situation = isActivityFilter(rawFilter) ? rawFilter : undefined;
  const rawTab = typeof params.aba === "string" ? params.aba : undefined;
  const tab = isActivityTab(rawTab) ? rawTab : "interacoes";
  const data = await loadActivity(situation ? { situation } : {});

  const query = new URLSearchParams();
  if (tab !== "interacoes") query.set("aba", tab);
  if (tab === "interacoes" && situation) query.set("situacao", situation);
  const refreshHref = query.size
    ? `/admin/atividade?${query.toString()}`
    : "/admin/atividade";

  return (
    <div className="space-y-8">
      <ActivityHeader href={refreshHref} />

      <ActivityAlerts
        account={data.account}
        tickDate={data.tickDate}
        tickStale={data.tickStale}
        webhookError={data.webhookError}
      />

      <ActivityTabs situation={situation} tab={tab} />

      {tab === "interacoes" ? (
        <>
          <ActivityFilterBar {...(situation ? { situation } : {})} />
          <InteractionsSection
            rows={data.interactions}
            {...(situation ? { situation } : {})}
          />
        </>
      ) : null}

      {tab === "envios" ? <JobsSection rows={data.jobs} /> : null}
      {tab === "webhooks" ? <EventsSection rows={data.events} /> : null}

      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-3 text-title text-foreground [&::-webkit-details-marker]:hidden">
          Ver diagnóstico
          <ChevronDownIcon
            aria-hidden
            className="size-4 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
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

      <StatusToast
        task={{
          id: "activity",
          label: "Fila",
          detail: `Último dreno: ${data.drainSummary}`,
          status: "done",
        }}
      />
    </div>
  );
}

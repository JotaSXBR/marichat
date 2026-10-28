import { connection } from "next/server";
import Link from "next/link";

import { isActivityFilter, loadActivity } from "@/app/admin/atividade/data";
import {
  ActivityAlerts,
  ActivityDiagnostics,
  ActivityFilterBar,
  ActivityTabs,
  isActivityTab,
  type ActivityTab,
} from "@/app/admin/atividade/sections";
import {
  EventsSection,
  InteractionsSection,
  JobsSection,
} from "@/app/admin/atividade/tables";
import { PageHeader } from "@/components/marichat/page-header";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth";
import type { ActivityFilter } from "@/app/admin/atividade/data";

/**
 * Página de diagnóstico: mostra o que o webhook gravou, o que a fila tentou
 * enviar e o que falhou. Serve para acompanhar o primeiro teste em produção
 * sem precisar abrir o banco ou os logs do Coolify.
 */

export const instant = false;

/** Aba e situação vivem na URL; valor inválido cai no padrão. */
function readQuery(params: Record<string, string | string[] | undefined>) {
  const rawTab = typeof params.aba === "string" ? params.aba : undefined;
  const rawSituation =
    typeof params.situacao === "string" ? params.situacao : undefined;
  const tab: ActivityTab = isActivityTab(rawTab) ? rawTab : "interacoes";
  const situation: ActivityFilter | undefined = isActivityFilter(rawSituation)
    ? rawSituation
    : undefined;

  const query = new URLSearchParams();
  if (tab !== "interacoes") query.set("aba", tab);
  if (tab === "interacoes" && situation) query.set("situacao", situation);

  return {
    tab,
    situation,
    refreshHref: query.size
      ? `/admin/atividade?${query.toString()}`
      : "/admin/atividade",
  };
}

export default async function ActivityPage({
  searchParams,
}: PageProps<"/admin/atividade">) {
  await connection();
  await requireAdmin();

  const { tab, situation, refreshHref } = readQuery(await searchParams);
  const data = await loadActivity(situation ? { situation } : {});

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Button asChild size="lg" variant="secondary">
            <Link href={refreshHref}>Atualizar</Link>
          </Button>
        }
        meta={`${data.interactions.length} interações · ${data.jobs.length} envios · ${data.events.length} webhooks`}
        title="Atividade"
      />

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

      <ActivityDiagnostics data={data} />
    </div>
  );
}

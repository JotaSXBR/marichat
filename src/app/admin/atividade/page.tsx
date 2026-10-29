import { connection } from "next/server";
import Link from "next/link";

import { loadActivity } from "@/app/admin/atividade/data";
import {
  activityMoreHrefs,
  readActivityQuery,
} from "@/app/admin/atividade/navigation";
import {
  ActivityAlerts,
  ActivityDiagnostics,
  ActivityFilterBar,
  ActivityTabs,
} from "@/app/admin/atividade/sections";
import {
  EventsSection,
  InteractionsSection,
  JobsSection,
} from "@/app/admin/atividade/tables";
import { PageHeader } from "@/components/marichat/page-header";
import { Button } from "@/components/ui/button";
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

  const { tab, situation, limit, refreshHref } = readActivityQuery(
    await searchParams,
  );
  const data = await loadActivity(situation ? { situation, limit } : { limit });
  const more = activityMoreHrefs({ situation, limit });

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Button asChild size="lg" variant="secondary">
            <Link href={refreshHref}>Atualizar</Link>
          </Button>
        }
        meta={`${data.totals.interactions} interações · ${data.totals.jobs} envios · ${data.totals.events} webhooks`}
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
            moreHref={more.interactions}
            rows={data.interactions}
            total={data.totals.interactions}
            {...(situation ? { situation } : {})}
          />
        </>
      ) : null}

      {tab === "envios" ? (
        <JobsSection
          moreHref={more.jobs}
          rows={data.jobs}
          total={data.totals.jobs}
        />
      ) : null}
      {tab === "webhooks" ? (
        <EventsSection
          moreHref={more.events}
          rows={data.events}
          total={data.totals.events}
        />
      ) : null}

      <ActivityDiagnostics data={data} />
    </div>
  );
}

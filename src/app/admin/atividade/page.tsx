import { connection } from "next/server";
import Link from "next/link";

import { loadActivity } from "@/app/admin/atividade/data";
import { readActivityQuery } from "@/app/admin/atividade/navigation";
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

  const { tab, situation, refreshHref } = readActivityQuery(await searchParams);
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

import { connection } from "next/server";

import { isActivityFilter, loadActivity } from "@/app/admin/atividade/data";
import {
  ActivityAlerts,
  ActivityFilterBar,
  ActivityHeader,
  ActivityStats,
  ConnectionTestNote,
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
  const raw = typeof params.situacao === "string" ? params.situacao : undefined;
  const situation = isActivityFilter(raw) ? raw : undefined;
  const data = await loadActivity(situation ? { situation } : {});

  return (
    <div className="space-y-8">
      <ActivityHeader {...(situation ? { situation } : {})} />

      <ActivityAlerts
        account={data.account}
        tickDate={data.tickDate}
        tickStale={data.tickStale}
        webhookError={data.webhookError}
      />

      <ActivityStats
        lastTickAt={data.lastTickAt}
        lastDrainAt={data.lastDrainAt}
        drainSummary={data.drainSummary}
        lastSendAt={data.lastSendAt}
      />

      {data.connectionTest ? (
        <ConnectionTestNote result={data.connectionTest} />
      ) : null}

      <ActivityFilterBar {...(situation ? { situation } : {})} />

      <InteractionsSection
        rows={data.interactions}
        {...(situation ? { situation } : {})}
      />
      <JobsSection rows={data.jobs} />
      <EventsSection rows={data.events} />

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

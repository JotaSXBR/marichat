import { connection } from "next/server";

import {
  ActivityAlerts,
  ActivityFooter,
  ActivityHeader,
  ActivityStats,
  ConnectionTestNote,
  EventsSection,
  InteractionsSection,
  JobsSection,
} from "@/app/admin/atividade/sections";
import { loadActivity } from "@/app/admin/atividade/data";
import { requireAdmin } from "@/lib/auth";

/**
 * Página de diagnóstico: mostra o que o webhook gravou, o que a fila tentou
 * enviar e o que falhou. Serve para acompanhar o primeiro teste em produção
 * sem precisar abrir o banco ou os logs do Coolify.
 */

export const instant = false;

export default async function ActivityPage() {
  await connection();
  await requireAdmin();

  const data = await loadActivity();

  return (
    <div className="space-y-8">
      <ActivityHeader />

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

      <InteractionsSection rows={data.interactions} />
      <JobsSection rows={data.jobs} />
      <EventsSection rows={data.events} />
      <ActivityFooter />
    </div>
  );
}

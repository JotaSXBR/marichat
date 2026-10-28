import { connection } from "next/server";

import { loadDashboard } from "@/app/admin/dashboard";
import {
  AttentionSection,
  DashboardAlerts,
  NewAutomationButton,
  OperationsPanel,
  RecentCommentsSection,
} from "@/app/admin/dashboard-sections";
import { MobileActionBar } from "@/components/marichat/mobile-action-bar";
import { PageHeader } from "@/components/marichat/page-header";
import { requireAdmin } from "@/lib/auth";

// Painel depende do banco e da autenticação a cada acesso.
export const instant = false;

function FlowSummary({
  totalInteractions,
  acceptedDms,
  linksSent,
}: {
  totalInteractions: number;
  acceptedDms: number;
  linksSent: number;
}) {
  const stage = (value: number, label: string) => (
    <>
      <strong className="font-medium text-foreground">{value}</strong>
      {"\u00A0"}
      {label}
    </>
  );

  return (
    <>
      {stage(totalInteractions, "comentários")}
      <span aria-hidden className="mx-1.5 text-muted-soft">
        →
      </span>
      <span className="sr-only">, </span>
      {stage(acceptedDms, "DMs aceitas")}
      <span aria-hidden className="mx-1.5 text-muted-soft">
        →
      </span>
      <span className="sr-only">, </span>
      {stage(linksSent, "links")}
    </>
  );
}

export default async function AdminDashboard() {
  await connection();
  await requireAdmin();

  const data = await loadDashboard();

  return (
    <div className="space-y-6">
      <PageHeader
        action={<NewAutomationButton />}
        meta={
          <FlowSummary
            acceptedDms={data.acceptedDms}
            linksSent={data.linksSent}
            totalInteractions={data.totalInteractions}
          />
        }
        title="Visão geral"
      />

      <DashboardAlerts
        account={data.account}
        tokenDaysLeft={data.tokenDaysLeft}
        webhookError={data.webhookError}
      />

      <div className="grid gap-10 pt-1 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
        <div className="min-w-0 space-y-9">
          <AttentionSection now={data.dbNow} rows={data.attention} />
          <RecentCommentsSection
            rows={data.recent}
            total={data.totalInteractions}
          />
        </div>

        <OperationsPanel
          lastTickAt={data.lastTickAt}
          queuedJobs={data.queuedJobs}
          recentEvents={data.recentEvents}
          waitingReply={data.waitingReply}
        />
      </div>

      <MobileActionBar href="/admin/automacoes/nova" />
    </div>
  );
}

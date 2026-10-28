import { connection } from "next/server";

import { loadDashboard } from "@/app/admin/dashboard";
import {
  AttentionLedger,
  DashboardAlerts,
  DashboardHeader,
  FlowPanel,
  OperationsPanel,
  RecentCommentsSection,
} from "@/app/admin/dashboard-sections";
import { MobileActionBar } from "@/components/marichat/mobile-action-bar";
import { requireAdmin } from "@/lib/auth";

// Painel depende do banco e da autenticação a cada acesso.
export const instant = false;

export default async function AdminDashboard() {
  await connection();
  await requireAdmin();

  const data = await loadDashboard();

  return (
    <div className="space-y-8">
      <DashboardHeader />

      <DashboardAlerts
        account={data.account}
        tokenDaysLeft={data.tokenDaysLeft}
        webhookError={data.webhookError}
      />

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="space-y-8 lg:col-span-8">
          <FlowPanel
            acceptedDms={data.acceptedDms}
            linksSent={data.linksSent}
            totalInteractions={data.totalInteractions}
          />

          <AttentionLedger
            needAttention={data.needAttention}
            waitingReply={data.waitingReply}
          />

          <RecentCommentsSection rows={data.recent} />
        </div>

        <aside className="min-w-0 lg:col-span-4 lg:border-l lg:border-border lg:pl-8">
          <OperationsPanel
            lastTickAt={data.lastTickAt}
            queuedJobs={data.queuedJobs}
            recentEvents={data.recentEvents}
          />
        </aside>
      </div>

      <MobileActionBar href="/admin/automacoes/nova" />
    </div>
  );
}

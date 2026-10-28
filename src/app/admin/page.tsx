import { connection } from "next/server";

import { loadDashboard } from "@/app/admin/dashboard";
import {
  DashboardAlerts,
  DashboardCards,
  DashboardHeader,
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
    <div className="space-y-6 md:space-y-8">
      <DashboardHeader />

      <DashboardAlerts
        account={data.account}
        tokenDaysLeft={data.tokenDaysLeft}
        webhookError={data.webhookError}
      />

      <DashboardCards
        needAttention={data.needAttention}
        waitingReply={data.waitingReply}
      />

      <OperationsPanel
        lastTickAt={data.lastTickAt}
        queuedJobs={data.queuedJobs}
        recentEvents={data.recentEvents}
      />

      <RecentCommentsSection rows={data.recent} />

      <MobileActionBar href="/admin/automacoes/nova" />
    </div>
  );
}

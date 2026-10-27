import { connection } from "next/server";

import { loadDashboard } from "@/app/admin/dashboard";
import {
  AccountPanel,
  DashboardAlerts,
  DashboardCards,
  DashboardHeader,
  OperationsPanel,
  RecentCommentsSection,
} from "@/app/admin/dashboard-sections";
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
        webhookError={data.webhookError}
        tokenDaysLeft={data.tokenDaysLeft}
      />

      <DashboardCards
        activeAutomations={data.activeAutomations}
        totalAutomations={data.totalAutomations}
        waitingReply={data.waitingReply}
        linkSent={data.linkSent}
        needAttention={data.needAttention}
      />

      <section className="grid gap-4 sm:grid-cols-2">
        <AccountPanel account={data.account} />
        <OperationsPanel
          queuedJobs={data.queuedJobs}
          lastTickAt={data.lastTickAt}
          recentEvents={data.recentEvents}
        />
      </section>

      <RecentCommentsSection rows={data.recent} />
    </div>
  );
}

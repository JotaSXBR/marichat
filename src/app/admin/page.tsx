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
import { OverviewIsland } from "@/app/admin/overview-island";
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

      <DashboardCards
        activeAutomations={data.activeAutomations}
        linkSent={data.linkSent}
        needAttention={data.needAttention}
        totalAutomations={data.totalAutomations}
        waitingReply={data.waitingReply}
      />

      <section
        aria-label="Conta e operação"
        className="grid gap-4 lg:grid-cols-2"
      >
        <AccountPanel account={data.account} />
        <OperationsPanel
          lastTickAt={data.lastTickAt}
          queuedJobs={data.queuedJobs}
          recentEvents={data.recentEvents}
        />
      </section>

      <RecentCommentsSection rows={data.recent} />

      {data.account ? (
        <OverviewIsland
          connected={data.account.connectionStatus === "connected"}
          handle={data.account.username}
          queuedJobs={data.queuedJobs}
        />
      ) : null}
    </div>
  );
}

import { connection } from "next/server";

import { AccountCard } from "@/app/admin/conexao/account-card";
import { AdvancedSection } from "@/app/admin/conexao/advanced-section";
import { ConnectionHeader } from "@/app/admin/conexao/connection-header";
import { ConnectionNotices } from "@/app/admin/conexao/connection-notices";
import { DiagnosticsCard } from "@/app/admin/conexao/diagnostics-card";
import { EmptyAccountCard } from "@/app/admin/conexao/empty-account-card";
import { loadConnectionData } from "@/app/admin/conexao/load-connection";
import { requireAdmin } from "@/lib/auth";
import { getMessagingProvider } from "@/lib/messaging/provider";

export const instant = false;

export default async function ConnectionPage({
  searchParams,
}: PageProps<"/admin/conexao">) {
  await connection();
  await requireAdmin();

  const params = await searchParams;
  const get = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const isZernio = getMessagingProvider() === "zernio";
  const data = await loadConnectionData(isZernio);

  return (
    <div className="space-y-6">
      <ConnectionHeader canTest={Boolean(data.account)} isZernio={isZernio} />

      <ConnectionNotices
        ok={get("ok") === "1"}
        accountName={get("conta")}
        webhookRequested={get("webhook") === "1"}
        errorCode={get("erro")}
        disconnected={get("desconectado") === "1"}
        tested={get("testado") === "1"}
      />

      <section
        aria-label="Conta e diagnóstico"
        className="grid gap-8 lg:grid-cols-2 lg:gap-12"
      >
        <div className="min-w-0">
          {data.account ? (
            <AccountCard
              account={data.account}
              isZernio={isZernio}
              webhookError={data.webhookError}
              subscribedAt={data.subscribedAt}
            />
          ) : (
            <EmptyAccountCard
              isZernio={isZernio}
              zernioAccounts={data.zernioAccounts}
              zernioListError={data.zernioListError}
            />
          )}
        </div>

        {data.account ? (
          <div className="min-w-0 lg:border-l lg:border-border lg:pl-12">
            <DiagnosticsCard isZernio={isZernio} test={data.connectionTest} />
          </div>
        ) : null}
      </section>

      <AdvancedSection
        appUrl={data.appUrl}
        events={data.lastEvents}
        isZernio={isZernio}
        requirements={data.requiredEnv}
      />
    </div>
  );
}

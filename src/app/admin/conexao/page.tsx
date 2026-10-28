import { connection } from "next/server";
import { ChevronDownIcon } from "lucide-react";

import { AccountCard } from "@/app/admin/conexao/account-card";
import { ConnectionHeader } from "@/app/admin/conexao/connection-header";
import { ConnectionNotices } from "@/app/admin/conexao/connection-notices";
import { DiagnosticsCard } from "@/app/admin/conexao/diagnostics-card";
import { EmptyAccountCard } from "@/app/admin/conexao/empty-account-card";
import { EnvChecklist } from "@/app/admin/conexao/env-checklist";
import { loadConnectionData } from "@/app/admin/conexao/load-connection";
import { RecentWebhooks } from "@/app/admin/conexao/recent-webhooks";
import { WebhookSetupCard } from "@/app/admin/conexao/webhook-setup-card";
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
    <div className="space-y-8">
      <ConnectionHeader isZernio={isZernio} />

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
        className="grid gap-4 lg:grid-cols-2"
      >
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

        {data.account ? (
          <DiagnosticsCard isZernio={isZernio} test={data.connectionTest} />
        ) : null}
      </section>

      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border bg-card px-5 py-3 text-title text-foreground [&::-webkit-details-marker]:hidden">
          <span>
            Avançado
            <span className="ml-2 font-sans text-label font-normal text-muted-foreground">
              Webhook, variáveis e últimos eventos
            </span>
          </span>
          <ChevronDownIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
          />
        </summary>

        <div className="mt-4 space-y-4">
          <WebhookSetupCard isZernio={isZernio} appUrl={data.appUrl} />
          <EnvChecklist requirements={data.requiredEnv} />
          <RecentWebhooks events={data.lastEvents} />
        </div>
      </details>
    </div>
  );
}

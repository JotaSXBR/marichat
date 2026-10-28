import { ChevronDownIcon } from "lucide-react";

import { EnvChecklist } from "@/app/admin/conexao/env-checklist";
import { RecentWebhooks } from "@/app/admin/conexao/recent-webhooks";
import { WebhookSetupCard } from "@/app/admin/conexao/webhook-setup-card";
import type { ConnectionPageData } from "@/app/admin/conexao/load-connection";

type Props = {
  isZernio: boolean;
  appUrl?: string;
  requirements: ConnectionPageData["requiredEnv"];
  events: ConnectionPageData["lastEvents"];
};

/** O que só se abre quando a conexão principal já está de pé. */
export function AdvancedSection({
  isZernio,
  appUrl,
  requirements,
  events,
}: Props) {
  return (
    <details className="group border-t border-border">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-3 text-[0.875rem] font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <span>
          Avançado
          <span className="ml-2 font-sans text-[0.8125rem] font-normal text-muted-soft">
            Webhook, variáveis e últimos eventos
          </span>
        </span>
        <ChevronDownIcon
          aria-hidden
          className="size-4 shrink-0 text-muted-soft transition-transform duration-150 group-open:rotate-180"
        />
      </summary>

      <div className="mt-2">
        <WebhookSetupCard isZernio={isZernio} appUrl={appUrl} />
        <EnvChecklist requirements={requirements} />
        <RecentWebhooks events={events} />
      </div>
    </details>
  );
}

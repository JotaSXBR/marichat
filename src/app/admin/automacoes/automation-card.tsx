import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";

import { AutomationToggle } from "@/app/admin/automacoes/automation-toggle";
import type { automations } from "@/lib/db/schema";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";

type Automation = typeof automations.$inferSelect;

/** Host do link; se a URL estiver quebrada, mostra o valor cru. */
function linkHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function AutomationCard({ automation }: { automation: Automation }) {
  return (
    <Card className="gap-0 p-0" variant="interactive">
      <div className="flex items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="truncate text-title text-foreground">
            {automation.name}
          </h2>
          <StatusChip tone={automation.isActive ? "success" : "neutral"}>
            {automation.isActive ? "Ativa" : "Desativada"}
          </StatusChip>
        </div>

        <AutomationToggle id={automation.id} isActive={automation.isActive} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line-subtle px-5 py-3">
        <dl className="flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-1">
          <div className="flex items-baseline gap-2">
            <dt className="text-micro text-muted-foreground uppercase">
              Palavra-chave
            </dt>
            <dd className="font-mono text-mono text-foreground">
              {automation.keyword}
            </dd>
          </div>
          <div className="flex min-w-0 items-baseline gap-2">
            <dt className="text-micro text-muted-foreground uppercase">
              Link
            </dt>
            <dd className="truncate font-mono text-mono text-muted-foreground">
              {linkHost(automation.linkUrl)}
            </dd>
          </div>
        </dl>

        <Link
          className="inline-flex min-h-12 items-center gap-1 text-label text-muted-foreground transition-colors duration-150 ease-out hover:text-foreground sm:min-h-8"
          href={`/admin/automacoes/${automation.id}`}
        >
          Editar
          <ArrowUpRightIcon aria-hidden className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

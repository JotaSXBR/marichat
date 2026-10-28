import Link from "next/link";

import { AutomationToggle } from "@/app/admin/automacoes/automation-toggle";
import type { automations } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
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
    <Card className="gap-4 p-5" variant="interactive">
      <div className="flex items-start justify-between gap-4">
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

      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <div className="flex items-baseline gap-1.5">
          <dt className="text-label text-muted-foreground">Palavra-chave</dt>
          <dd className="font-mono text-mono text-card-foreground">
            {automation.keyword}
          </dd>
        </div>
        <div className="flex min-w-0 items-baseline gap-1.5">
          <dt className="text-label text-muted-foreground">Link</dt>
          <dd className="truncate text-body text-card-foreground">
            {linkHost(automation.linkUrl)}
          </dd>
        </div>
      </dl>

      <div className="flex justify-end border-t border-line-subtle pt-4">
        <Button asChild className="h-12 sm:h-8" size="sm" variant="secondary">
          <Link href={`/admin/automacoes/${automation.id}`}>Editar</Link>
        </Button>
      </div>
    </Card>
  );
}

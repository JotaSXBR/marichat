import Link from "next/link";
import type { ReactNode } from "react";

import { AutomationToggle } from "@/app/admin/automacoes/automation-toggle";
import type { automations } from "@/lib/db/schema";
import { FOLLOW_MODE_LABELS, isFollowMode } from "@/lib/follow-mode";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/utils";

type Automation = typeof automations.$inferSelect;

/** Host do link; se a URL estiver quebrada, mostra o valor cru. */
function linkHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-1.5">
      <dt className="text-label text-muted-foreground">{label}:</dt>
      <dd className="text-body text-card-foreground">{children}</dd>
    </div>
  );
}

export function AutomationCard({ automation }: { automation: Automation }) {
  return (
    <Card
      className={cn("gap-4 p-5", !automation.isActive && "opacity-70")}
      variant="interactive"
    >
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

      <dl className="grid gap-1">
        <Detail label="Palavra-chave">
          <span className="font-mono text-mono">{automation.keyword}</span>
        </Detail>
        <Detail label="Publicação">
          {automation.mediaId
            ? `específica (${automation.mediaId})`
            : "qualquer publicação"}
        </Detail>
        <Detail label="Porta de seguidor">
          {isFollowMode(automation.followMode)
            ? FOLLOW_MODE_LABELS[automation.followMode].title
            : "Sem porta de seguidor"}
        </Detail>
        <Detail label="Link">{linkHost(automation.linkUrl)}</Detail>
      </dl>

      <div className="flex justify-end border-t border-line-subtle pt-4">
        <Button asChild size="sm" variant="secondary">
          <Link href={`/admin/automacoes/${automation.id}`}>Editar</Link>
        </Button>
      </div>
    </Card>
  );
}

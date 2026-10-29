import Link from "next/link";

import { AutomationToggle } from "@/app/admin/automacoes/automation-toggle";
import { linkLabel } from "@/app/admin/labels";
import type { automations } from "@/lib/db/schema";
import { LoadMore } from "@/components/marichat/load-more";
import { StatusChip } from "@/components/ui/status-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Automation = typeof automations.$inferSelect;

function Situation({ active }: { active: boolean }) {
  return (
    <StatusChip tone={active ? "success" : "neutral"}>
      {active ? "ativa" : "pausada"}
    </StatusChip>
  );
}

function EditLink({ id }: { id: string }) {
  return (
    <Link
      className="inline-flex min-h-11 items-center text-label text-muted-foreground underline decoration-border underline-offset-[3px] hover:text-foreground"
      href={`/admin/automacoes/${id}`}
    >
      Editar
    </Link>
  );
}

function AutomationsDesktop({ rows }: { rows: Automation[] }) {
  return (
    <div className="hidden md:block">
      <Table className="[&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
        <caption className="sr-only">
          Automações com palavra-chave, link, situação e ação
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Palavra-chave</TableHead>
            <TableHead>Link</TableHead>
            <TableHead>Situação</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Ativa</span>
            </TableHead>
            <TableHead>
              <span className="sr-only">Editar</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((automation) => (
            <TableRow key={automation.id}>
              <TableCell className="font-medium text-foreground">
                {automation.name}
              </TableCell>
              <TableCell className="font-mono text-[0.75rem] text-muted-foreground">
                {automation.keyword}
              </TableCell>
              <TableCell className="max-w-[240px] truncate font-mono text-[0.75rem] text-muted-soft">
                {linkLabel(automation.linkUrl)}
              </TableCell>
              <TableCell>
                <Situation active={automation.isActive} />
              </TableCell>
              <TableCell className="w-12">
                <AutomationToggle
                  id={automation.id}
                  isActive={automation.isActive}
                />
              </TableCell>
              <TableCell className="text-right">
                <EditLink id={automation.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function AutomationsMobile({ rows }: { rows: Automation[] }) {
  return (
    <ul className="md:hidden">
      {rows.map((automation) => (
        <li className="border-b border-line-subtle py-3.5" key={automation.id}>
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium text-foreground">
              {automation.name}
            </span>
            <AutomationToggle
              id={automation.id}
              isActive={automation.isActive}
            />
          </div>
          <p className="mt-0.5 truncate font-mono text-[0.75rem] text-muted-soft">
            {automation.keyword} · {linkLabel(automation.linkUrl)}
          </p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <Situation active={automation.isActive} />
            <EditLink id={automation.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Tabela densa no desktop; registro de três linhas no mobile (§4). */
export function AutomationsTable({
  rows,
  total,
  moreHref,
}: {
  rows: Automation[];
  total: number;
  moreHref?: string;
}) {
  return (
    <>
      <AutomationsDesktop rows={rows} />
      <AutomationsMobile rows={rows} />
      <LoadMore href={moreHref} shown={rows.length} total={total} />
      <p className="max-w-[70ch] text-[0.8125rem] leading-5 text-muted-soft">
        Editar uma automação afeta apenas comentários novos. Quem já comentou
        continua o fluxo com o texto do momento do comentário.
      </p>
    </>
  );
}

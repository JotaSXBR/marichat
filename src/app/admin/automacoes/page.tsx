import Link from "next/link";
import { connection } from "next/server";
import { desc, eq } from "drizzle-orm";

import { AutomationsTable } from "@/app/admin/automacoes/automations-table";
import type { AutomationFilter } from "@/app/admin/automacoes/automations-toolbar";
import { AutomationsToolbar } from "@/app/admin/automacoes/automations-toolbar";
import {
  EmptyAutomations,
  NoAccountNotice,
  NoMatchesNotice,
  SavedNotice,
} from "@/app/admin/automacoes/automations-notices";
import { getActiveAccount } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { automations } from "@/lib/db/schema";
import { MobileActionBar } from "@/components/marichat/mobile-action-bar";
import { PageHeader } from "@/components/marichat/page-header";
import { Button } from "@/components/ui/button";

export const instant = false;

function matches(
  automation: typeof automations.$inferSelect,
  q: string,
  situacao?: AutomationFilter,
) {
  if (situacao && automation.isActive !== (situacao === "ativa")) return false;
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    automation.name.toLowerCase().includes(needle) ||
    automation.keyword.toLowerCase().includes(needle)
  );
}

/** Contagem do cabeçalho: filtro ativo mostra o recorte, senão o total. */
function headerMeta({
  account,
  total,
  visible,
  active,
  filtering,
}: {
  account: boolean;
  total: number;
  visible: number;
  active: number;
  filtering: boolean;
}) {
  if (!account) return undefined;
  if (filtering) return `${visible} de ${total} automações`;
  return `${total} ${total === 1 ? "automação" : "automações"} · ${active} ${active === 1 ? "ativa" : "ativas"}`;
}

/** Busca e situação vivem na URL; valor inválido cai no padrão. */
function readQuery(params: Record<string, string | string[] | undefined>) {
  const situacao: AutomationFilter | undefined =
    params.situacao === "ativa" || params.situacao === "pausada"
      ? params.situacao
      : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  return {
    saved: params.ok === "1",
    q,
    situacao,
    filtering: Boolean(q || situacao),
  };
}

export default async function AutomationsPage({
  searchParams,
}: PageProps<"/admin/automacoes">) {
  await connection();
  await requireAdmin();

  const { saved, q, situacao, filtering } = readQuery(await searchParams);

  const account = await getActiveAccount();
  const rows = account
    ? await getDb()
        .select()
        .from(automations)
        .where(eq(automations.accountId, account.id))
        .orderBy(desc(automations.createdAt))
        .limit(200)
    : [];

  const visible = rows.filter((row) => matches(row, q, situacao));
  const active = rows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Button asChild className="hidden md:inline-flex" size="lg">
            <Link href="/admin/automacoes/nova">+ Nova automação</Link>
          </Button>
        }
        meta={headerMeta({
          account: Boolean(account),
          total: rows.length,
          visible: visible.length,
          active,
          filtering,
        })}
        title="Automações"
      />

      {saved ? <SavedNotice /> : null}
      {!account ? <NoAccountNotice /> : null}
      {account ? <AutomationsToolbar q={q} situacao={situacao} /> : null}
      {account && rows.length === 0 ? <EmptyAutomations /> : null}
      {visible.length > 0 ? <AutomationsTable rows={visible} /> : null}
      {account && rows.length > 0 && visible.length === 0 ? (
        <NoMatchesNotice />
      ) : null}

      <MobileActionBar href="/admin/automacoes/nova" />
    </div>
  );
}

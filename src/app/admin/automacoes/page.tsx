import Link from "next/link";
import { connection } from "next/server";
import { desc, eq } from "drizzle-orm";

import { AutomationsTable } from "@/app/admin/automacoes/automations-table";
import {
  automationsMeta,
  matchesAutomation,
  readAutomationsQuery,
} from "@/app/admin/automacoes/query";
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

export default async function AutomationsPage({
  searchParams,
}: PageProps<"/admin/automacoes">) {
  await connection();
  await requireAdmin();

  const { saved, q, situacao, filtering } = readAutomationsQuery(
    await searchParams,
  );

  const account = await getActiveAccount();
  const rows = account
    ? await getDb()
        .select()
        .from(automations)
        .where(eq(automations.accountId, account.id))
        .orderBy(desc(automations.createdAt))
        .limit(200)
    : [];

  const visible = rows.filter((row) => matchesAutomation(row, q, situacao));
  const active = rows.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          <Button asChild className="hidden md:inline-flex" size="lg">
            <Link href="/admin/automacoes/nova">+ Nova automação</Link>
          </Button>
        }
        meta={automationsMeta({
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

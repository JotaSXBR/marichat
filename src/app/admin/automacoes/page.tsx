import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { PlusIcon } from "lucide-react";

import { AutomationCard } from "@/app/admin/automacoes/automation-card";
import {
  EmptyAutomations,
  NoAccountNotice,
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

  const params = await searchParams;
  const saved = params.ok === "1";

  const account = await getActiveAccount();
  const db = getDb();
  const rows = account
    ? await db
        .select()
        .from(automations)
        .where(eq(automations.accountId, account.id))
        .orderBy(desc(automations.createdAt))
        .limit(200)
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        action={
          <Button asChild className="hidden md:inline-flex" size="lg">
            <Link href="/admin/automacoes/nova">
              <PlusIcon aria-hidden />
              Nova automação
            </Link>
          </Button>
        }
        description="Cada automação escuta uma palavra-chave nos comentários e responde com uma DM."
        meta={
          account
            ? `${rows.length} ${rows.length === 1 ? "automação" : "automações"}`
            : undefined
        }
        title="Automações"
      />

      {saved ? <SavedNotice /> : null}
      {!account ? <NoAccountNotice /> : null}
      {account && rows.length === 0 ? <EmptyAutomations /> : null}

      {rows.length > 0 ? (
        <ul className="grid gap-3">
          {rows.map((automation) => (
            <li key={automation.id}>
              <AutomationCard automation={automation} />
            </li>
          ))}
        </ul>
      ) : null}

      <MobileActionBar href="/admin/automacoes/nova" />
    </div>
  );
}

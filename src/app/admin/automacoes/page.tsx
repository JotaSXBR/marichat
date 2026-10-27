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
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-display text-foreground">Automações</h1>
          <p className="mt-2 text-body text-muted-foreground">
            Cada automação escuta uma palavra-chave nos comentários e responde
            com uma DM.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/admin/automacoes/nova">
            <PlusIcon aria-hidden />
            Nova automação
          </Link>
        </Button>
      </div>

      {saved ? <SavedNotice /> : null}
      {!account ? <NoAccountNotice /> : null}
      {account && rows.length === 0 ? <EmptyAutomations /> : null}

      {rows.length > 0 ? (
        <ul className="grid gap-3">
          {rows.map((automation) => (
            <AutomationCard key={automation.id} automation={automation} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

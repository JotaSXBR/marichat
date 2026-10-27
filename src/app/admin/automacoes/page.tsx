import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Automações</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Cada automação escuta uma palavra-chave nos comentários e responde
            com uma DM.
          </p>
        </div>
        <Link
          href="/admin/automacoes/nova"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Nova automação
        </Link>
      </div>

      {saved ? <SavedNotice /> : null}
      {!account ? <NoAccountNotice /> : null}
      {account && rows.length === 0 ? <EmptyAutomations /> : null}

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((automation) => (
            <AutomationCard key={automation.id} automation={automation} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

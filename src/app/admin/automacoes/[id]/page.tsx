import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AutomationForm } from "@/app/admin/automacoes/automation-form";
import { loadMediaOptions } from "@/app/admin/automacoes/media-options";
import { getActiveAccount } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { automations } from "@/lib/db/schema";

export const instant = false;

export default async function EditAutomationPage({
  params,
}: PageProps<"/admin/automacoes/[id]">) {
  await connection();
  await requireAdmin();

  const { id } = await params;
  const account = await getActiveAccount();
  if (!account) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Editar automação</h1>
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Conecte uma conta do Instagram primeiro.{" "}
          <Link href="/admin/conexao" className="font-medium underline">
            Ir para Conexão
          </Link>
        </p>
      </div>
    );
  }

  const db = getDb();
  const [automation] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, id), eq(automations.accountId, account.id)))
    .limit(1);

  if (!automation) notFound();

  const media = await loadMediaOptions(account, automation.mediaId ?? undefined);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar automação</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Alterações valem somente para comentários novos. Conversas já iniciadas
          mantêm o texto do momento em que foram criadas.
        </p>
      </div>

      <AutomationForm
        initial={{
          id: automation.id,
          name: automation.name,
          keyword: automation.keyword,
          mediaId: automation.mediaId ?? "",
          firstDmText: automation.firstDmText,
          secondDmText: automation.secondDmText,
          linkButtonTitle: automation.linkButtonTitle,
          linkUrl: automation.linkUrl,
          requireFollow: automation.requireFollow,
          followGateText: automation.followGateText,
          followGateFollowLabel: automation.followGateFollowLabel,
          followGateConfirmLabel: automation.followGateConfirmLabel,
          isActive: automation.isActive,
        }}
        mediaOptions={media.options}
        {...(media.error ? { mediaError: media.error } : {})}
      />
    </div>
  );
}

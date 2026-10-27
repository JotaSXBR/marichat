import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AutomationEditor } from "@/app/admin/automacoes/automation-editor";
import { loadMediaOptions } from "@/app/admin/automacoes/media-options";
import { ConnectAccountNotice } from "@/app/admin/automacoes/notices";
import { getActiveAccount } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { automations } from "@/lib/db/schema";
import { isFollowMode } from "@/lib/follow-mode";

export const instant = false;

export default async function EditAutomationPage({
  params,
}: PageProps<"/admin/automacoes/[id]">) {
  await connection();
  await requireAdmin();

  const { id } = await params;
  const account = await getActiveAccount();
  if (!account) return <ConnectAccountNotice />;

  const db = getDb();
  const [automation] = await db
    .select()
    .from(automations)
    .where(and(eq(automations.id, id), eq(automations.accountId, account.id)))
    .limit(1);

  if (!automation) notFound();

  const media = await loadMediaOptions(
    account,
    automation.mediaId ?? undefined,
  );

  return (
    <AutomationEditor
      initial={{
        id: automation.id,
        name: automation.name,
        keyword: automation.keyword,
        mediaId: automation.mediaId ?? "",
        firstDmText: automation.firstDmText,
        secondDmText: automation.secondDmText,
        linkButtonTitle: automation.linkButtonTitle,
        linkUrl: automation.linkUrl,
        followMode: isFollowMode(automation.followMode)
          ? automation.followMode
          : "off",
        followGateText: automation.followGateText,
        followGateFollowLabel: automation.followGateFollowLabel,
        followGateConfirmLabel: automation.followGateConfirmLabel,
        followOptionalText: automation.followOptionalText,
        followDirectText: automation.followDirectText,
        isActive: automation.isActive,
      }}
      mediaOptions={media.options}
      {...(media.error ? { mediaError: media.error } : {})}
    />
  );
}

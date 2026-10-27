import "server-only";

import { and, eq, isNull, or } from "drizzle-orm";

import type { Account } from "@/lib/accounts";
import { getDb } from "@/lib/db/client";
import { automations } from "@/lib/db/schema";
import { commentMatchesKeyword, pickAutomation } from "@/lib/matching";

/** Automação ativa do post do comentário (ou de qualquer post) que casa. */
export async function findMatchingAutomation(
  account: Account,
  commentText: string,
  mediaId: string,
) {
  const db = getDb();

  const candidates = await db
    .select({
      id: automations.id,
      mediaId: automations.mediaId,
      createdAt: automations.createdAt,
      keyword: automations.keyword,
    })
    .from(automations)
    .where(
      and(
        eq(automations.accountId, account.id),
        eq(automations.isActive, true),
        or(isNull(automations.mediaId), eq(automations.mediaId, mediaId)),
      ),
    )
    .limit(200);

  const matches = candidates.filter((candidate) =>
    commentMatchesKeyword(commentText, candidate.keyword),
  );

  return pickAutomation(matches, mediaId);
}

/** Linha completa da automação (textos congelados na tarefa). */
export async function fullAutomation(automationId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(automations)
    .where(eq(automations.id, automationId))
    .limit(1);
  return row ?? null;
}

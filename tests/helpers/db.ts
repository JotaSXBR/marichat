import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";

import { closeDb, getDb } from "@/lib/db/client";
import {
  automations,
  commentInteractions,
  instagramAccounts,
  outboundMessages,
  webhookEvents,
} from "@/lib/db/schema";
import { encryptToken } from "@/lib/crypto";

/**
 * Só aceitamos rodar a suíte de integração no PostgreSQL de teste local
 * (container na porta 5433). Nunca no banco de produção.
 */
export const hasTestDatabase = (() => {
  const url = process.env.DATABASE_URL ?? "";
  return /@(127\.0\.0\.1|localhost):5433\//.test(url);
})();

export async function resetDatabase(): Promise<void> {
  const db = getDb();
  await db.execute(sql`
    TRUNCATE TABLE
      outbound_messages,
      comment_interactions,
      webhook_events,
      automations,
      instagram_accounts,
      data_deletion_requests,
      app_state
    RESTART IDENTITY CASCADE
  `);
}

export async function closeTestDatabase(): Promise<void> {
  await closeDb();
}

export async function seedAccount(overrides?: {
  instagramUserId?: string;
  username?: string;
  provider?: "meta" | "zernio";
  providerAccountId?: string | null;
}) {
  const db = getDb();
  const [account] = await db
    .insert(instagramAccounts)
    .values({
      provider: overrides?.provider ?? "meta",
      providerAccountId: overrides?.providerAccountId ?? null,
      instagramUserId: overrides?.instagramUserId ?? "17841400000000000",
      username: overrides?.username ?? "conta_teste",
      accessTokenEncrypted: encryptToken("IGQVJtoken-de-teste"),
      tokenExpiresAt: new Date(Date.now() + 30 * 86_400_000),
      connectionStatus: "connected",
    })
    .returning();
  if (!account) throw new Error("Falha ao criar conta de teste.");
  return account;
}

export async function seedAutomation(
  accountId: string,
  overrides?: Partial<typeof automations.$inferInsert>,
) {
  const db = getDb();
  const [automation] = await db
    .insert(automations)
    .values({
      accountId,
      name: "Automação de teste",
      keyword: "Quero",
      mediaId: null,
      firstDmText: "Responda esta mensagem para receber o link.",
      quickReplyTitle: "Quero o link",
      secondDmText: "Aqui está o link que você pediu",
      linkButtonTitle: "Abrir link",
      linkUrl: "https://www.exemplo.com/material",
      followMode: "off",
      isActive: true,
      ...overrides,
    })
    .returning();
  if (!automation) throw new Error("Falha ao criar automação de teste.");
  return automation;
}

export async function seedInteraction(params: {
  accountId: string;
  automationId: string;
  commentId?: string;
  commenterIgsid?: string;
  replyDeadlineAt?: Date;
  userLastMessageAt?: Date | null;
  state?: string;
}) {
  const db = getDb();
  const [interaction] = await db
    .insert(commentInteractions)
    .values({
      accountId: params.accountId,
      automationId: params.automationId,
      commentId: params.commentId ?? `comment-${randomUUID()}`,
      mediaId: "media-1",
      commenterIgsid: params.commenterIgsid ?? "user-123",
      commentText: "Quero",
      commentCreatedAt: new Date(),
      replyDeadlineAt:
        params.replyDeadlineAt ?? new Date(Date.now() + 86_400_000),
      token: randomUUID().replace(/-/g, ""),
      state: params.state ?? "queued",
      userLastMessageAt: params.userLastMessageAt ?? null,
    })
    .returning();
  if (!interaction) throw new Error("Falha ao criar interação de teste.");
  return interaction;
}

export async function seedJob(params: {
  accountId: string;
  interactionId: string;
  kind?:
    | "private_reply"
    | "followup_link"
    | "link_optional"
    | "link_direct"
    | "follow_gate"
    | "follow_check"
    | "follow_check_2";
  nextAttemptAt?: Date;
  payload?: unknown;
}) {
  const db = getDb();
  const [job] = await db
    .insert(outboundMessages)
    .values({
      accountId: params.accountId,
      interactionId: params.interactionId,
      kind: params.kind ?? "private_reply",
      status: "pending",
      nextAttemptAt: params.nextAttemptAt ?? new Date(Date.now() - 1000),
      payload: params.payload ?? {
        recipient: { comment_id: "comment-1" },
        message: { text: "Responda esta mensagem" },
      },
    })
    .returning();
  if (!job) throw new Error("Falha ao criar tarefa de teste.");
  return job;
}

export { commentInteractions, outboundMessages, webhookEvents };

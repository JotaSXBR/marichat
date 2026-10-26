import { describe, expect, it, beforeAll, beforeEach, afterAll } from "vitest";

import { getDb } from "@/lib/db/client";
import { commentInteractions, outboundMessages } from "@/lib/db/schema";
import { handleZernioEvent, type ZernioEvent } from "@/lib/webhook/zernio";
import {
  closeTestDatabase,
  hasTestDatabase,
  resetDatabase,
  seedAccount,
  seedAutomation,
} from "../helpers/db";

const suite = hasTestDatabase ? describe : describe.skip;

const ZERNIO_ACCOUNT = "zernio-account-1";

async function seedZernioAccount() {
  return seedAccount({
    provider: "zernio",
    providerAccountId: ZERNIO_ACCOUNT,
    instagramUserId: "17841400000000000",
    username: "conta_teste",
  });
}

function commentEvent(
  overrides: Partial<{
    id: string;
    commentId: string;
    text: string;
    authorId: string;
    mediaId: string;
    isReply: boolean;
    isOwnAccount: boolean;
  }> = {},
): ZernioEvent {
  const id = overrides.id ?? "evt-comment-1";
  return {
    id,
    event: "comment.received",
    timestamp: new Date().toISOString(),
    account: { accountId: ZERNIO_ACCOUNT },
    comment: {
      id: overrides.commentId ?? "comment-1",
      platformPostId: overrides.mediaId ?? "media-1",
      text: overrides.text ?? "Eu quero o material",
      createdAt: new Date().toISOString(),
      isReply: overrides.isReply ?? false,
      author: {
        id: overrides.authorId ?? "user-123",
        username: "pessoa",
        isOwnAccount: overrides.isOwnAccount ?? false,
      },
    },
  };
}

function messageEvent(
  overrides: Partial<{
    id: string;
    senderId: string;
    text: string;
    conversationId: string;
    direction: string;
    postbackPayload: string;
    standby: boolean;
  }> = {},
): ZernioEvent {
  return {
    id: overrides.id ?? "evt-message-1",
    event: "message.received",
    timestamp: new Date().toISOString(),
    account: { accountId: ZERNIO_ACCOUNT },
    message: {
      id: overrides.id ?? "evt-message-1",
      platformMessageId: overrides.id ?? "evt-message-1",
      conversationId: overrides.conversationId ?? "conv-1",
      direction: overrides.direction ?? "incoming",
      text: overrides.text ?? "Quero o link",
      sender: { id: overrides.senderId ?? "user-123" },
      sentAt: new Date().toISOString(),
    },
    metadata: {
      ...(overrides.postbackPayload
        ? { postbackPayload: overrides.postbackPayload }
        : {}),
      standby: overrides.standby ?? false,
    },
  };
}

suite("webhook da Zernio: tradução para o motor", () => {
  beforeAll(() => {
    expect(hasTestDatabase).toBe(true);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("cria a interação e a primeira DM a partir de comment.received", async () => {
    const account = await seedZernioAccount();
    await seedAutomation(account.id);

    const summary = await handleZernioEvent(commentEvent());

    expect(summary.processed).toBe(1);
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);
    expect(interaction).toBeDefined();
    expect(interaction!.commenterIgsid).toBe("user-123");
    expect(interaction!.mediaId).toBe("media-1");
    expect(interaction!.commentId).toBe("comment-1");

    const jobs = await db.select().from(outboundMessages);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.kind).toBe("private_reply");
    const payload = jobs[0]!.payload as {
      message: { text: string; quick_replies?: unknown };
    };
    expect(payload.message.text.length).toBeGreaterThan(0);
    expect(payload.message).not.toHaveProperty("quick_replies");
  });

  it("ignora o mesmo evento reenviado (X-Zernio-Event-Id)", async () => {
    const account = await seedZernioAccount();
    await seedAutomation(account.id);

    await handleZernioEvent(commentEvent({ id: "evt-repetido" }));
    const duplicated = await handleZernioEvent(commentEvent({ id: "evt-repetido" }));

    expect(duplicated.ignored).toBe(1);
    const db = getDb();
    expect(await db.select().from(commentInteractions)).toHaveLength(1);
    expect(await db.select().from(outboundMessages)).toHaveLength(1);
  });

  it("ignora comentário de resposta e comentário do próprio perfil", async () => {
    const account = await seedZernioAccount();
    await seedAutomation(account.id);

    await handleZernioEvent(
      commentEvent({ id: "evt-1", commentId: "c1", isReply: true }),
    );
    await handleZernioEvent(
      commentEvent({ id: "evt-2", commentId: "c2", isOwnAccount: true }),
    );

    const db = getDb();
    expect(await db.select().from(commentInteractions)).toHaveLength(0);
  });

  it("guarda a conversa e agenda o link quando a pessoa responde", async () => {
    const account = await seedZernioAccount();
    await seedAutomation(account.id);

    await handleZernioEvent(commentEvent());
    const summary = await handleZernioEvent(
      messageEvent({ id: "evt-msg-1", conversationId: "conv-42" }),
    );
    expect(summary.processed).toBe(1);

    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);
    expect(interaction!.providerConversationId).toBe("conv-42");

    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(1);
  });

  it("toque em 'Já segui' chega como message.received com postbackPayload", async () => {
    const account = await seedZernioAccount();
    await seedAutomation(account.id, { followMode: "soft" });

    await handleZernioEvent(commentEvent());
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);

    const summary = await handleZernioEvent(
      messageEvent({
        id: "evt-tap",
        postbackPayload: `gate:${interaction!.token}`,
      }),
    );
    expect(summary.processed).toBe(1);

    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "follow_check_2")).toHaveLength(1);
  });

  it("ignora eco da própria mensagem e conversa dominada por outro app", async () => {
    const account = await seedZernioAccount();
    await seedAutomation(account.id);

    await handleZernioEvent(commentEvent());
    const outgoing = await handleZernioEvent(
      messageEvent({ id: "evt-out", direction: "outgoing" }),
    );
    const standby = await handleZernioEvent(
      messageEvent({ id: "evt-standby", standby: true }),
    );

    expect(outgoing.ignored).toBe(1);
    expect(standby.ignored).toBe(1);
    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(0);
  });

  it("ignora evento de conta desconhecida sem quebrar a resposta", async () => {
    const summary = await handleZernioEvent({
      ...commentEvent(),
      account: { accountId: "outra-conta" },
    });

    expect(summary.ignored).toBe(1);
    const db = getDb();
    expect(await db.select().from(commentInteractions)).toHaveLength(0);
  });

  it("ignora evento de teste da Zernio", async () => {
    const summary = await handleZernioEvent({ ...commentEvent(), test: true });
    expect(summary).toEqual({ received: 0, processed: 0, ignored: 0, failed: 0 });
  });
});

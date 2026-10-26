import { describe, expect, it, beforeAll, beforeEach, afterAll } from "vitest";

import { getDb } from "@/lib/db/client";
import { commentInteractions, outboundMessages } from "@/lib/db/schema";
import { handleWebhookPayload } from "@/lib/webhook/process";
import {
  closeTestDatabase,
  hasTestDatabase,
  resetDatabase,
  seedAccount,
  seedAutomation,
} from "../helpers/db";

const suite = hasTestDatabase ? describe : describe.skip;

function commentPayload(params: {
  igUserId: string;
  commentId: string;
  text: string;
  mediaId?: string;
  commenterId?: string;
  time?: number;
  parentId?: string;
}) {
  return {
    object: "instagram",
    entry: [
      {
        id: params.igUserId,
        time: params.time ?? Math.floor(Date.now() / 1000),
        changes: [
          {
            field: "comments",
            value: {
              id: params.commentId,
              text: params.text,
              from: { id: params.commenterId ?? "user-123", username: "pessoa" },
              media: { id: params.mediaId ?? "media-1", media_product_type: "FEED" },
              ...(params.parentId ? { parent_id: params.parentId } : {}),
            },
          },
        ],
      },
    ],
  };
}

function quickReplyPayload(params: {
  igUserId: string;
  mid: string;
  payload: string;
  senderId?: string;
  timestamp?: number;
}) {
  return {
    object: "instagram",
    entry: [
      {
        id: params.igUserId,
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: "messages",
            value: {
              sender: { id: params.senderId ?? "user-123" },
              recipient: { id: params.igUserId },
              timestamp: params.timestamp ?? Math.floor(Date.now() / 1000),
              message: {
                mid: params.mid,
                text: "Quero o link",
                quick_reply: { payload: params.payload },
              },
            },
          },
        ],
      },
    ],
  };
}

suite("webhook: comentário e toque no botão", () => {
  beforeAll(() => {
    expect(hasTestDatabase).toBe(true);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("cria interação e primeira DM com quick reply ao casar a palavra-chave", async () => {
    const account = await seedAccount();
    const automation = await seedAutomation(account.id);
    const time = Math.floor(Date.now() / 1000) - 60;

    const summary = await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "Eu QUERO o material!",
        time,
      }),
    );

    expect(summary.processed).toBe(1);

    const db = getDb();
    const interactions = await db.select().from(commentInteractions);
    expect(interactions).toHaveLength(1);

    const interaction = interactions[0]!;
    expect(interaction.automationId).toBe(automation.id);
    expect(interaction.state).toBe("queued");
    expect(interaction.commenterIgsid).toBe("user-123");
    expect(interaction.commentCreatedAt.getTime()).toBe(time * 1000);
    // Prazo: 7 dias menos 2 minutos de margem.
    expect(interaction.replyDeadlineAt.getTime()).toBe(
      time * 1000 + 7 * 86_400_000 - 2 * 60_000,
    );

    const jobs = await db.select().from(outboundMessages);
    expect(jobs).toHaveLength(1);
    const job = jobs[0]!;
    expect(job.kind).toBe("private_reply");
    expect(job.status).toBe("pending");

    const payload = job.payload as {
      recipient: { comment_id: string };
      message: { text: string; quick_replies: Array<{ payload: string }> };
    };
    expect(payload.recipient.comment_id).toBe("comment-1");
    expect(payload.message.text).toContain("botão");
    expect(payload.message.quick_replies[0]!.payload).toBe(interaction.token);
  });

  it("ignora evento repetido (dedupe) e comentários sem correspondência", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id);

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const duplicated = await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    expect(duplicated.ignored).toBe(1);

    const noMatch = await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-2",
        text: "que legal",
      }),
    );
    expect(noMatch.ignored).toBe(1);

    const db = getDb();
    expect(await db.select().from(commentInteractions)).toHaveLength(1);
    expect(await db.select().from(outboundMessages)).toHaveLength(1);
  });

  it("ignora respostas a outros comentários e comentários do próprio perfil", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id);

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
        parentId: "comment-0",
      }),
    );
    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-2",
        text: "quero",
        commenterId: account.instagramUserId,
      }),
    );

    const db = getDb();
    expect(await db.select().from(commentInteractions)).toHaveLength(0);
  });

  it("prefere a automação da publicação específica", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { mediaId: null, name: "qualquer" });
    const specific = await seedAutomation(account.id, {
      mediaId: "media-9",
      name: "publicação específica",
    });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
        mediaId: "media-9",
      }),
    );

    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);
    expect(interaction?.automationId).toBe(specific.id);
  });

  it("agenda a segunda mensagem somente após o toque no botão", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id);

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );

    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);
    expect(interaction).toBeDefined();

    const summary = await handleWebhookPayload(
      quickReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-1",
        payload: interaction!.token,
      }),
    );
    expect(summary.processed).toBe(1);

    const jobs = await db.select().from(outboundMessages);
    const followup = jobs.find((job) => job.kind === "followup_link");
    expect(followup).toBeDefined();
    expect(followup!.status).toBe("pending");

    const payload = followup!.payload as {
      recipient: { id: string };
      message: {
        attachment: {
          type: string;
          payload: {
            template_type: string;
            elements: Array<{
              title: string;
              buttons: Array<{ type: string; url: string; title: string }>;
            }>;
          };
        };
      };
    };
    expect(payload.recipient.id).toBe("user-123");
    expect(payload.message.attachment.type).toBe("template");
    expect(payload.message.attachment.payload.template_type).toBe("generic");
    const button = payload.message.attachment.payload.elements[0]!.buttons[0]!;
    expect(button.type).toBe("web_url");
    expect(button.url).toBe("https://www.exemplo.com/material");
    expect(button.title).toBe("Abrir link");

    const [updated] = await db.select().from(commentInteractions);
    expect(updated!.userLastMessageAt).not.toBeNull();

    // O mesmo toque reenviado não cria segunda tarefa.
    await handleWebhookPayload(
      quickReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-1",
        payload: interaction!.token,
      }),
    );
    const afterDuplicate = await db.select().from(outboundMessages);
    expect(afterDuplicate.filter((job) => job.kind === "followup_link")).toHaveLength(
      1,
    );
  });

  it("não agenda link quando a janela de 24h já fechou", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id);

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);

    const oldTimestamp = Math.floor((Date.now() - 25 * 3600 * 1000) / 1000);
    await handleWebhookPayload(
      quickReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-old",
        payload: interaction!.token,
        timestamp: oldTimestamp,
      }),
    );

    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(0);
  });

  it("aceita o formato entry.messaging (estilo Messenger)", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id);

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);

    const summary = await handleWebhookPayload({
      object: "instagram",
      entry: [
        {
          id: account.instagramUserId,
          time: Math.floor(Date.now() / 1000),
          messaging: [
            {
              sender: { id: "user-123" },
              recipient: { id: account.instagramUserId },
              timestamp: Math.floor(Date.now() / 1000),
              message: {
                mid: "mid-messaging",
                text: "Quero o link",
                quick_reply: { payload: interaction!.token },
              },
            },
          ],
        },
      ],
    });

    expect(summary.processed).toBe(1);
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(1);
  });
});

import { describe, expect, it, beforeAll, beforeEach, afterAll } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { commentInteractions, outboundMessages } from "@/lib/db/schema";
import { handleWebhookPayload } from "@/lib/webhook/process";
import {
  closeTestDatabase,
  hasTestDatabase,
  resetDatabase,
  seedAccount,
  seedAutomation,
  seedInteraction,
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
              from: {
                id: params.commenterId ?? "user-123",
                username: "pessoa",
              },
              media: {
                id: params.mediaId ?? "media-1",
                media_product_type: "FEED",
              },
              ...(params.parentId ? { parent_id: params.parentId } : {}),
            },
          },
        ],
      },
    ],
  };
}

/** Mensagem livre: é assim que a pessoa abre a janela de 24h. */
function textReplyPayload(params: {
  igUserId: string;
  mid: string;
  senderId?: string;
  timestamp?: number;
  text?: string;
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
                text: params.text ?? "Quero o link",
              },
            },
          },
        ],
      },
    ],
  };
}

/** Toque no botão "Já segui" (postback com token da interação). */
function gateTapPayload(params: {
  igUserId: string;
  mid: string;
  payload: string;
  senderId?: string;
  field?: string;
}) {
  return {
    object: "instagram",
    entry: [
      {
        id: params.igUserId,
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: params.field ?? "messages",
            value: {
              sender: { id: params.senderId ?? "user-123" },
              recipient: { id: params.igUserId },
              timestamp: Math.floor(Date.now() / 1000),
              postback: {
                mid: params.mid,
                title: "Já segui",
                payload: params.payload,
              },
            },
          },
        ],
      },
    ],
  };
}

suite("webhook: comentário, resposta e porta de seguidor", () => {
  beforeAll(() => {
    expect(hasTestDatabase).toBe(true);
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("cria interação e primeira DM em texto puro ao casar a palavra-chave", async () => {
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
    expect(interaction.commenterUsername).toBe("pessoa");
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
      message: { text: string; quick_replies?: unknown };
    };
    expect(payload.recipient.comment_id).toBe("comment-1");
    expect(payload.message.text).toContain("Responda");
    // A primeira DM não tem botão: a pessoa responde para abrir a janela.
    expect(payload.message).not.toHaveProperty("quick_replies");
  });

  it("responde publicamente no comentário antes de agendar a DM", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, {
      publicReplies: "Te enviei no direct!\nOlha sua DM!\nMandei no direct 😉",
    });

    const summary = await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-public",
        text: "QUERO",
      }),
    );

    expect(summary.processed).toBe(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs).toHaveLength(2);
    const publicJob = jobs.find((job) => job.kind === "public_reply")!;
    expect(publicJob.status).toBe("pending");
    const payload = publicJob.payload as { message: string };
    expect([
      "Te enviei no direct!",
      "Olha sua DM!",
      "Mandei no direct 😉",
    ]).toContain(payload.message);
    expect(jobs.some((job) => job.kind === "private_reply")).toBe(true);
  });

  it("sem respostas públicas configuradas, envia só a DM", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id);

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-sem-publica",
        text: "QUERO",
      }),
    );

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.map((job) => job.kind)).toEqual(["private_reply"]);
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

  it("ignora a automação de outra publicação", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, {
      mediaId: "media-9",
      name: "publicação específica",
    });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
        mediaId: "media-8",
      }),
    );

    const db = getDb();
    expect(await db.select().from(commentInteractions)).toHaveLength(0);
  });

  it("agenda o link quando a pessoa responde (porta de seguidor desligada)", async () => {
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
      textReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-1",
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

    // O mesmo evento reenviado não cria segunda tarefa.
    await handleWebhookPayload(
      textReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-1",
      }),
    );
    const afterDuplicate = await db.select().from(outboundMessages);
    expect(
      afterDuplicate.filter((job) => job.kind === "followup_link"),
    ).toHaveLength(1);
  });

  it("com a porta ligada, a resposta agenda só a checagem (sem link)", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { followMode: "soft" });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const summary = await handleWebhookPayload(
      textReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-1",
      }),
    );
    expect(summary.processed).toBe(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "follow_check")).toHaveLength(1);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(0);
  });

  it("modo opcional envia seguir + link sem consultar o perfil", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { followMode: "optional" });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const summary = await handleWebhookPayload(
      textReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-1",
      }),
    );
    expect(summary.processed).toBe(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    const optional = jobs.find((job) => job.kind === "link_optional");
    expect(optional).toBeDefined();
    expect(jobs.filter((job) => job.kind === "follow_check")).toHaveLength(0);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(0);

    const payload = optional!.payload as {
      message: {
        attachment: {
          payload: { buttons: Array<{ type: string; url: string }> };
        };
      };
    };
    const buttons = payload.message.attachment.payload.buttons;
    expect(buttons).toHaveLength(2);
    expect(buttons[0]!.url).toBe("https://www.instagram.com/conta_teste/");
    expect(buttons[1]!.url).toBe("https://www.exemplo.com/material");
  });

  it("modo direto envia o link com o aviso, sem consultar o perfil", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { followMode: "direct" });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const summary = await handleWebhookPayload(
      textReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-1",
      }),
    );
    expect(summary.processed).toBe(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    const direct = jobs.find((job) => job.kind === "link_direct");
    expect(direct).toBeDefined();
    expect(jobs.filter((job) => job.kind === "follow_check")).toHaveLength(0);

    const payload = direct!.payload as {
      message: {
        attachment: {
          payload: {
            text: string;
            buttons: Array<{ type: string; url: string }>;
          };
        };
      };
    };
    expect(payload.message.attachment.payload.text).toContain(
      "caixa principal",
    );
    expect(payload.message.attachment.payload.buttons).toHaveLength(1);
    expect(payload.message.attachment.payload.buttons[0]!.url).toBe(
      "https://www.exemplo.com/material",
    );
  });

  it("modo travado não libera o link quando o limite de checagens acaba", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { followMode: "locked" });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);
    await db
      .update(commentInteractions)
      .set({ followChecks: 6 })
      .where(eq(commentInteractions.id, interaction!.id));

    const summary = await handleWebhookPayload(
      gateTapPayload({
        igUserId: account.instagramUserId,
        mid: "mid-tap",
        payload: `gate:${interaction!.token}`,
      }),
    );
    expect(summary.ignored).toBe(1);

    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(0);
    expect(jobs.filter((job) => job.kind === "follow_check_2")).toHaveLength(0);
  });

  it("o toque em 'Já segui' agenda uma nova checagem", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { followMode: "soft" });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);

    const summary = await handleWebhookPayload(
      gateTapPayload({
        igUserId: account.instagramUserId,
        mid: "mid-tap",
        payload: `gate:${interaction!.token}`,
      }),
    );
    expect(summary.processed).toBe(1);

    const jobs = await db.select().from(outboundMessages);
    const check = jobs.find((job) => job.kind === "follow_check_2");
    expect(check).toBeDefined();
    // A checagem é adiada para a Meta refletir o follow recém-feito.
    expect(check!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 15_000);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(0);
  });

  it("libera o link no toque quando o limite de checagens acabou", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { followMode: "soft" });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);
    await db
      .update(commentInteractions)
      .set({ followChecks: 2 })
      .where(eq(commentInteractions.id, interaction!.id));

    const summary = await handleWebhookPayload(
      gateTapPayload({
        igUserId: account.instagramUserId,
        mid: "mid-tap",
        payload: `gate:${interaction!.token}`,
      }),
    );
    expect(summary.processed).toBe(1);

    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(1);
  });

  it("aceita postback no campo messaging_postbacks", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { followMode: "soft" });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);

    const summary = await handleWebhookPayload(
      gateTapPayload({
        igUserId: account.instagramUserId,
        mid: "mid-postback-field",
        payload: `gate:${interaction!.token}`,
        field: "messaging_postbacks",
      }),
    );
    expect(summary.processed).toBe(1);

    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "follow_check_2")).toHaveLength(1);
  });

  it("ignora postback de token que não pertence a quem enviou", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id, { followMode: "soft" });

    await handleWebhookPayload(
      commentPayload({
        igUserId: account.instagramUserId,
        commentId: "comment-1",
        text: "quero",
      }),
    );
    const db = getDb();
    const [interaction] = await db.select().from(commentInteractions);

    const summary = await handleWebhookPayload(
      gateTapPayload({
        igUserId: account.instagramUserId,
        mid: "mid-tap",
        payload: `gate:${interaction!.token}`,
        senderId: "outra-pessoa",
      }),
    );
    expect(summary.processed).toBe(0);

    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "follow_check_2")).toHaveLength(0);
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

    const oldTimestamp = Math.floor((Date.now() - 26 * 3600 * 1000) / 1000);
    await handleWebhookPayload(
      textReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-old",
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
              },
            },
          ],
        },
      ],
    });

    expect(summary.processed).toBe(1);
    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(1);
  });

  it("responde a interacao aberta mesmo com outra ja encerrada", async () => {
    const account = await seedAccount();
    const automation = await seedAutomation(account.id);
    const db = getDb();

    const open = await seedInteraction({
      accountId: account.id,
      automationId: automation.id,
      commentId: "comment-open",
      state: "accepted",
      userLastMessageAt: new Date(),
    });
    const closed = await seedInteraction({
      accountId: account.id,
      automationId: automation.id,
      commentId: "comment-closed",
      state: "link_sent",
      userLastMessageAt: new Date(),
    });
    // A encerrada e a mais recente: antes ela "roubava" a resposta.
    await db
      .update(commentInteractions)
      .set({ createdAt: new Date(Date.now() + 1000) })
      .where(eq(commentInteractions.id, closed.id));

    const summary = await handleWebhookPayload(
      textReplyPayload({
        igUserId: account.instagramUserId,
        mid: "mid-open",
      }),
    );
    expect(summary.processed).toBe(1);

    const jobs = await db.select().from(outboundMessages);
    const followup = jobs.find((job) => job.kind === "followup_link");
    expect(followup?.interactionId).toBe(open.id);
  });
});

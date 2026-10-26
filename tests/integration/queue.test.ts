import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  commentInteractions,
  instagramAccounts,
  outboundMessages,
} from "@/lib/db/schema";
import {
  drainQueue,
  expireOverdueJobs,
  recoverStuckJobs,
} from "@/lib/queue/drain";
import {
  closeTestDatabase,
  hasTestDatabase,
  resetDatabase,
  seedAccount,
  seedAutomation,
  seedInteraction,
  seedJob,
} from "../helpers/db";

const suite = hasTestDatabase ? describe : describe.skip;

function okResponse(messageId: string) {
  return new Response(JSON.stringify({ message_id: messageId }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function errorResponse(status: number, code: number, message = "erro") {
  return new Response(
    JSON.stringify({ error: { message, code, type: "OAuthException" } }),
    { status, headers: { "content-type": "application/json" } },
  );
}

suite("fila: envio, retentativas, prazos e concorrência", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  async function setup(kind: "private_reply" | "followup_link" = "private_reply") {
    const account = await seedAccount();
    const automation = await seedAutomation(account.id);
    const interaction = await seedInteraction({
      accountId: account.id,
      automationId: automation.id,
      ...(kind === "followup_link"
        ? { userLastMessageAt: new Date(), state: "accepted" }
        : {}),
    });
    const job = await seedJob({
      accountId: account.id,
      interactionId: interaction.id,
      kind,
    });
    return { account, automation, interaction, job };
  }

  it("marca como aceita (não entregue) e avança a interação", async () => {
    const { interaction } = await setup();
    const fetchMock = vi.fn(async () => okResponse("mid-123"));
    vi.stubGlobal("fetch", fetchMock);

    const summary = await drainQueue(5);

    expect(summary.accepted).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const db = getDb();
    const [job] = await db.select().from(outboundMessages);
    expect(job!.status).toBe("accepted");
    expect(job!.externalMessageId).toBe("mid-123");
    expect(job!.acceptedAt).not.toBeNull();

    const [updated] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
    expect(updated!.state).toBe("accepted");
    expect(updated!.firstDmMessageId).toBe("mid-123");
  });

  it("reenvia com espera progressiva em erro temporário", async () => {
    const { interaction } = await setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(500, 2, "instabilidade")),
    );

    const before = Date.now();
    const summary = await drainQueue(5);
    expect(summary.requeued).toBe(1);

    const db = getDb();
    const [job] = await db.select().from(outboundMessages);
    expect(job!.status).toBe("pending");
    expect(job!.attempts).toBe(1);
    expect(job!.errorCode).toBe("2");
    expect(job!.nextAttemptAt.getTime()).toBeGreaterThan(before + 30_000);

    const [row] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
    expect(row!.state).toBe("queued");
  });

  it("desiste depois do máximo de tentativas", async () => {
    const { interaction } = await setup();
    const db = getDb();
    await db
      .update(outboundMessages)
      .set({ attempts: 3 })
      .where(eq(outboundMessages.interactionId, interaction.id));

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(503, 2, "indisponível")),
    );

    const summary = await drainQueue(5);
    expect(summary.failed).toBe(1);

    const [job] = await db.select().from(outboundMessages);
    expect(job!.status).toBe("failed");
    expect(job!.errorMessage).toContain("Tentativas esgotadas");

    const [row] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
    expect(row!.state).toBe("failed");
  });

  it("marca como incerta quando não sabe se a Meta recebeu", async () => {
    await setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    const summary = await drainQueue(5);
    expect(summary.uncertain).toBe(1);

    const db = getDb();
    const [job] = await db.select().from(outboundMessages);
    expect(job!.status).toBe("uncertain");
    expect(job!.errorCode).toBe("UNCERTAIN");
  });

  it("expira a resposta privada quando o prazo de 7 dias passou", async () => {
    const account = await seedAccount();
    const automation = await seedAutomation(account.id);
    const interaction = await seedInteraction({
      accountId: account.id,
      automationId: automation.id,
      replyDeadlineAt: new Date(Date.now() - 60_000),
    });
    await seedJob({ accountId: account.id, interactionId: interaction.id });

    const expired = await expireOverdueJobs();
    expect(expired).toBeGreaterThanOrEqual(1);

    const db = getDb();
    const [job] = await db.select().from(outboundMessages);
    expect(job!.status).toBe("expired");
    const [row] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
    expect(row!.state).toBe("expired");

    // O drenador não deve tentar enviar o que já expirou.
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await drainQueue(5);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("expira o link quando a janela de 24h fechou", async () => {
    const account = await seedAccount();
    const automation = await seedAutomation(account.id);
    const interaction = await seedInteraction({
      accountId: account.id,
      automationId: automation.id,
      state: "accepted",
      userLastMessageAt: new Date(Date.now() - 25 * 3600 * 1000),
    });
    await seedJob({
      accountId: account.id,
      interactionId: interaction.id,
      kind: "followup_link",
    });

    await expireOverdueJobs();

    const db = getDb();
    const [job] = await db.select().from(outboundMessages);
    expect(job!.status).toBe("expired");
  });

  it("não permite que dois drenadores enviem a mesma tarefa", async () => {
    const account = await seedAccount();
    const automation = await seedAutomation(account.id);
    for (const n of [1, 2]) {
      const interaction = await seedInteraction({
        accountId: account.id,
        automationId: automation.id,
        commentId: `comment-${n}`,
        commenterIgsid: `user-${n}`,
      });
      await seedJob({ accountId: account.id, interactionId: interaction.id });
    }

    let messageCounter = 0;
    const fetchMock = vi.fn(async () => {
      messageCounter += 1;
      return okResponse(`mid-${messageCounter}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([drainQueue(5), drainQueue(5)]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.accepted + second.accepted).toBe(2);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.every((job) => job.status === "accepted")).toBe(true);
    expect(new Set(jobs.map((job) => job.externalMessageId)).size).toBe(2);
  });

  it("recupera tarefa travada como incerta, sem reenviar", async () => {
    const { interaction, account } = await setup();
    const db = getDb();
    await db
      .update(outboundMessages)
      .set({
        status: "processing",
        lockedAt: new Date(Date.now() - 20 * 60_000),
        lockToken: "token-antigo",
      })
      .where(eq(outboundMessages.interactionId, interaction.id));
    await db
      .update(commentInteractions)
      .set({ state: "queued" })
      .where(eq(commentInteractions.id, interaction.id));

    const recovered = await recoverStuckJobs();
    expect(recovered).toBeGreaterThanOrEqual(1);

    const [job] = await db
      .select()
      .from(outboundMessages)
      .where(eq(outboundMessages.accountId, account.id));
    expect(job!.status).toBe("uncertain");
    expect(job!.lockedAt).toBeNull();

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await drainQueue(5);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marca a conta para reconectar quando o token é recusado", async () => {
    const { account } = await setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(401, 190, "token inválido")),
    );

    const summary = await drainQueue(5);
    expect(summary.failed).toBe(1);

    const db = getDb();
    const [job] = await db.select().from(outboundMessages);
    expect(job!.status).toBe("failed");

    const [row] = await db
      .select()
      .from(instagramAccounts)
      .where(eq(instagramAccounts.id, account.id));
    expect(row!.connectionStatus).toBe("reconnect_required");
  });
});

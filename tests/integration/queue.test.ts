import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { eq, sql } from "drizzle-orm";

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

function profileResponse(following: boolean) {
  return new Response(
    JSON.stringify({
      id: "user-123",
      username: "pessoa",
      is_user_follow_business: following,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
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

  async function setup(
    kind:
      | "private_reply"
      | "followup_link"
      | "link_optional"
      | "link_direct"
      | "follow_gate"
      | "follow_check"
      | "follow_check_2" = "private_reply",
    followMode: "off" | "soft" | "locked" | "optional" | "direct" = kind ===
      "follow_check" || kind === "follow_check_2"
      ? "soft"
      : "off",
  ) {
    const account = await seedAccount();
    const automation = await seedAutomation(account.id, { followMode });
    const interaction = await seedInteraction({
      accountId: account.id,
      automationId: automation.id,
      ...(kind === "private_reply"
        ? {}
        : { userLastMessageAt: new Date(), state: "accepted" }),
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

  it("checagem de seguidor: não segue → envia a porta e retém o link", async () => {
    const { interaction } = await setup("follow_check");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("is_user_follow_business")) {
        return profileResponse(false);
      }
      return okResponse("mid-gate");
    });
    vi.stubGlobal("fetch", fetchMock);

    const summary = await drainQueue(1);
    expect(summary.accepted).toBe(1);
    // A checagem não envia mensagem: só consulta o perfil.
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    const check = jobs.find((job) => job.kind === "follow_check");
    expect(check!.status).toBe("accepted");
    expect(check!.externalMessageId).toBeNull();

    const gate = jobs.find((job) => job.kind === "follow_gate");
    expect(gate).toBeDefined();
    expect(gate!.status).toBe("pending");

    const [row] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
    expect(row!.state).toBe("gate_pending");
    expect(row!.followChecks).toBe(1);
  });

  it("checagem de seguidor: segue → libera o link sem enviar a porta", async () => {
    const { interaction } = await setup("follow_check");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).includes("is_user_follow_business")) {
        return profileResponse(true);
      }
      return okResponse("mid-link");
    });
    vi.stubGlobal("fetch", fetchMock);

    const summary = await drainQueue(1);
    expect(summary.accepted).toBe(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "follow_gate")).toHaveLength(0);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(1);

    const [row] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
    expect(row!.state).toBe("accepted");
    expect(row!.followChecks).toBe(1);
  });

  it("checagem de seguidor: resposta desconhecida libera o link", async () => {
    await setup("follow_check");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(400, 100, "campo indisponível")),
    );

    const summary = await drainQueue(1);
    expect(summary.accepted).toBe(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(1);

    const [row] = await db.select().from(commentInteractions);
    expect(row!.state).toBe("accepted");
  });

  it("checagem de seguidor: na segunda tentativa libera mesmo sem seguir", async () => {
    const { interaction } = await setup("follow_check_2");
    const db = getDb();
    await db
      .update(commentInteractions)
      .set({ state: "gate_pending", followChecks: 1 })
      .where(eq(commentInteractions.id, interaction.id));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("is_user_follow_business")) {
          return profileResponse(false);
        }
        return okResponse("mid-link");
      }),
    );

    await drainQueue(1);

    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "follow_gate")).toHaveLength(0);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(1);

    const [row] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
    expect(row!.state).toBe("accepted");
    expect(row!.followChecks).toBe(2);
  });

  it("modo travado: não segue → mantém a porta e não libera o link", async () => {
    const { interaction } = await setup("follow_check", "locked");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("is_user_follow_business")) {
          return profileResponse(false);
        }
        return okResponse("mid-gate");
      }),
    );

    const summary = await drainQueue(1);
    expect(summary.accepted).toBe(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(0);
    expect(jobs.filter((job) => job.kind === "follow_gate")).toHaveLength(1);

    const [row] = await db
      .select()
      .from(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
    expect(row!.state).toBe("gate_pending");
  });

  it("modo travado: status desconhecido também mantém a porta", async () => {
    await setup("follow_check", "locked");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => errorResponse(400, 100, "campo indisponível")),
    );

    await drainQueue(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(0);
    expect(jobs.filter((job) => job.kind === "follow_gate")).toHaveLength(1);
  });

  it("modo travado: segue → libera o link", async () => {
    await setup("follow_check", "locked");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("is_user_follow_business")) {
          return profileResponse(true);
        }
        return okResponse("mid-link");
      }),
    );

    await drainQueue(1);

    const db = getDb();
    const jobs = await db.select().from(outboundMessages);
    expect(jobs.filter((job) => job.kind === "followup_link")).toHaveLength(1);
    expect(jobs.filter((job) => job.kind === "follow_gate")).toHaveLength(0);
  });

  it("modo travado: nova checagem reenvia a porta", async () => {
    const { interaction } = await setup("follow_check_2", "locked");
    const db = getDb();
    await db
      .update(commentInteractions)
      .set({ state: "gate_pending", followChecks: 2 })
      .where(eq(commentInteractions.id, interaction.id));
    // A porta já foi enviada uma vez; o reenvio precisa voltar para a fila.
    await seedJob({
      accountId: interaction.accountId,
      interactionId: interaction.id,
      kind: "follow_gate",
      payload: { old: true },
      nextAttemptAt: new Date(Date.now() + 3_600_000),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input).includes("is_user_follow_business")) {
          return profileResponse(false);
        }
        return okResponse("mid-gate");
      }),
    );

    await drainQueue(1);

    const rows = await db.select().from(outboundMessages);
    const gateJob = rows.find((job) => job.kind === "follow_gate");
    expect(gateJob!.status).toBe("pending");
    expect(gateJob!.payload).not.toEqual({ old: true });
  });

  it("segura a resposta privada quando o limite de 750 por hora é atingido", async () => {
    const { account, automation, job } = await setup();
    const db = getDb();

    // Uma única instrução cria as 750 respostas privadas já aceitas na última
    // hora, sem depender de 750 chamadas à API.
    await db.execute(sql`
      INSERT INTO comment_interactions (
        account_id, automation_id, comment_id, media_id, commenter_igsid,
        comment_created_at, reply_deadline_at, token, state
      )
      SELECT
        ${account.id}::uuid, ${automation.id}::uuid, 'rate-' || g, 'm',
        'u-' || g, now(), now() + interval '1 day', 'rate-token-' || g,
        'accepted'
      FROM generate_series(1, 750) AS g
    `);
    await db.execute(sql`
      INSERT INTO outbound_messages (
        account_id, interaction_id, kind, status, attempts, payload, accepted_at
      )
      SELECT ${account.id}::uuid, id, 'private_reply', 'accepted', 1,
        '{}'::jsonb, now()
      FROM comment_interactions
      WHERE comment_id LIKE 'rate-%'
    `);

    const fetchMock = vi.fn(async () => okResponse("mid-123"));
    vi.stubGlobal("fetch", fetchMock);

    const startedAt = Date.now();
    const summary = await drainQueue(1);

    expect(summary.requeued).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();

    const [held] = await db
      .select()
      .from(outboundMessages)
      .where(eq(outboundMessages.id, job.id));
    expect(held!.status).toBe("pending");
    expect(held!.errorCode).toBe("RATE_LIMITED");
    // A tentativa não consome o orçamento de envios.
    expect(held!.attempts).toBe(0);
    expect(held!.nextAttemptAt.getTime()).toBeGreaterThan(
      startedAt + 59 * 60_000,
    );
  });
});

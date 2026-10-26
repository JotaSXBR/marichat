import { createHmac } from "node:crypto";

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/lib/db/client";
import {
  commentInteractions,
  dataDeletionRequests,
  outboundMessages,
} from "@/lib/db/schema";
import { computeHubSignature256 } from "@/lib/signature";
import {
  closeTestDatabase,
  hasTestDatabase,
  resetDatabase,
  seedAccount,
  seedAutomation,
  seedInteraction,
} from "../helpers/db";

// Simula o cabeçalho visto pelas rotas que usam `headers()` do Next.
const authState = vi.hoisted(() => ({ authorization: "" }));

vi.mock("next/headers", () => ({
  headers: async () => {
    const headers = new Headers();
    if (authState.authorization) {
      headers.set("authorization", authState.authorization);
    }
    return headers;
  },
}));

import { GET as webhookGet, POST as webhookPost } from "@/app/api/webhook/route";
import { POST as zernioWebhookPost } from "@/app/api/webhook/zernio/route";
import { GET as cronGet } from "@/app/api/cron/tick/route";
import { POST as dataDeletionPost } from "@/app/api/data-deletion/route";
import { GET as oauthStartGet } from "@/app/api/auth/instagram/start/route";

const suite = hasTestDatabase ? describe : describe.skip;

const APP_SECRET = process.env.INSTAGRAM_APP_SECRET ?? "test-app-secret";
const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN ?? "test-verify-token";
const CRON_SECRET = process.env.CRON_SECRET ?? "test-cron-secret";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "test-admin-password";
const ZERNIO_SECRET =
  process.env.ZERNIO_WEBHOOK_SECRET ?? "test-zernio-webhook-secret";

function basic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

suite("rotas HTTP", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeTestDatabase();
  });

  it("valida a verificação GET do webhook", async () => {
    const ok = webhookGet(
      new Request(
        `http://localhost/api/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=desafio-123`,
      ),
    );
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe("desafio-123");

    const wrong = webhookGet(
      new Request(
        "http://localhost/api/webhook?hub.mode=subscribe&hub.verify_token=errado&hub.challenge=x",
      ),
    );
    expect(wrong.status).toBe(403);
  });

  it("recusa POST sem assinatura válida", async () => {
    const body = JSON.stringify({ object: "instagram", entry: [] });

    const missing = await webhookPost(
      new Request("http://localhost/api/webhook", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      }),
    );
    expect(missing.status).toBe(401);

    const forged = await webhookPost(
      new Request("http://localhost/api/webhook", {
        method: "POST",
        body,
        headers: {
          "content-type": "application/json",
          "x-hub-signature-256": "sha256=0000",
        },
      }),
    );
    expect(forged.status).toBe(401);
  });

  it("aceita POST assinado e cria a interação", async () => {
    const account = await seedAccount();
    await seedAutomation(account.id);

    const body = JSON.stringify({
      object: "instagram",
      entry: [
        {
          id: account.instagramUserId,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "comments",
              value: {
                id: "comment-rota",
                text: "quero",
                from: { id: "user-rota" },
                media: { id: "media-1" },
              },
            },
          ],
        },
      ],
    });

    const response = await webhookPost(
      new Request("http://localhost/api/webhook", {
        method: "POST",
        body,
        headers: {
          "content-type": "application/json",
          "x-hub-signature-256": computeHubSignature256(body, APP_SECRET),
        },
      }),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok: boolean; processed: number };
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(1);

    const db = getDb();
    expect(await db.select().from(commentInteractions)).toHaveLength(1);
  });

  it("recusa o webhook da Zernio sem assinatura válida", async () => {
    const body = JSON.stringify({ event: "comment.received" });

    const missing = await zernioWebhookPost(
      new Request("http://localhost/api/webhook/zernio", {
        method: "POST",
        body,
        headers: { "content-type": "application/json" },
      }),
    );
    expect(missing.status).toBe(401);

    const forged = await zernioWebhookPost(
      new Request("http://localhost/api/webhook/zernio", {
        method: "POST",
        body,
        headers: {
          "content-type": "application/json",
          "x-zernio-signature": "00",
        },
      }),
    );
    expect(forged.status).toBe(401);
  });

  it("aceita o webhook assinado da Zernio e cria a interação", async () => {
    const account = await seedAccount({
      provider: "zernio",
      providerAccountId: "zernio-rota",
      instagramUserId: "17841400000000001",
    });
    await seedAutomation(account.id);

    const body = JSON.stringify({
      id: "evt-rota-1",
      event: "comment.received",
      timestamp: new Date().toISOString(),
      account: { accountId: "zernio-rota" },
      comment: {
        id: "comment-zernio",
        platformPostId: "media-zernio",
        text: "quero",
        createdAt: new Date().toISOString(),
        isReply: false,
        author: { id: "user-zernio", username: "pessoa" },
      },
    });

    const response = await zernioWebhookPost(
      new Request("http://localhost/api/webhook/zernio", {
        method: "POST",
        body,
        headers: {
          "content-type": "application/json",
          "x-zernio-signature": createHmac("sha256", ZERNIO_SECRET)
            .update(body)
            .digest("hex"),
        },
      }),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as { ok: boolean; processed: number };
    expect(json.ok).toBe(true);
    expect(json.processed).toBe(1);

    const db = getDb();
    expect(await db.select().from(commentInteractions)).toHaveLength(1);
  });

  it("protege a tarefa agendada com CRON_SECRET", async () => {
    const unauthorized = await cronGet(
      new Request("http://localhost/api/cron/tick"),
    );
    expect(unauthorized.status).toBe(401);

    const authorized = await cronGet(
      new Request("http://localhost/api/cron/tick", {
        headers: { authorization: `Bearer ${CRON_SECRET}` },
      }),
    );
    expect(authorized.status).toBe(200);
    const json = (await authorized.json()) as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("exige a senha do painel para iniciar o login do Instagram", async () => {
    process.env.INSTAGRAM_APP_ID ||= "123456789";

    authState.authorization = "";
    const denied = await oauthStartGet(
      new Request("http://localhost/api/auth/instagram/start"),
    );
    expect(denied.status).toBe(401);

    authState.authorization = basic("admin", ADMIN_PASSWORD);
    const allowed = await oauthStartGet(
      new Request("http://localhost/api/auth/instagram/start"),
    );
    expect(allowed.status).toBe(307);
    const location = allowed.headers.get("location") ?? "";
    expect(location).toContain("instagram.com/oauth/authorize");
    expect(location).toContain("state=");
    expect(allowed.headers.get("set-cookie")).toContain("marichat_ig_oauth_state");
  });

  it("apaga os dados do usuário no callback assinado da Meta", async () => {
    const account = await seedAccount();
    const automation = await seedAutomation(account.id);
    const interaction = await seedInteraction({
      accountId: account.id,
      automationId: automation.id,
      commenterIgsid: "user-del",
    });
    const db = getDb();

    const payload = Buffer.from(
      JSON.stringify({
        algorithm: "HMAC-SHA256",
        user_id: "user-del",
        issued_at: Math.floor(Date.now() / 1000),
      }),
      "utf8",
    ).toString("base64url");
    const signature = createHmac("sha256", APP_SECRET)
      .update(payload)
      .digest("base64url");

    const form = new URLSearchParams({ signed_request: `${signature}.${payload}` });

    const response = await dataDeletionPost(
      new Request("http://localhost/api/data-deletion", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }),
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      url: string;
      confirmation_code: string;
    };
    expect(json.url).toContain("/exclusao-de-dados?codigo=");
    expect(json.confirmation_code).toMatch(/^[a-f0-9]{32}$/);

    expect(await db.select().from(commentInteractions)).toHaveLength(0);
    expect(await db.select().from(outboundMessages)).toHaveLength(0);
    const requests = await db.select().from(dataDeletionRequests);
    expect(requests).toHaveLength(1);
    expect(requests[0]!.status).toBe("completed");
    expect(requests[0]!.confirmationCode).toBe(json.confirmation_code);
    expect(interaction.commenterIgsid).toBe("user-del");
  });

  it("recusa o callback de exclusão com assinatura inválida", async () => {
    const form = new URLSearchParams({ signed_request: "invalido.abc" });
    const response = await dataDeletionPost(
      new Request("http://localhost/api/data-deletion", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      }),
    );
    expect(response.status).toBe(401);
  });
});

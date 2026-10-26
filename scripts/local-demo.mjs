/**
 * Demonstração local do fluxo completo, SEM enviar nada para a Meta.
 *
 * Sobe uma API do Instagram simulada em http://127.0.0.1:4010, cadastra uma
 * conta e uma automação no banco local, envia o webhook assinado de comentário
 * e depois o de resposta da pessoa na DM, executando a fila pelo endpoint de
 * cron.
 *
 * Uso:
 *   1. npm run dev                (em outro terminal)
 *   2. npm run demo:local
 */

import { createCipheriv, createHmac, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

/* ------------------------------------------------------------------ */
/* Configuração                                                        */
/* ------------------------------------------------------------------ */

const ROOT = process.cwd();

function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!match?.[1]) continue;
    const key = match[1];
    if (process.env[key] !== undefined) continue;
    process.env[key] = (match[2] ?? "").replace(/^"(.*)"$/, "$1");
  }
}

loadEnvLocal();

const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const DATABASE_URL = process.env.DATABASE_URL;
const APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
const CRON_SECRET = process.env.CRON_SECRET;
const TOKEN_KEY = process.env.TOKEN_ENCRYPTION_KEY;

const MOCK_PORT = 4010;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;

const DEMO_IG_ID = "17841400000000001";
const DEMO_USERNAME = "conta_demo";
const DEMO_COMMENTER = "user_demo_1";
const DEMO_LINK = "https://marichat.fluxie.com.br/demo";
const DEMO_TOKEN = "IGQVJ-token-simulado-de-teste";

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

const results = [];
function check(condition, label, detail = "") {
  results.push({ ok: Boolean(condition), label, detail });
  console.log(
    `${condition ? "  OK  " : " FALHA"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) {
    throw new Error(
      `Verificação falhou: ${label}${detail ? ` (${detail})` : ""}`,
    );
  }
}

function step(title) {
  console.log(`\n=== ${title} ===`);
}

function encryptToken(plaintext) {
  const key = Buffer.from(TOKEN_KEY ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY ausente ou inválida no .env.local.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

function signBody(rawBody) {
  return (
    "sha256=" +
    createHmac("sha256", APP_SECRET ?? "")
      .update(rawBody)
      .digest("hex")
  );
}

async function waitForApp() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${APP_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // servidor ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `A aplicação não respondeu em ${APP_URL}. Inicie o servidor com "npm run dev" em outro terminal.`,
  );
}

/* ------------------------------------------------------------------ */
/* API do Instagram simulada                                           */
/* ------------------------------------------------------------------ */

const receivedMessages = [];

function svgThumb(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${color}"/><text x="60" y="66" font-family="sans-serif" font-size="14" fill="#fff" text-anchor="middle">${label}</text></svg>`;
}

function startMockApi() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", MOCK_URL);
    const json = (status, body) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(body));
    };
    const raw = await (async () => {
      if (request.method !== "POST") return "";
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      return Buffer.concat(chunks).toString("utf8");
    })();

    if (url.pathname.startsWith("/thumb/")) {
      const isVideo = url.pathname.includes("video");
      response.writeHead(200, { "content-type": "image/svg+xml" });
      response.end(
        svgThumb(isVideo ? "reel" : "post", isVideo ? "#0f766e" : "#7c3aed"),
      );
      return;
    }

    if (/^\/v\d+\.\d+\/me\/media$/.test(url.pathname)) {
      return json(200, {
        data: [
          {
            id: "media-demo-video",
            caption: "Reel de demonstração\nsegunda linha ignorada",
            media_type: "VIDEO",
            media_url: `${MOCK_URL}/video.mp4`,
            thumbnail_url: `${MOCK_URL}/thumb/video.svg`,
            permalink: "https://www.instagram.com/reel/demo/",
            timestamp: new Date().toISOString(),
          },
          {
            id: "media-demo-imagem",
            caption: "Post de demonstração",
            media_type: "IMAGE",
            media_url: `${MOCK_URL}/thumb/image.svg`,
            permalink: "https://www.instagram.com/p/demo/",
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }

    if (/^\/v\d+\.\d+\/me$/.test(url.pathname)) {
      return json(200, {
        user_id: DEMO_IG_ID,
        username: DEMO_USERNAME,
        account_type: "BUSINESS",
      });
    }

    if (/\/subscribed_apps$/.test(url.pathname)) {
      if (request.method === "GET") {
        return json(200, {
          data: [
            {
              id: DEMO_IG_ID,
              name: "MARICHAT demo",
              subscribed_fields: [
                "comments",
                "messages",
                "messaging_postbacks",
              ],
            },
          ],
        });
      }
      console.log(
        `   [mock] webhooks assinados: ${url.searchParams.get("subscribed_fields")}`,
      );
      return json(200, { success: true });
    }

    if (/\/messages$/.test(url.pathname) && request.method === "POST") {
      let body = null;
      try {
        body = JSON.parse(raw);
      } catch {
        body = null;
      }
      const messageId = `mock-mid-${receivedMessages.length + 1}`;
      receivedMessages.push({ messageId, body });
      console.log(`   [mock] mensagem recebida (id ${messageId})`);
      return json(200, {
        message_id: messageId,
        recipient_id:
          body?.recipient?.id ?? body?.recipient?.comment_id ?? null,
      });
    }

    if (
      url.pathname === "/access_token" ||
      url.pathname === "/refresh_access_token"
    ) {
      return json(200, {
        access_token: "IGQVJ-token-longa-duracao-simulado",
        expires_in: 60 * 24 * 3600,
      });
    }

    return json(404, {
      error: {
        message: `Rota simulada não implementada: ${request.method} ${url.pathname}`,
        code: 100,
      },
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(MOCK_PORT, "127.0.0.1", () => resolve(server));
  });
}

/* ------------------------------------------------------------------ */
/* Banco de dados                                                      */
/* ------------------------------------------------------------------ */

async function seedDatabase(sql) {
  const encrypted = encryptToken(DEMO_TOKEN);
  const expiresAt = new Date(Date.now() + 50 * 86_400_000);

  const [account] = await sql`
    INSERT INTO instagram_accounts
      (instagram_user_id, username, access_token_encrypted, token_expires_at, connection_status, last_verified_at)
    VALUES
      (${DEMO_IG_ID}, ${DEMO_USERNAME}, ${encrypted}, ${expiresAt}, 'connected', now())
    ON CONFLICT (instagram_user_id) DO UPDATE SET
      username = excluded.username,
      access_token_encrypted = excluded.access_token_encrypted,
      token_expires_at = excluded.token_expires_at,
      connection_status = 'connected',
      last_verified_at = now(),
      updated_at = now()
    RETURNING id
  `;

  // Limpa apenas os dados de demonstração, mantendo o resto do banco intacto.
  await sql`
    DELETE FROM outbound_messages
    WHERE interaction_id IN (
      SELECT id FROM comment_interactions
      WHERE account_id = ${account.id} AND comment_id LIKE 'demo-%'
    )
  `;
  await sql`
    DELETE FROM comment_interactions
    WHERE account_id = ${account.id} AND comment_id LIKE 'demo-%'
  `;
  await sql`DELETE FROM automations WHERE account_id = ${account.id} AND name = 'Demonstração local'`;
  await sql`
    DELETE FROM webhook_events
    WHERE event_key LIKE 'comment:demo-%' OR event_key LIKE 'message:demo-%'
  `;

  const [automation] = await sql`
    INSERT INTO automations (
      account_id, name, keyword, keyword_normalized, media_id,
      first_dm_text, second_dm_text, link_button_title,
      link_url, is_active
    ) VALUES (
      ${account.id}, 'Demonstração local', 'quero', 'quero', NULL,
      'Que bom que você se interessou! Responda esta mensagem para receber o link.',
      'Aqui está o link que você pediu',
      'Abrir link', ${DEMO_LINK}, true
    )
    RETURNING id
  `;

  return { accountId: account.id, automationId: automation.id };
}

/* ------------------------------------------------------------------ */
/* Fluxo                                                               */
/* ------------------------------------------------------------------ */

async function postWebhook(body) {
  const raw = JSON.stringify(body);
  const response = await fetch(`${APP_URL}/api/webhook`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": signBody(raw),
    },
    body: raw,
  });
  const text = await response.text();
  return { status: response.status, body: text };
}

async function runCron() {
  const response = await fetch(`${APP_URL}/api/cron/tick`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  if (!response.ok) {
    throw new Error(`Cron respondeu HTTP ${response.status}.`);
  }
  return response.json();
}

async function main() {
  if (!DATABASE_URL || !APP_SECRET || !CRON_SECRET || !TOKEN_KEY) {
    throw new Error(
      "Faltam variáveis no .env.local (banco, App Secret, cron ou chave).",
    );
  }

  const { default: postgres } = await import("postgres");
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

  step("1. Subindo a API do Instagram simulada");
  const mock = await startMockApi();
  console.log(
    `   API falsa em ${MOCK_URL} (nenhuma mensagem real será enviada)`,
  );

  try {
    step("2. Verificando a aplicação local");
    await waitForApp();
    console.log(`   ${APP_URL} respondeu`);
    check(
      process.env.INSTAGRAM_GRAPH_BASE_URL?.startsWith(MOCK_URL) ?? false,
      "Ambiente local aponta para a API simulada",
      process.env.INSTAGRAM_GRAPH_BASE_URL ?? "(variável ausente)",
    );

    step("3. Preparando conta e automação de demonstração");
    const { automationId } = await seedDatabase(sql);
    console.log(`   conta ${DEMO_IG_ID}, automação ${automationId}`);

    step("4. Cliente comenta a palavra-chave");
    const commentId = `demo-${Date.now()}`;
    const commentResponse = await postWebhook({
      object: "instagram",
      entry: [
        {
          id: DEMO_IG_ID,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "comments",
              value: {
                id: commentId,
                text: "Eu quero o link!",
                from: { id: DEMO_COMMENTER, username: "cliente_demo" },
                media: { id: "media-demo-video" },
              },
            },
          ],
        },
      ],
    });
    check(
      commentResponse.status === 200,
      "Webhook de comentário aceito",
      `HTTP ${commentResponse.status}`,
    );

    step("5. Executando a fila (tarefa agendada)");
    const firstTick = await runCron();
    console.log(`   fila: ${JSON.stringify(firstTick.drain)}`);

    const [afterFirst] = await sql`
      SELECT state, first_dm_message_id
      FROM comment_interactions WHERE comment_id = ${commentId}
    `;
    check(Boolean(afterFirst), "Interação registrada no banco");
    check(
      afterFirst?.state === "accepted",
      "Primeira DM aceita pela API",
      `estado: ${afterFirst?.state}`,
    );

    const firstMessage = receivedMessages.at(-1)?.body;
    check(Boolean(firstMessage?.message?.text), "Primeira DM tem texto");
    check(
      firstMessage?.message?.text?.includes("Responda") ?? false,
      "Primeira DM pede uma resposta (sem botão)",
      firstMessage?.message?.text ?? "(sem texto)",
    );
    check(
      !firstMessage?.message?.quick_replies,
      "Primeira DM não usa quick reply",
    );
    check(
      firstMessage?.recipient?.comment_id === commentId,
      "Primeira DM é resposta privada ao comentário",
    );

    step("6. Cliente responde a DM");
    const tapResponse = await postWebhook({
      object: "instagram",
      entry: [
        {
          id: DEMO_IG_ID,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "messages",
              value: {
                sender: { id: DEMO_COMMENTER },
                recipient: { id: DEMO_IG_ID },
                timestamp: Math.floor(Date.now() / 1000),
                message: {
                  mid: `demo-mid-${Date.now()}`,
                  text: "Quero o link",
                },
              },
            },
          ],
        },
      ],
    });
    check(
      tapResponse.status === 200,
      "Webhook de resposta aceito",
      `HTTP ${tapResponse.status}`,
    );

    step("7. Executando a fila novamente");
    const secondTick = await runCron();
    console.log(`   fila: ${JSON.stringify(secondTick.drain)}`);

    const [afterSecond] = await sql`
      SELECT state, second_dm_message_id
      FROM comment_interactions WHERE comment_id = ${commentId}
    `;
    check(
      afterSecond?.state === "link_sent",
      "Segunda mensagem aceita",
      `estado: ${afterSecond?.state}`,
    );

    const secondMessage = receivedMessages.at(-1)?.body;
    const button =
      secondMessage?.message?.attachment?.payload?.elements?.[0]?.buttons?.[0];
    check(button?.type === "web_url", "Segunda mensagem tem botão de link");
    check(
      button?.url === DEMO_LINK,
      "O link do botão é o configurado",
      button?.url ?? "(sem link)",
    );
    check(button?.url?.startsWith("https://") ?? false, "O link usa HTTPS");

    step("8. Conferindo o painel administrativo");
    const admin = await fetch(`${APP_URL}/admin`, {
      headers: {
        authorization:
          "Basic " +
          Buffer.from(`admin:${process.env.ADMIN_PASSWORD ?? ""}`).toString(
            "base64",
          ),
      },
    });
    check(
      admin.status === 200,
      "Painel abre com a senha",
      `HTTP ${admin.status}`,
    );
    const html = await admin.text();
    check(html.includes("Demonstração local"), "Automação aparece no painel");

    const formPage = await fetch(`${APP_URL}/admin/automacoes/nova`, {
      headers: {
        authorization:
          "Basic " +
          Buffer.from(`admin:${process.env.ADMIN_PASSWORD ?? ""}`).toString(
            "base64",
          ),
      },
    });
    const formHtml = await formPage.text();
    check(
      formPage.status === 200,
      "Tela de nova automação abre",
      `HTTP ${formPage.status}`,
    );
    check(
      formHtml.includes("Reel de demonstração"),
      "Lista de publicações vem da API (vídeo)",
    );
    check(
      formHtml.includes("/thumb/video.svg"),
      "Vídeo mostra a miniatura correta",
    );
    check(
      formHtml.includes("Post de demonstração"),
      "Lista de publicações vem da API (imagem)",
    );

    step("9. Resumo do que foi enviado (API simulada)");
    receivedMessages.forEach((item, index) => {
      console.log(`\n   --- mensagem ${index + 1} (${item.messageId}) ---`);
      console.log(
        JSON.stringify(item.body, null, 2)
          .split("\n")
          .map((line) => `   ${line}`)
          .join("\n"),
      );
    });

    console.log(
      "\nFluxo completo validado: comentário → DM pedindo resposta → resposta → link.\n",
    );
    console.log(`Abra ${APP_URL}/admin (usuário admin) para ver os registros.`);
  } finally {
    await sql.end({ timeout: 5 });
    mock.close();
  }
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
});

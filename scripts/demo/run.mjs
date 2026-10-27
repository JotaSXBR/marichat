/**
 * Orquestra a demonstração local: sobe a API falsa, prepara o banco, envia os
 * webhooks e confere o resultado de cada etapa.
 */

import {
  ADMIN_PASSWORD,
  APP_SECRET,
  APP_URL,
  CRON_SECRET,
  DATABASE_URL,
  DEMO_COMMENTER,
  DEMO_IG_ID,
  DEMO_LINK,
  MOCK_URL,
  TOKEN_KEY,
} from "./env.mjs";
import { receivedMessages, startMockApi } from "./mock-api.mjs";
import {
  firstButton,
  hasQuickReplies,
  messageText,
  repliedCommentId,
} from "./payload.mjs";
import { seedDatabase } from "./seed.mjs";
import { check, signBody, step, waitForApp } from "./util.mjs";

function checkEnv() {
  if (!DATABASE_URL || !APP_SECRET || !CRON_SECRET || !TOKEN_KEY) {
    throw new Error(
      "Faltam variáveis no .env.local (banco, App Secret, cron ou chave).",
    );
  }
  // O demo simula a API da Meta; com a Zernio ligada o painel procura uma
  // conta Zernio e a conta de demonstração (Meta) não aparece.
  if ((process.env.MESSAGING_PROVIDER ?? "meta") !== "meta") {
    throw new Error(
      'O demo local simula a API da Meta. Defina MESSAGING_PROVIDER=meta no .env.local e reinicie "npm run dev".',
    );
  }
}

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

function adminFetch(pathname) {
  return fetch(`${APP_URL}${pathname}`, {
    headers: {
      authorization:
        "Basic " + Buffer.from(`admin:${ADMIN_PASSWORD}`).toString("base64"),
    },
  });
}

async function startMockStep() {
  step("1. Subindo a API do Instagram simulada");
  const mock = await startMockApi();
  console.log(
    `   API falsa em ${MOCK_URL} (nenhuma mensagem real será enviada)`,
  );
  return mock;
}

async function checkAppStep() {
  step("2. Verificando a aplicação local");
  await waitForApp();
  console.log(`   ${APP_URL} respondeu`);
  check(
    process.env.INSTAGRAM_GRAPH_BASE_URL?.startsWith(MOCK_URL) ?? false,
    "Ambiente local aponta para a API simulada",
    process.env.INSTAGRAM_GRAPH_BASE_URL ?? "(variável ausente)",
  );
}

async function seedStep(sql) {
  step("3. Preparando conta e automação de demonstração");
  const { automationId } = await seedDatabase(sql);
  console.log(`   conta ${DEMO_IG_ID}, automação ${automationId}`);
}

async function commentStep() {
  step("4. Cliente comenta a palavra-chave");
  const commentId = `demo-${Date.now()}`;
  const response = await postWebhook({
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
    response.status === 200,
    "Webhook de comentário aceito",
    `HTTP ${response.status}`,
  );
  return commentId;
}

async function firstDmStep(sql, commentId) {
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
  const text = messageText(firstMessage);
  check(Boolean(text), "Primeira DM tem texto");
  check(
    text.includes("Responda"),
    "Primeira DM pede uma resposta (sem botão)",
    text || "(sem texto)",
  );
  check(!hasQuickReplies(firstMessage), "Primeira DM não usa quick reply");
  check(
    repliedCommentId(firstMessage) === commentId,
    "Primeira DM é resposta privada ao comentário",
  );
}

async function replyStep() {
  step("6. Cliente responde a DM");
  const response = await postWebhook({
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
    response.status === 200,
    "Webhook de resposta aceito",
    `HTTP ${response.status}`,
  );
}

async function secondDmStep(sql, commentId) {
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
  const button = firstButton(secondMessage);
  check(button?.type === "web_url", "Segunda mensagem tem botão de link");
  check(
    button?.url === DEMO_LINK,
    "O link do botão é o configurado",
    button?.url ?? "(sem link)",
  );
  check(button?.url?.startsWith("https://") ?? false, "O link usa HTTPS");
}

async function adminStep() {
  step("8. Conferindo o painel administrativo");
  const admin = await adminFetch("/admin");
  check(
    admin.status === 200,
    "Painel abre com a senha",
    `HTTP ${admin.status}`,
  );
  const html = await admin.text();
  check(html.includes("Demonstração local"), "Automação aparece no painel");

  const formPage = await adminFetch("/admin/automacoes/nova");
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
}

function summaryStep() {
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
}

export async function run() {
  checkEnv();

  const { default: postgres } = await import("postgres");
  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  const mock = await startMockStep();

  try {
    await checkAppStep();
    await seedStep(sql);
    const commentId = await commentStep();
    await firstDmStep(sql, commentId);
    await replyStep();
    await secondDmStep(sql, commentId);
    await adminStep();
    summaryStep();
  } finally {
    await sql.end({ timeout: 5 });
    mock.close();
  }
}

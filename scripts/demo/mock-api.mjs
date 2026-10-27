/**
 * API do Instagram simulada. Nenhuma mensagem sai para a Meta: tudo é
 * respondido localmente para o demo exercitar o fluxo completo.
 */

import { createServer } from "node:http";

import { DEMO_IG_ID, DEMO_USERNAME, MOCK_PORT, MOCK_URL } from "./env.mjs";

export const receivedMessages = [];

function svgThumb(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${color}"/><text x="60" y="66" font-family="sans-serif" font-size="14" fill="#fff" text-anchor="middle">${label}</text></svg>`;
}

async function readRaw(request) {
  if (request.method !== "POST") return "";
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function handleThumb({ response, url }) {
  const isVideo = url.pathname.includes("video");
  response.writeHead(200, { "content-type": "image/svg+xml" });
  response.end(
    svgThumb(isVideo ? "reel" : "post", isVideo ? "#0f766e" : "#7c3aed"),
  );
}

function handleMedia({ response }) {
  sendJson(response, 200, {
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

function handleMe({ response }) {
  sendJson(response, 200, {
    user_id: DEMO_IG_ID,
    username: DEMO_USERNAME,
    account_type: "BUSINESS",
  });
}

function handleSubscribed({ request, response, url }) {
  if (request.method === "GET") {
    sendJson(response, 200, {
      data: [
        {
          id: DEMO_IG_ID,
          name: "MARICHAT demo",
          subscribed_fields: ["comments", "messages", "messaging_postbacks"],
        },
      ],
    });
    return;
  }
  console.log(
    `   [mock] webhooks assinados: ${url.searchParams.get("subscribed_fields")}`,
  );
  sendJson(response, 200, { success: true });
}

function handleMessages({ response, raw }) {
  let body = null;
  try {
    body = JSON.parse(raw);
  } catch {
    body = null;
  }
  const messageId = `mock-mid-${receivedMessages.length + 1}`;
  receivedMessages.push({ messageId, body });
  console.log(`   [mock] mensagem recebida (id ${messageId})`);
  sendJson(response, 200, {
    message_id: messageId,
    recipient_id: body?.recipient?.id ?? body?.recipient?.comment_id ?? null,
  });
}

function handleToken({ response }) {
  sendJson(response, 200, {
    access_token: "IGQVJ-token-longa-duracao-simulado",
    expires_in: 60 * 24 * 3600,
  });
}

/** Escolhe o tratador pela rota; devolve `false` quando nada casa. */
function dispatch(context) {
  const { request, url } = context;

  if (url.pathname.startsWith("/thumb/")) {
    handleThumb(context);
    return true;
  }
  if (/^\/v\d+\.\d+\/me\/media$/.test(url.pathname)) {
    handleMedia(context);
    return true;
  }
  if (/^\/v\d+\.\d+\/me$/.test(url.pathname)) {
    handleMe(context);
    return true;
  }
  if (/\/subscribed_apps$/.test(url.pathname)) {
    handleSubscribed(context);
    return true;
  }
  if (/\/messages$/.test(url.pathname) && request.method === "POST") {
    handleMessages(context);
    return true;
  }
  if (
    url.pathname === "/access_token" ||
    url.pathname === "/refresh_access_token"
  ) {
    handleToken(context);
    return true;
  }
  return false;
}

async function handleRequest(request, response) {
  const url = new URL(request.url ?? "/", MOCK_URL);
  const raw = await readRaw(request);
  const context = { request, response, url, raw };

  if (dispatch(context)) return;

  sendJson(response, 404, {
    error: {
      message: `Rota simulada não implementada: ${request.method} ${url.pathname}`,
      code: 100,
    },
  });
}

/** Sobe a API falsa e resolve com o servidor já escutando. */
export function startMockApi() {
  const server = createServer((request, response) => {
    handleRequest(request, response).catch((error) => {
      sendJson(response, 500, {
        error: { message: String(error), code: 1 },
      });
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(MOCK_PORT, "127.0.0.1", () => resolve(server));
  });
}

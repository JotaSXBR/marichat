import { after } from "next/server";

import { safeEqual } from "@/lib/crypto";
import { requireEnv } from "@/lib/env";
import { verifyHubSignature256 } from "@/lib/signature";
import { drainQueue } from "@/lib/queue/drain";
import {
  handleWebhookPayload,
  type WebhookPayload,
} from "@/lib/webhook/process";

/**
 * Webhook oficial da Meta para comentários e mensagens do Instagram.
 *
 * GET  -> verificação do endpoint (hub.mode / hub.verify_token / hub.challenge)
 * POST -> eventos assinados com X-Hub-Signature-256 (HMAC-SHA256 do corpo bruto)
 *
 * A resposta é sempre rápida (200) depois de gravar o evento e a tarefa.
 * O envio real acontece no drenador da fila, executado após a resposta.
 */

export function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  let expectedToken: string;
  try {
    expectedToken = requireEnv("META_WEBHOOK_VERIFY_TOKEN");
  } catch {
    return new Response("Webhook não configurado.", { status: 500 });
  }

  if (
    mode === "subscribe" &&
    token !== null &&
    challenge !== null &&
    safeEqual(token, expectedToken)
  ) {
    return new Response(challenge, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response("Verificação recusada.", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  let appSecret: string;
  try {
    appSecret = requireEnv("INSTAGRAM_APP_SECRET");
  } catch {
    console.error("[webhook] INSTAGRAM_APP_SECRET não configurado.");
    return new Response("Webhook não configurado.", { status: 500 });
  }

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyHubSignature256(rawBody, signature, appSecret)) {
    // Corpo não veio da Meta: recusa sem processar nada.
    return new Response("Assinatura inválida.", { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return new Response("Corpo inválido.", { status: 400 });
  }

  try {
    const summary = await handleWebhookPayload(payload);
    try {
      after(async () => {
        try {
          await drainQueue(5);
        } catch (error) {
          console.error("[webhook] falha ao drenar a fila:", error);
        }
      });
    } catch (error) {
      // Sem contexto de request (por exemplo em testes): o cron diário
      // continua responsável por drenar a fila.
      console.error("[webhook] não foi possível agendar o envio:", error);
    }
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    // 5xx faz a Meta reenviar. O evento ficou marcado como "failed" e pode
    // ser reservado de novo; responder 200 perderia o evento para sempre.
    console.error("[webhook] erro ao processar payload:", error);
    return Response.json({ error: "Falha ao processar." }, { status: 500 });
  }
}

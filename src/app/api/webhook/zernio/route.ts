import { after } from "next/server";

import { drainQueue } from "@/lib/queue/drain";
import { ZERNIO } from "@/lib/zernio/config";
import { verifyZernioSignature } from "@/lib/zernio/signature";
import { handleZernioEvent, type ZernioEvent } from "@/lib/webhook/zernio";

/**
 * Webhook da Zernio.
 *
 * Assinatura: X-Zernio-Signature = HMAC-SHA256 (hex) do corpo cru, com o
 * segredo informado em POST /v1/webhooks/settings.
 *
 * A Zernio exige resposta 2xx em até 5 segundos e reenvia o mesmo evento (com
 * o mesmo X-Zernio-Event-Id) se não receber. O dedupe já usa esse id.
 */

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!ZERNIO.webhookSecret) {
    console.error("[zernio] ZERNIO_WEBHOOK_SECRET não configurado.");
    return new Response("Webhook não configurado.", { status: 500 });
  }

  const signature = request.headers.get("x-zernio-signature");
  if (
    !verifyZernioSignature({
      rawBody,
      signature,
      secret: ZERNIO.webhookSecret,
    })
  ) {
    return new Response("Assinatura inválida.", { status: 401 });
  }

  let event: ZernioEvent;
  try {
    event = JSON.parse(rawBody) as ZernioEvent;
  } catch {
    return new Response("Corpo inválido.", { status: 400 });
  }

  try {
    const summary = await handleZernioEvent(
      event,
      request.headers.get("x-zernio-event-id"),
    );
    try {
      after(async () => {
        try {
          await drainQueue(5);
        } catch (error) {
          console.error("[zernio] falha ao drenar a fila:", error);
        }
      });
    } catch {
      // Sem contexto de request: o cron continua drenando a fila.
    }
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    // Nunca devolve erro para a Zernio por falha interna: ela reenviaria o
    // evento e o dedupe já garantiu o registro.
    console.error("[zernio] erro ao processar evento:", error);
    return Response.json({ received: true });
  }
}

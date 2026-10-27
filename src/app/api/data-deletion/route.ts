import { createHash, randomBytes } from "node:crypto";

import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  commentInteractions,
  dataDeletionRequests,
  outboundMessages,
} from "@/lib/db/schema";
import { getAppUrl, requireEnv } from "@/lib/env";
import { parseSignedRequest } from "@/lib/signature";

/**
 * Callback de exclusão de dados exigido pela Meta.
 *
 * Recebe `signed_request` (form-urlencoded), valida a assinatura com o
 * App Secret e apaga os dados ligados ao usuário do Instagram.
 * Devolve a URL de acompanhamento e o código de confirmação.
 */

type SignedRequestResult =
  { ok: true; signedRequest: string | null } | { ok: false; error: Response };

/** Aceita JSON ou formulário e devolve o `signed_request` cru. */
async function readSignedRequest(
  request: Request,
): Promise<SignedRequestResult> {
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { signed_request?: string };
      return { ok: true, signedRequest: body.signed_request ?? null };
    }
    const form = await request.formData();
    const value = form.get("signed_request");
    return {
      ok: true,
      signedRequest: typeof value === "string" ? value : null,
    };
  } catch {
    return { ok: false, error: invalidBody() };
  }
}

function invalidBody(): Response {
  return Response.json({ error: "Corpo inválido." }, { status: 400 });
}

/** Apaga mensagens e interações e registra o pedido concluído. */
async function deleteUserData(
  instagramUserId: string,
  confirmationCode: string,
): Promise<void> {
  const db = getDb();
  const interactions = await db
    .select({ id: commentInteractions.id })
    .from(commentInteractions)
    .where(eq(commentInteractions.commenterIgsid, instagramUserId));

  for (const interaction of interactions) {
    // Apaga primeiro as mensagens (FK), depois a interação.
    await db
      .delete(outboundMessages)
      .where(eq(outboundMessages.interactionId, interaction.id));
    await db
      .delete(commentInteractions)
      .where(eq(commentInteractions.id, interaction.id));
  }

  // Remove também cópias do identificador guardadas nos payloads de webhook.
  await db.execute(sql`
    DELETE FROM webhook_events
    WHERE payload::text LIKE ${`%${instagramUserId}%`}
  `);

  await db.insert(dataDeletionRequests).values({
    instagramUserIdHash: createHash("sha256")
      .update(instagramUserId)
      .digest("hex"),
    confirmationCode,
    status: "completed",
    completedAt: new Date(),
  });
}

function statusUrl(confirmationCode: string): string {
  const url = new URL("/exclusao-de-dados", getAppUrl());
  url.searchParams.set("codigo", confirmationCode);
  return url.toString();
}

export async function POST(request: Request) {
  let appSecret: string;
  try {
    appSecret = requireEnv("INSTAGRAM_APP_SECRET");
  } catch {
    return Response.json({ error: "Não configurado." }, { status: 500 });
  }

  const body = await readSignedRequest(request);
  if (!body.ok) return body.error;
  if (!body.signedRequest) {
    return Response.json({ error: "signed_request ausente." }, { status: 400 });
  }

  const payload = parseSignedRequest(body.signedRequest, appSecret);
  if (!payload?.user_id) {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const instagramUserId = String(payload.user_id);
  const confirmationCode = randomBytes(16).toString("hex");

  try {
    await deleteUserData(instagramUserId, confirmationCode);
    return Response.json({
      url: statusUrl(confirmationCode),
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    console.error("[data-deletion] falha ao apagar dados:", error);
    return Response.json(
      { error: "Não foi possível concluir a exclusão agora." },
      { status: 500 },
    );
  }
}

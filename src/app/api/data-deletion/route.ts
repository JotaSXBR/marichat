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

export async function POST(request: Request) {
  let appSecret: string;
  try {
    appSecret = requireEnv("INSTAGRAM_APP_SECRET");
  } catch {
    return Response.json({ error: "Não configurado." }, { status: 500 });
  }

  let signedRequest: string | null = null;
  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { signed_request?: string };
      signedRequest = body.signed_request ?? null;
    } else {
      const form = await request.formData();
      const value = form.get("signed_request");
      signedRequest = typeof value === "string" ? value : null;
    }
  } catch {
    return Response.json({ error: "Corpo inválido." }, { status: 400 });
  }

  if (!signedRequest) {
    return Response.json({ error: "signed_request ausente." }, { status: 400 });
  }

  const payload = parseSignedRequest(signedRequest, appSecret);
  if (!payload?.user_id) {
    return Response.json({ error: "Assinatura inválida." }, { status: 401 });
  }

  const instagramUserId = String(payload.user_id);
  const hash = createHash("sha256").update(instagramUserId).digest("hex");
  const confirmationCode = randomBytes(16).toString("hex");
  const db = getDb();

  try {
    // Apaga primeiro as mensagens (FK), depois as interações do usuário.
    const interactions = await db
      .select({ id: commentInteractions.id })
      .from(commentInteractions)
      .where(eq(commentInteractions.commenterIgsid, instagramUserId));

    for (const interaction of interactions) {
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
      instagramUserIdHash: hash,
      confirmationCode,
      status: "completed",
      completedAt: new Date(),
    });

    const statusUrl = new URL("/exclusao-de-dados", getAppUrl());
    statusUrl.searchParams.set("codigo", confirmationCode);

    return Response.json({
      url: statusUrl.toString(),
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

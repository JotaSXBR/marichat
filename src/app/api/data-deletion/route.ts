import { createHash, randomBytes } from "node:crypto";

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import { dataDeletionRequests } from "@/lib/db/schema";
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

  // Tudo ou nada: uma falha no meio não pode deixar o usuário parcialmente
  // apagado sem registro. O LIKE usa o id entre aspas para não casar com um
  // id maior que apenas contém os mesmos dígitos.
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      DELETE FROM outbound_messages
      WHERE interaction_id IN (
        SELECT id FROM comment_interactions
        WHERE commenter_igsid = ${instagramUserId}
      )
    `);
    await tx.execute(sql`
      DELETE FROM comment_interactions
      WHERE commenter_igsid = ${instagramUserId}
    `);
    await tx.execute(sql`
      DELETE FROM webhook_events
      WHERE payload::text LIKE ${`%"${instagramUserId}"%`}
    `);

    await tx.insert(dataDeletionRequests).values({
      instagramUserIdHash: createHash("sha256")
        .update(instagramUserId)
        .digest("hex"),
      confirmationCode,
      status: "completed",
      completedAt: new Date(),
    });
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

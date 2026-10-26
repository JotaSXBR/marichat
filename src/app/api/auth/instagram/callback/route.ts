import { NextResponse, type NextRequest } from "next/server";

import { safeEqualStrings } from "@/lib/http-auth";
import {
  completeOAuth,
  getRedirectUri,
  STATE_COOKIE,
} from "@/lib/instagram/oauth";

/**
 * Retorno do login do Instagram.
 * Valida o `state` contra o cookie antes de trocar o código pelo token.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;

  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url), {
      status: 303,
    });
    response.cookies.set(STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  };

  if (oauthError) {
    return finish(`/admin/conexao?erro=autorizacao`);
  }
  if (!state || !cookieState || !safeEqualStrings(state, cookieState)) {
    return finish(`/admin/conexao?erro=state`);
  }
  if (!code) {
    return finish(`/admin/conexao?erro=codigo`);
  }

  try {
    const result = await completeOAuth({
      code,
      redirectUri: getRedirectUri(),
    });

    const params = new URLSearchParams({ ok: "1", conta: result.username });
    if (!result.webhookSubscribed) params.set("aviso", "webhook");
    return finish(`/admin/conexao?${params.toString()}`);
  } catch (error) {
    console.error("[oauth] falha na conexão:", error);
    return finish(`/admin/conexao?erro=conexao`);
  }
}

import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth";
import { requireEnv } from "@/lib/env";
import {
  buildAuthorizeUrl,
  createOAuthState,
  getRedirectUri,
  STATE_COOKIE,
  STATE_TTL_SECONDS,
} from "@/lib/instagram/oauth";

/** Inicia o login oficial do Instagram. Exige a senha do painel. */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return new Response("Não autorizado.", { status: 401 });
  }

  try {
    const appId = requireEnv("INSTAGRAM_APP_ID");
    const redirectUri = getRedirectUri();
    const state = createOAuthState();

    const response = NextResponse.redirect(
      buildAuthorizeUrl({ appId, redirectUri, state }),
    );
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: STATE_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("[oauth] não foi possível iniciar o login:", error);
    return NextResponse.redirect(
      new URL("/admin/conexao?erro=configuracao", request.url),
      { status: 303 },
    );
  }
}

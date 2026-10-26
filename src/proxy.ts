import { NextResponse, type NextRequest } from "next/server";

import { BASIC_AUTH_CHALLENGE, isAdminAuthValid } from "@/lib/http-auth";

/**
 * Porteiro do painel administrativo (HTTP Basic).
 *
 * Público: webhook, OAuth da Meta, cron, health check, páginas legais e
 * o callback de exclusão de dados. Todo o resto do painel fica protegido.
 *
 * O matcher abaixo cobre as páginas e as APIs administrativas. A validação
 * é repetida dentro das Server Actions/rotas, porque o Proxy não é uma
 * barreira suficiente por si só.
 */
export function proxy(request: NextRequest) {
  const authorized = isAdminAuthValid(
    request.headers.get("authorization"),
    process.env.ADMIN_PASSWORD,
  );

  if (authorized) {
    return NextResponse.next();
  }

  const isApi = request.nextUrl.pathname.startsWith("/api/");

  if (isApi) {
    return NextResponse.json(
      { error: "Não autorizado." },
      {
        status: 401,
        headers: { "www-authenticate": BASIC_AUTH_CHALLENGE },
      },
    );
  }

  return new NextResponse(
    "<!doctype html><html lang=\"pt-BR\"><meta charset=\"utf-8\"><title>Acesso restrito</title><body style=\"font-family:system-ui;padding:2rem\"><h1>Acesso restrito</h1><p>Informe o usuário <strong>admin</strong> e a senha do painel.</p></body></html>",
    {
      status: 401,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "www-authenticate": BASIC_AUTH_CHALLENGE,
        "cache-control": "no-store",
      },
    },
  );
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};

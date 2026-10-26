import "server-only";

import { headers } from "next/headers";

import { isAdminAuthValid } from "@/lib/http-auth";

/**
 * Validação de autenticação feita DENTRO da página, Server Action ou rota.
 *
 * O proxy.ts já barra as requisições do painel, mas a documentação do Next
 * recomenda validar de novo aqui: um ajuste no matcher jamais deve expor
 * dados ou permitir alterações.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const headerList = await headers();
  return isAdminAuthValid(headerList.get("authorization"));
}

export class NotAuthenticatedError extends Error {
  constructor() {
    super("Sessão administrativa inválida. Recarregue a página e informe a senha.");
    this.name = "NotAuthenticatedError";
  }
}

/** Use no início de toda Server Action e rota administrativa. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) {
    throw new NotAuthenticatedError();
  }
}

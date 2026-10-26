import { timingSafeEqual } from "node:crypto";

/**
 * Autenticação do painel com HTTP Basic.
 *
 * Módulo puro (sem `server-only`, sem APIs do Next) para poder ser usado
 * tanto no `proxy.ts` quanto nas Server Actions e rotas de API.
 * O usuário é sempre "admin"; a senha vem de ADMIN_PASSWORD.
 */

export const ADMIN_USERNAME = "admin";

export const BASIC_AUTH_CHALLENGE =
  'Basic realm="MARICHAT - painel", charset="UTF-8"';

export function safeEqualStrings(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function parseBasicAuthHeader(
  header: string | null,
): { username: string; password: string } | null {
  if (!header) return null;
  const match = /^Basic\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) return null;

  let decoded: string;
  try {
    decoded = Buffer.from(match[1], "base64").toString("utf8");
  } catch {
    return null;
  }

  const separator = decoded.indexOf(":");
  if (separator < 0) return null;

  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
}

/**
 * Confere o cabeçalho Authorization contra a senha configurada.
 * Retorna false (nunca lança) quando a configuração está ausente, para que
 * uma variável esquecida bloqueie o painel em vez de liberá-lo.
 */
export function isAdminAuthValid(
  header: string | null,
  adminPassword: string | undefined = process.env.ADMIN_PASSWORD,
): boolean {
  const expected = adminPassword?.trim();
  if (!expected) return false;

  const credentials = parseBasicAuthHeader(header);
  if (!credentials) return false;

  const userOk = safeEqualStrings(credentials.username, ADMIN_USERNAME);
  const passwordOk = safeEqualStrings(credentials.password, expected);
  return userOk && passwordOk;
}

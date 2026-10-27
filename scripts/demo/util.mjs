/**
 * Utilidades compartilhadas: verificações, espera da aplicação, assinatura do
 * webhook e criptografia do token de demonstração.
 */

import { createCipheriv, createHmac, randomBytes } from "node:crypto";

import { APP_SECRET, APP_URL, TOKEN_KEY } from "./env.mjs";

export const results = [];

export function check(condition, label, detail = "") {
  results.push({ ok: Boolean(condition), label, detail });
  console.log(
    `${condition ? "  OK  " : " FALHA"}  ${label}${detail ? ` — ${detail}` : ""}`,
  );
  if (!condition) {
    throw new Error(
      `Verificação falhou: ${label}${detail ? ` (${detail})` : ""}`,
    );
  }
}

export function step(title) {
  console.log(`\n=== ${title} ===`);
}

export function encryptToken(plaintext) {
  const key = Buffer.from(TOKEN_KEY ?? "", "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY ausente ou inválida no .env.local.");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function signBody(rawBody) {
  return (
    "sha256=" +
    createHmac("sha256", APP_SECRET ?? "")
      .update(rawBody)
      .digest("hex")
  );
}

/** Espera a aplicação responder em `/api/health` (até 25 segundos). */
export async function waitForApp() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${APP_URL}/api/health`);
      if (response.ok) return;
    } catch {
      // servidor ainda subindo
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `A aplicação não respondeu em ${APP_URL}. Inicie o servidor com "npm run dev" em outro terminal.`,
  );
}

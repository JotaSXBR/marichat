import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Criptografia autenticada do token do Instagram (AES-256-GCM).
 *
 * A chave vem de TOKEN_ENCRYPTION_KEY (32 bytes em base64), guardada apenas
 * como segredo no Coolify. Se a chave for perdida, os tokens já gravados não
 * poderão ser lidos: será necessário reconectar o Instagram.
 *
 * Formato: v1.<iv>.<tag>.<ciphertext> (base64url).
 */

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_BYTES = 12;

function parseKey(keyBase64: string | undefined): Buffer {
  if (!keyBase64) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY não configurada. Gere uma chave de 32 bytes em base64 e defina-a no Coolify.",
    );
  }
  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY inválida: são necessários exatamente 32 bytes em base64.",
    );
  }
  return key;
}

export function encryptToken(
  plaintext: string,
  keyBase64: string | undefined = process.env.TOKEN_ENCRYPTION_KEY,
): string {
  const key = parseKey(keyBase64);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptToken(
  encrypted: string,
  keyBase64: string | undefined = process.env.TOKEN_ENCRYPTION_KEY,
): string {
  const key = parseKey(keyBase64);
  const parts = encrypted.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Token armazenado em formato desconhecido.");
  }
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** Compara strings sem vazar tempo (para segredos de tamanho fixo). */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

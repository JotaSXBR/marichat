import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Assinatura de webhooks da Meta (X-Hub-Signature-256) e signed_request
 * usado no callback de exclusão de dados.
 *
 * Tudo é calculado sobre o corpo ORIGINAL da requisição, nunca sobre o JSON
 * reserializado.
 */

export function computeHubSignature256(
  rawBody: string | Buffer,
  appSecret: string,
): string {
  const digest = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  return `sha256=${digest}`;
}

export function verifyHubSignature256(
  rawBody: string | Buffer,
  header: string | null,
  appSecret: string,
): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = computeHubSignature256(rawBody, appSecret);
  const receivedBuffer = Buffer.from(header, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

export type SignedRequestPayload = {
  algorithm?: string;
  user_id?: string;
  issued_at?: number;
  [key: string]: unknown;
};

/**
 * Valida o signed_request da Meta e devolve o payload.
 * Retorna null para assinatura inválida ou payload malformado.
 */
export function parseSignedRequest(
  signedRequest: string,
  appSecret: string,
): SignedRequestPayload | null {
  const parts = signedRequest.split(".");
  if (parts.length !== 2) return null;
  const [encodedSignature, encodedPayload] = parts;
  if (!encodedSignature || !encodedPayload) return null;

  let receivedSignature: Buffer;
  let payloadJson: string;
  try {
    receivedSignature = Buffer.from(encodedSignature, "base64url");
    payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expectedSignature = createHmac("sha256", appSecret)
    .update(encodedPayload)
    .digest();

  if (
    receivedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(payloadJson) as SignedRequestPayload;
    if (payload.algorithm && payload.algorithm !== "HMAC-SHA256") return null;
    return payload;
  } catch {
    return null;
  }
}

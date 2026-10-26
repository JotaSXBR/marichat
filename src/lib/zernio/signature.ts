import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verificação da assinatura dos webhooks da Zernio.
 *
 * A Zernio envia `X-Zernio-Signature` com o HMAC-SHA256 (hexadecimal) do
 * corpo cru da requisição, usando o segredo informado na criação do endpoint.
 * O corpo precisa ser lido como texto e comparado **antes** do JSON.parse:
 * qualquer reserialização muda os bytes e invalida a assinatura.
 */
export function verifyZernioSignature(params: {
  rawBody: string;
  signature: string | null;
  secret: string;
}): boolean {
  const { rawBody, signature, secret } = params;
  if (!signature || !secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const received = signature.trim().toLowerCase();

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

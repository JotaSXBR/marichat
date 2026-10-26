/**
 * Configuração da integração com a Zernio.
 *
 * A Zernio é o "carteiro" alternativo: ela já tem app Meta aprovado, então
 * conectamos a conta dentro dela e não guardamos token da Meta. Toda a lógica
 * de automação (fila, porta de seguidor, cinco modos) continua no MARICHAT.
 *
 * Nenhum segredo é embutido: a chave e o segredo do webhook vêm do ambiente.
 */

export const ZERNIO = {
  /** `https://zernio.com/api`; sobrescrevível só para testes locais. */
  baseUrl: (
    process.env.ZERNIO_BASE_URL?.trim() || "https://zernio.com/api"
  ).replace(/\/+$/, ""),
  apiKey: process.env.ZERNIO_API_KEY?.trim() ?? "",
  webhookSecret: process.env.ZERNIO_WEBHOOK_SECRET?.trim() ?? "",
  requestTimeoutMs: 20_000,
  /** Eventos que o MARICHAT precisa receber. */
  webhookEvents: ["comment.received", "message.received"] as const,
};

export function isZernioConfigured(): boolean {
  return ZERNIO.apiKey.length > 0;
}

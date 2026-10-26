/**
 * Qual transporte está ativo.
 *
 * `meta`   = API oficial do Instagram com Instagram Login (padrão histórico).
 * `zernio` = API da Zernio, que já possui app Meta aprovado.
 *
 * O motor (fila, modos, prazos) é o mesmo; muda só quem entrega e quem avisa.
 */
export type MessagingProvider = "meta" | "zernio";

export function getMessagingProvider(): MessagingProvider {
  return process.env.MESSAGING_PROVIDER?.trim().toLowerCase() === "zernio"
    ? "zernio"
    : "meta";
}

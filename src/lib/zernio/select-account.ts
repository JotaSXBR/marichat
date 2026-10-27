import type { ZernioAccount } from "@/lib/zernio/client";

/**
 * Escolhe qual conta da Zernio será vinculada.
 *
 * - Se o formulário mandou um id, ele precisa existir na lista.
 * - Sem id, só dá para escolher sozinho quando existe exatamente uma conta;
 *   com duas ou mais, a pessoa precisa escolher na tela.
 */
export function chooseZernioAccount(
  accounts: readonly ZernioAccount[],
  requestedId: string,
): ZernioAccount | null {
  if (requestedId) {
    return accounts.find((item) => item.id === requestedId) ?? null;
  }
  return accounts.length === 1 ? accounts[0] : null;
}

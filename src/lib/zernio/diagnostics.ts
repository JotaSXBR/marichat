import "server-only";

import type { Account } from "@/lib/accounts";
import type { ConnectionTestResult } from "@/lib/instagram/diagnostics";
import { listInstagramAccounts } from "@/lib/zernio/client";
import { ZERNIO, isZernioConfigured } from "@/lib/zernio/config";

/**
 * Diagnóstico da conexão via Zernio.
 *
 * Reaproveita o formato exibido na página de Conexão, mas confere outras
 * coisas: a chave de API, se a conta ativa ainda aparece na Zernio e se o
 * segredo do webhook está configurado.
 */
export async function runZernioConnectionTest(
  account: Account | null,
): Promise<ConnectionTestResult> {
  const result: ConnectionTestResult = {
    checkedAt: new Date().toISOString(),
    tokenOk: false,
    username: null,
    instagramUserId: account?.instagramUserId ?? null,
    subscriptionChecked: false,
    subscribedFields: [],
    missingFields: [],
    problems: [],
  };

  if (!isZernioConfigured()) {
    result.problems.push(
      "A chave da Zernio não está configurada. Defina ZERNIO_API_KEY no servidor.",
    );
    return result;
  }

  if (!ZERNIO.webhookSecret) {
    result.problems.push(
      "O segredo do webhook não está configurado. Defina ZERNIO_WEBHOOK_SECRET.",
    );
  }

  try {
    const accounts = await listInstagramAccounts();
    result.tokenOk = true;
    result.subscriptionChecked = true;
    // Estes dois campos não existem no diagnóstico da Meta; usamos os campos
    // equivalentes para a página não precisar de outro tipo.
    result.subscribedFields = ZERNIO.webhookEvents.map((event) => event);

    if (accounts.length === 0) {
      result.problems.push(
        "A Zernio não devolveu nenhuma conta do Instagram conectada. Conecte a conta no painel da Zernio.",
      );
      return result;
    }

    if (!account) {
      result.problems.push(
        "Nenhuma conta está vinculada no MARICHAT. Use o botão de conectar para escolher a conta da Zernio.",
      );
      return result;
    }

    const match = accounts.find((item) => item.id === account.providerAccountId);
    if (!match) {
      result.problems.push(
        `A conta @${account.username} não aparece mais na Zernio (ou foi reconectada). Use "Conectar conta da Zernio" para atualizar o vínculo.`,
      );
      return result;
    }

    result.username = match.username;

    if (!match.isActive) {
      result.problems.push("A conta está marcada como inativa na Zernio.");
    }
    if (match.needsReconnection) {
      result.problems.push(
        "A Zernio informa que a conta precisa ser reconectada no painel dela.",
      );
    }
  } catch (error) {
    result.tokenOk = false;
    result.problems.push(
      `A Zernio recusou a consulta: ${
        error instanceof Error ? error.message : "erro desconhecido"
      }`,
    );
  }

  if (result.tokenOk && result.problems.length === 0) {
    result.missingFields = [];
  }

  return result;
}

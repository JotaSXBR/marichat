import "server-only";

import {
  getAccountToken,
  markAccountConnected,
  markAccountReconnectRequired,
  type Account,
} from "@/lib/accounts";
import {
  getMe,
  getSubscribedApps,
  InstagramApiError,
} from "@/lib/instagram/client";
import { IG } from "@/lib/instagram/config";

/**
 * Diagnóstico da conexão, usado pelo botão "Testar conexão" do painel.
 *
 * Confere duas coisas que o OAuth sozinho não garante:
 * 1. o token guardado ainda é aceito pela Meta;
 * 2. os campos de webhook realmente assinados na conta.
 *
 * A Meta não avisa quando uma inscrição é removida (por exemplo, ao trocar o
 * app no painel), então o teste é a forma prática de descobrir isso antes de
 * culpar o fluxo de comentários.
 */

export const CONNECTION_TEST_KEY = "last_connection_test";

export type ConnectionTestResult = {
  checkedAt: string;
  /** O token guardado foi aceito por GET /me. */
  tokenOk: boolean;
  username: string | null;
  instagramUserId: string | null;
  /** A leitura de /subscribed_apps respondeu. */
  subscriptionChecked: boolean;
  subscribedFields: string[];
  /** Campos exigidos que não apareceram na inscrição. */
  missingFields: string[];
  /** Mensagens prontas para exibir no painel. */
  problems: string[];
};

function emptyResult(): ConnectionTestResult {
  return {
    checkedAt: new Date().toISOString(),
    tokenOk: false,
    username: null,
    instagramUserId: null,
    subscriptionChecked: false,
    subscribedFields: [],
    missingFields: [],
    problems: [],
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof InstagramApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "erro desconhecido";
}

/** Lê o token guardado; se falhar, já registra a orientação no resultado. */
function readToken(
  account: Account,
  result: ConnectionTestResult,
): string | null {
  try {
    const accessToken = getAccountToken(account);
    result.tokenOk = true;
    return accessToken;
  } catch {
    result.problems.push(
      "Não foi possível ler o token guardado. Reconecte o Instagram.",
    );
    return null;
  }
}

/** Confere se a Meta ainda aceita o token e se ele é da conta salva. */
async function verifyToken(
  account: Account,
  accessToken: string,
  result: ConnectionTestResult,
): Promise<void> {
  try {
    const me = await getMe(accessToken);
    result.username = me.username;
    result.instagramUserId = me.userId;
    if (me.userId !== account.instagramUserId) {
      result.problems.push(
        `O token pertence a @${me.username} (ID ${me.userId}), mas a conta salva usa o ID ${account.instagramUserId}. Reconecte para corrigir.`,
      );
    }
  } catch (error) {
    result.tokenOk = false;
    result.problems.push(
      `A Meta recusou o token: ${errorMessage(error)}. Reconecte a conta.`,
    );
    if (error instanceof InstagramApiError && error.authProblem) {
      await markAccountReconnectRequired(account.id);
    }
  }
}

async function verifySubscriptions(
  account: Account,
  accessToken: string,
  result: ConnectionTestResult,
): Promise<void> {
  try {
    const apps = await getSubscribedApps({
      igUserId: account.instagramUserId,
      accessToken,
    });
    const fields = new Set(apps.flatMap((app) => app.subscribedFields));
    result.subscriptionChecked = true;
    result.subscribedFields = [...fields].sort();
    result.missingFields = IG.webhookFields.filter(
      (field) => !fields.has(field),
    );

    if (result.missingFields.length > 0) {
      result.problems.push(
        `Faltam campos de webhook: ${result.missingFields.join(", ")}. Use "Reassinar webhooks" e confira no painel da Meta se o app está com esses campos ativos.`,
      );
    }
  } catch (error) {
    result.problems.push(
      `Não foi possível conferir os webhooks: ${errorMessage(error)}.`,
    );
    if (error instanceof InstagramApiError && error.authProblem) {
      await markAccountReconnectRequired(account.id);
    }
  }
}

async function markConnectedWhenClean(
  account: Account,
  result: ConnectionTestResult,
): Promise<void> {
  const clean =
    result.tokenOk &&
    result.subscriptionChecked &&
    result.missingFields.length === 0 &&
    result.problems.length === 0;
  if (clean) await markAccountConnected(account.id);
}

export async function runConnectionTest(
  account: Account,
): Promise<ConnectionTestResult> {
  const result = emptyResult();
  const accessToken = readToken(account, result);

  if (accessToken) {
    await verifyToken(account, accessToken, result);
  }
  if (accessToken && result.tokenOk) {
    await verifySubscriptions(account, accessToken, result);
  }

  await markConnectedWhenClean(account, result);
  return result;
}

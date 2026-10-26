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

export async function runConnectionTest(
  account: Account,
): Promise<ConnectionTestResult> {
  const result: ConnectionTestResult = {
    checkedAt: new Date().toISOString(),
    tokenOk: false,
    username: null,
    instagramUserId: null,
    subscriptionChecked: false,
    subscribedFields: [],
    missingFields: [],
    problems: [],
  };

  let accessToken: string | null = null;
  try {
    accessToken = getAccountToken(account);
    result.tokenOk = true;
  } catch {
    result.problems.push(
      "Não foi possível ler o token guardado. Reconecte o Instagram.",
    );
  }

  if (accessToken) {
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

  if (accessToken && result.tokenOk) {
    try {
      const apps = await getSubscribedApps({
        igUserId: account.instagramUserId,
        accessToken,
      });
      const fields = new Set<string>();
      for (const app of apps) {
        for (const field of app.subscribedFields) fields.add(field);
      }
      result.subscriptionChecked = true;
      result.subscribedFields = [...fields].sort();
      result.missingFields = IG.webhookFields.filter((field) => !fields.has(field));

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

  if (
    result.tokenOk &&
    result.subscriptionChecked &&
    result.missingFields.length === 0 &&
    result.problems.length === 0
  ) {
    await markAccountConnected(account.id);
  }

  return result;
}

function errorMessage(error: unknown): string {
  if (error instanceof InstagramApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "erro desconhecido";
}

import "server-only";

import {
  getActiveAccount,
  getAppStateValue,
  markAccountReconnectRequired,
  setAppStateValue,
} from "@/lib/accounts";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { getDb } from "@/lib/db/client";
import { instagramAccounts } from "@/lib/db/schema";
import {
  InstagramApiError,
  refreshLongLivedToken,
} from "@/lib/instagram/client";
import { IG } from "@/lib/instagram/config";
import { markFailed } from "@/lib/queue/job-state";
import type {
  AccountRow,
  InteractionRow,
  JobOutcome,
  JobRow,
} from "@/lib/queue/types";
import { eq } from "drizzle-orm";

const REFRESH_BACKOFF_MS = 60 * 60 * 1000;

export type AccountToken = { token: string | null } | { outcome: JobOutcome };

/**
 * Token da Meta para enviar/consultar em nome da conta. Na Zernio não há token
 * nosso (`null`); se o token guardado não abrir, a conta precisa reconectar.
 */
export async function readAccountToken(
  job: JobRow,
  account: AccountRow,
  interaction: InteractionRow,
): Promise<AccountToken> {
  if (account.provider === "zernio") return { token: null };

  try {
    return { token: decryptToken(account.accessTokenEncrypted) };
  } catch {
    await markAccountReconnectRequired(account.id);
    await markFailed(
      job,
      interaction,
      "Não foi possível ler o token guardado. Reconecte o Instagram.",
      "TOKEN_UNREADABLE",
    );
    return { outcome: "failed" };
  }
}

/** Já é cedo demais (ou não há token) para renovar? */
function isTooEarlyToRefresh(account: AccountRow, now: number): boolean {
  if (!account.tokenExpiresAt) return true;
  if (account.tokenExpiresAt.getTime() - now > IG.tokenRefreshLeadMs) {
    return true;
  }
  if (
    account.lastTokenRefreshAt &&
    now - account.lastTokenRefreshAt.getTime() < IG.tokenRefreshMinAgeMs
  ) {
    return true;
  }
  return false;
}

async function saveRefreshedToken(
  account: AccountRow,
  accessToken: string,
  expiresInSeconds: number,
  now: number,
): Promise<void> {
  const db = getDb();
  await db
    .update(instagramAccounts)
    .set({
      accessTokenEncrypted: encryptToken(accessToken),
      tokenExpiresAt: new Date(now + expiresInSeconds * 1000),
      lastTokenRefreshAt: new Date(now),
      connectionStatus: "connected",
      lastVerifiedAt: new Date(now),
      updatedAt: new Date(now),
    })
    .where(eq(instagramAccounts.id, account.id));

  await setAppStateValue("token_refresh_failed_at", null);
  await setAppStateValue("last_token_refresh_at", new Date(now).toISOString());
}

/**
 * Renova o token de longa duração preventivamente (quando faltam menos de
 * 10 dias), respeitando a idade mínima de 24h e um backoff de 1h em falhas.
 */
export async function refreshTokenIfNeeded(): Promise<{
  refreshed: boolean;
  error?: string;
}> {
  const account = await getActiveAccount();
  if (!account || account.connectionStatus !== "connected") {
    return { refreshed: false };
  }
  // A Zernio cuida do token da Meta: não há token nosso para renovar.
  if (account.provider === "zernio") return { refreshed: false };

  const now = Date.now();
  if (isTooEarlyToRefresh(account, now)) return { refreshed: false };

  const failedAt = await getAppStateValue<number>("token_refresh_failed_at");
  if (failedAt && now - failedAt < REFRESH_BACKOFF_MS) {
    return { refreshed: false };
  }

  try {
    const currentToken = decryptToken(account.accessTokenEncrypted);
    const refreshed = await refreshLongLivedToken(currentToken);
    await saveRefreshedToken(
      account,
      refreshed.accessToken,
      refreshed.expiresInSeconds,
      now,
    );
    return { refreshed: true };
  } catch (error) {
    await setAppStateValue("token_refresh_failed_at", now);
    if (error instanceof InstagramApiError && error.authProblem) {
      await markAccountReconnectRequired(account.id);
    }
    return {
      refreshed: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}

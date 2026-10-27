import "server-only";

import { randomBytes } from "node:crypto";

import { eq } from "drizzle-orm";

import { setAppStateValue } from "@/lib/accounts";
import { encryptToken } from "@/lib/crypto";
import { getDb } from "@/lib/db/client";
import { instagramAccounts } from "@/lib/db/schema";
import { requireEnv } from "@/lib/env";
import {
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getMe,
  subscribeWebhooks,
  type InstagramMe,
} from "@/lib/instagram/client";
import { IG } from "@/lib/instagram/config";

/**
 * Login oficial do Instagram (Business Login for Instagram).
 *
 * 1. /api/auth/instagram/start cria um `state` aleatório e o guarda em cookie.
 * 2. O Instagram devolve o `code` para /api/auth/instagram/callback.
 * 3. Trocamos o code por um token curto, depois por um token de 60 dias.
 * 4. O token é cifrado (AES-256-GCM) antes de ir para o banco.
 * 5. Assinamos os webhooks de comentários e mensagens da conta.
 */

export const STATE_COOKIE = "marichat_ig_oauth_state";
export const STATE_TTL_SECONDS = 10 * 60;

export function createOAuthState(): string {
  return randomBytes(32).toString("base64url");
}

export function getRedirectUri(): string {
  const configured = process.env.INSTAGRAM_OAUTH_REDIRECT_URI?.trim();
  if (configured) return configured;
  const appUrl = requireEnv("APP_URL").replace(/\/+$/, "");
  return `${appUrl}/api/auth/instagram/callback`;
}

export function buildAuthorizeUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(IG.oauthAuthorizeUrl);
  url.searchParams.set("client_id", params.appId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", IG.scopes.join(","));
  url.searchParams.set("state", params.state);
  return url.toString();
}

export type OAuthResult = {
  username: string;
  instagramUserId: string;
  webhookSubscribed: boolean;
  webhookError?: string;
};

/** Troca o `code` pelos tokens e confere se os IDs da Meta coincidem. */
async function exchangeTokens(params: {
  code: string;
  redirectUri: string;
  appSecret: string;
}): Promise<{
  me: InstagramMe;
  longLived: { accessToken: string; expiresInSeconds: number };
}> {
  const appId = requireEnv("INSTAGRAM_APP_ID");

  const shortLived = await exchangeCodeForToken({
    appId,
    appSecret: params.appSecret,
    code: params.code,
    redirectUri: params.redirectUri,
  });

  const longLived = await exchangeForLongLivedToken({
    appSecret: params.appSecret,
    shortLivedToken: shortLived.accessToken,
  });

  const me = await getMe(longLived.accessToken);

  // O ID devolvido na troca do código deve ser o mesmo do /me.
  if (String(me.userId) !== String(shortLived.userId)) {
    throw new Error(
      "A Meta retornou identificadores diferentes para a mesma conta. Tente conectar novamente.",
    );
  }

  return { me, longLived };
}

/** Grava (ou atualiza) a conta da Meta com o token cifrado. */
async function saveAccount(params: {
  me: InstagramMe;
  accessToken: string;
  expiresAt: Date;
  now: Date;
}): Promise<void> {
  const encrypted = encryptToken(params.accessToken);
  const base = {
    provider: "meta" as const,
    username: params.me.username,
    accessTokenEncrypted: encrypted,
    tokenExpiresAt: params.expiresAt,
    connectionStatus: "connected",
    lastVerifiedAt: params.now,
    updatedAt: params.now,
  };
  const db = getDb();
  await db
    .insert(instagramAccounts)
    .values({
      ...base,
      instagramUserId: params.me.userId,
    })
    .onConflictDoUpdate({
      target: instagramAccounts.instagramUserId,
      set: { ...base, providerAccountId: null },
    });

  const [account] = await db
    .select()
    .from(instagramAccounts)
    .where(eq(instagramAccounts.instagramUserId, params.me.userId))
    .limit(1);

  if (!account) {
    throw new Error("Não foi possível salvar a conta do Instagram.");
  }
}

/** Assina os webhooks e registra o resultado no estado do app. */
async function subscribeAccount(params: {
  igUserId: string;
  accessToken: string;
  now: Date;
}): Promise<{ webhookSubscribed: boolean; webhookError?: string }> {
  try {
    await subscribeWebhooks({
      igUserId: params.igUserId,
      accessToken: params.accessToken,
    });
    await setAppStateValue("webhook_subscription_error", null);
    await setAppStateValue("webhook_subscribed_at", params.now.toISOString());
    return { webhookSubscribed: true };
  } catch (error) {
    const webhookError =
      error instanceof Error
        ? error.message
        : "Erro desconhecido ao assinar webhooks.";
    await setAppStateValue("webhook_subscription_error", webhookError);
    console.error("[oauth] falha ao assinar webhooks:", error);
    return { webhookSubscribed: false, webhookError };
  }
}

export async function completeOAuth(params: {
  code: string;
  redirectUri: string;
}): Promise<OAuthResult> {
  const appSecret = requireEnv("INSTAGRAM_APP_SECRET");
  const now = new Date();
  const { me, longLived } = await exchangeTokens({
    code: params.code,
    redirectUri: params.redirectUri,
    appSecret,
  });
  const expiresAt = new Date(now.getTime() + longLived.expiresInSeconds * 1000);

  await saveAccount({
    me,
    accessToken: longLived.accessToken,
    expiresAt,
    now,
  });

  const webhook = await subscribeAccount({
    igUserId: me.userId,
    accessToken: longLived.accessToken,
    now,
  });

  return {
    username: me.username,
    instagramUserId: me.userId,
    ...webhook,
  };
}

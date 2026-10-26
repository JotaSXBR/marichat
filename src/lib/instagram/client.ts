import { IG } from "./config";

/**
 * Cliente mínimo da Instagram API com Instagram Login.
 * Nenhum segredo é embutido aqui: app id/secret e token chegam por parâmetro.
 */

export class InstagramApiError extends Error {
  readonly status: number;
  readonly code?: number;
  readonly subcode?: number;

  constructor(
    message: string,
    status: number,
    code?: number,
    subcode?: number,
  ) {
    super(message);
    this.name = "InstagramApiError";
    this.status = status;
    this.code = code;
    this.subcode = subcode;
  }

  /** Falhas em que faz sentido tentar de novo mais tarde. */
  get retryable(): boolean {
    return (
      this.status === 429 ||
      this.status >= 500 ||
      this.code === 4 ||
      this.code === 613 ||
      this.code === 2
    );
  }

  /** Token revogado, expirado ou sem permissão: exigem reconexão. */
  get authProblem(): boolean {
    return this.status === 401 || this.status === 403 || this.code === 190;
  }
}

type GraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  error_type?: string;
  error_message?: string;
  code?: number;
};

async function requestJson(
  url: string,
  init: RequestInit,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(IG.requestTimeoutMs),
  });

  const raw = await response.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const body = (parsed ?? {}) as GraphErrorBody;
    const message =
      body.error?.message ??
      body.error_message ??
      `A API do Instagram respondeu HTTP ${response.status}.`;
    throw new InstagramApiError(
      message,
      response.status,
      body.error?.code ?? body.code,
      body.error?.error_subcode,
    );
  }

  return parsed;
}

function pickItem<T>(value: unknown): T | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.data)) {
    return (record.data[0] as T) ?? null;
  }
  return value as T;
}

export type InstagramMe = {
  userId: string;
  username: string;
  accountType?: string;
};

export async function getMe(accessToken: string): Promise<InstagramMe> {
  const url = new URL(`${IG.graphBaseUrl}/${IG.apiVersion}/me`);
  url.searchParams.set("fields", "user_id,username,account_type");
  url.searchParams.set("access_token", accessToken);

  const data = await requestJson(url.toString(), { method: "GET" });
  const item = pickItem<{
    user_id?: string;
    id?: string;
    username?: string;
    account_type?: string;
  }>(data);

  const userId = item?.user_id ?? item?.id;
  if (!userId || !item?.username) {
    throw new InstagramApiError(
      "Não foi possível obter o usuário do Instagram a partir do token.",
      502,
    );
  }
  return {
    userId,
    username: item.username,
    accountType: item.account_type,
  };
}

export type InstagramMedia = {
  id: string;
  caption?: string;
  mediaType?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  timestamp?: string;
};

export async function listRecentMedia(
  accessToken: string,
  limit = 25,
): Promise<InstagramMedia[]> {
  const url = new URL(`${IG.graphBaseUrl}/${IG.apiVersion}/me/media`);
  url.searchParams.set(
    "fields",
    "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
  );
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));
  url.searchParams.set("access_token", accessToken);

  const data = await requestJson(url.toString(), { method: "GET" });
  const list = (data as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(list)) return [];

  return list.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (typeof item.id !== "string") return [];
    return [
      {
        id: item.id,
        caption: typeof item.caption === "string" ? item.caption : undefined,
        mediaType:
          typeof item.media_type === "string" ? item.media_type : undefined,
        mediaUrl:
          typeof item.media_url === "string" ? item.media_url : undefined,
        // Vídeos têm media_url apontando para o vídeo; a miniatura vem em
        // thumbnail_url e pode estar ausente em alguns tipos de mídia.
        thumbnailUrl:
          typeof item.thumbnail_url === "string"
            ? item.thumbnail_url
            : undefined,
        permalink:
          typeof item.permalink === "string" ? item.permalink : undefined,
        timestamp:
          typeof item.timestamp === "string" ? item.timestamp : undefined,
      },
    ];
  });
}

export type InstagramUserProfile = {
  id: string;
  username?: string;
  name?: string;
  /** true = segue o perfil; false = não segue; null = a Meta não informou. */
  isFollowing: boolean | null;
  /** Erro devolvido pela Meta (ex.: consentimento ainda não dado). */
  error?: string;
};

/**
 * Consulta o perfil de quem conversa (Instagram User Profile API).
 *
 * A Meta só entrega esses dados depois que a pessoa envia uma mensagem para a
 * conta. Qualquer falha vira "desconhecido" (null): o fluxo nunca deve impedir
 * a pessoa de receber o link por causa de uma consulta indisponível.
 */
export async function getUserProfile(params: {
  accessToken: string;
  igsid: string;
}): Promise<InstagramUserProfile> {
  const url = new URL(
    `${IG.graphBaseUrl}/${IG.apiVersion}/${encodeURIComponent(params.igsid)}`,
  );
  url.searchParams.set("fields", "id,username,name,is_user_follow_business");
  url.searchParams.set("access_token", params.accessToken);

  try {
    const data = await requestJson(url.toString(), { method: "GET" });
    const item = (data ?? {}) as {
      id?: string;
      username?: string;
      name?: string;
      is_user_follow_business?: boolean | string;
    };
    const following =
      typeof item.is_user_follow_business === "boolean"
        ? item.is_user_follow_business
        : item.is_user_follow_business === "true"
          ? true
          : item.is_user_follow_business === "false"
            ? false
            : null;

    return {
      id: item.id ?? params.igsid,
      username: item.username,
      name: item.name,
      isFollowing: following,
    };
  } catch (error) {
    const message =
      error instanceof InstagramApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro desconhecido";
    return { id: params.igsid, isFollowing: null, error: message };
  }
}

export type TokenExchangeResult = {
  accessToken: string;
  userId: string;
};

export async function exchangeCodeForToken(params: {
  appId: string;
  appSecret: string;
  code: string;
  redirectUri: string;
}): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    client_id: params.appId,
    client_secret: params.appSecret,
    grant_type: "authorization_code",
    redirect_uri: params.redirectUri,
    code: params.code,
  });

  const data = await requestJson(IG.oauthTokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  const item = pickItem<{
    access_token?: string;
    user_id?: string | number;
  }>(data);

  if (!item?.access_token || item.user_id === undefined) {
    throw new InstagramApiError(
      "A troca do código de autorização não retornou um token válido.",
      502,
    );
  }

  return {
    accessToken: item.access_token,
    userId: String(item.user_id),
  };
}

export async function exchangeForLongLivedToken(params: {
  appSecret: string;
  shortLivedToken: string;
}): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const url = new URL(IG.longLivedTokenUrl);
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", params.appSecret);
  url.searchParams.set("access_token", params.shortLivedToken);

  const data = await requestJson(url.toString(), { method: "GET" });
  const item = data as {
    access_token?: string;
    expires_in?: number;
  } | null;

  if (!item?.access_token) {
    throw new InstagramApiError(
      "A Meta não retornou o token de longa duração.",
      502,
    );
  }

  return {
    accessToken: item.access_token,
    expiresInSeconds:
      typeof item.expires_in === "number" ? item.expires_in : 60 * 24 * 3600,
  };
}

export async function refreshLongLivedToken(
  accessToken: string,
): Promise<{ accessToken: string; expiresInSeconds: number }> {
  const url = new URL(IG.refreshTokenUrl);
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", accessToken);

  const data = await requestJson(url.toString(), { method: "GET" });
  const item = data as {
    access_token?: string;
    expires_in?: number;
  } | null;

  if (!item?.access_token) {
    throw new InstagramApiError(
      "A Meta não retornou o token renovado.",
      502,
    );
  }

  return {
    accessToken: item.access_token,
    expiresInSeconds:
      typeof item.expires_in === "number" ? item.expires_in : 60 * 24 * 3600,
  };
}

export async function subscribeWebhooks(params: {
  igUserId: string;
  accessToken: string;
}): Promise<void> {
  const url = new URL(
    `${IG.graphBaseUrl}/${IG.apiVersion}/${params.igUserId}/subscribed_apps`,
  );
  url.searchParams.set("subscribed_fields", IG.webhookFields.join(","));

  await requestJson(url.toString(), {
    method: "POST",
    headers: { authorization: `Bearer ${params.accessToken}` },
  });
}

export type SubscribedApp = {
  id?: string;
  name?: string;
  subscribedFields: string[];
};

/**
 * Lê os campos de webhook realmente assinados para a conta.
 *
 * `POST /subscribed_apps` devolve apenas `{"success": true}`: ele não confirma
 * quais campos ficaram ativos. A leitura é a única forma de conferir, depois da
 * conexão, se `comments`, `messages` e `messaging_postbacks` chegaram à Meta.
 */
export async function getSubscribedApps(params: {
  igUserId: string;
  accessToken: string;
}): Promise<SubscribedApp[]> {
  const url = new URL(
    `${IG.graphBaseUrl}/${IG.apiVersion}/${encodeURIComponent(params.igUserId)}/subscribed_apps`,
  );
  url.searchParams.set("access_token", params.accessToken);

  const data = await requestJson(url.toString(), { method: "GET" });
  const list = (data as { data?: unknown[] } | null)?.data;
  if (!Array.isArray(list)) return [];

  return list.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    const fields = Array.isArray(item.subscribed_fields)
      ? item.subscribed_fields.filter(
          (field): field is string => typeof field === "string",
        )
      : [];
    return [
      {
        id: typeof item.id === "string" ? item.id : undefined,
        name: typeof item.name === "string" ? item.name : undefined,
        subscribedFields: fields,
      },
    ];
  });
}

export type SentMessage = { messageId: string; recipientId?: string };

export async function sendMessage(params: {
  igUserId: string;
  accessToken: string;
  body: unknown;
}): Promise<SentMessage> {
  const url = new URL(
    `${IG.graphBaseUrl}/${IG.apiVersion}/${params.igUserId}/messages`,
  );

  const data = await requestJson(url.toString(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${params.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(params.body),
  });

  const item = data as {
    message_id?: string;
    recipient_id?: string;
  } | null;

  if (!item?.message_id) {
    throw new InstagramApiError(
      "A Meta aceitou a requisição, mas não retornou o ID da mensagem.",
      502,
    );
  }

  return {
    messageId: item.message_id,
    recipientId: item.recipient_id,
  };
}

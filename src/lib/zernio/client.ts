import { ZERNIO } from "@/lib/zernio/config";
import type { ZernioButton } from "@/lib/outbound";

/**
 * Cliente mínimo da API da Zernio.
 *
 * Cobre só o que o MARICHAT usa: listar contas, responder um comentário em
 * privado, enviar mensagem numa conversa e consultar o status de seguidor.
 * A autenticação é `Authorization: Bearer <chave>`.
 */

export class ZernioApiError extends Error {
  readonly status: number;
  readonly code?: string;
  /** Contexto extra, como `privateReplyConsumed` ou `privateReplyOutcome`. */
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ZernioApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** Falhas em que faz sentido tentar de novo mais tarde. */
  get retryable(): boolean {
    return (
      this.status === 429 ||
      this.status >= 500 ||
      this.code === "rate_limit_error"
    );
  }

  /** Chave inválida/expirada ou conta removida: exige reconexão. */
  get authProblem(): boolean {
    return this.status === 401;
  }

  /** A resposta privada deste comentário já foi gasta. Nunca repetir. */
  get privateReplyConsumed(): boolean {
    return this.details?.privateReplyConsumed === true;
  }

  /** A Zernio/Meta falhou depois de receber: pode ter sido entregue. */
  get outcomeUnknown(): boolean {
    return this.details?.privateReplyOutcome === "unknown";
  }
}

type ZernioErrorBody = {
  error?: string;
  type?: string;
  code?: string;
  details?: Record<string, unknown>;
};

async function requestJson(
  path: string,
  init: RequestInit & { idempotencyKey?: string } = {},
): Promise<unknown> {
  if (!ZERNIO.apiKey) {
    throw new ZernioApiError(
      "A chave da Zernio não está configurada (ZERNIO_API_KEY).",
      500,
      "missing_api_key",
    );
  }

  const { idempotencyKey, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set("authorization", `Bearer ${ZERNIO.apiKey}`);
  headers.set("accept", "application/json");
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
  if (rest.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(`${ZERNIO.baseUrl}${path}`, {
      ...rest,
      headers,
      signal: AbortSignal.timeout(ZERNIO.requestTimeoutMs),
    });
  } catch (error) {
    // Timeout/rede: quem chama trata como "resultado desconhecido".
    throw new ZernioApiError(
      error instanceof Error
        ? `Não foi possível falar com a Zernio: ${error.message}`
        : "Não foi possível falar com a Zernio.",
      0,
      "network_error",
    );
  }

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
    const body = (parsed ?? {}) as ZernioErrorBody;
    throw new ZernioApiError(
      body.error ?? `A Zernio respondeu HTTP ${response.status}.`,
      response.status,
      body.code,
      body.details,
    );
  }

  return parsed;
}

export type ZernioAccount = {
  id: string;
  username: string | null;
  platformUserId: string | null;
  /** ID profissional do Instagram (`17841...`), quando informado. */
  instagramScopedId: string | null;
  isActive: boolean;
  needsReconnection: boolean;
};

/** Contas do Instagram conectadas dentro da Zernio. */
export async function listInstagramAccounts(): Promise<ZernioAccount[]> {
  const data = await requestJson("/v1/accounts?platform=instagram", {
    method: "GET",
  });

  const list = (data as { accounts?: unknown[] } | null)?.accounts;
  if (!Array.isArray(list)) return [];

  return list.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    if (typeof item._id !== "string") return [];
    const metadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>)
        : {};
    return [
      {
        id: item._id,
        username: typeof item.username === "string" ? item.username : null,
        platformUserId:
          typeof item.platformUserId === "string" ? item.platformUserId : null,
        instagramScopedId:
          typeof metadata.instagramScopedId === "string"
            ? metadata.instagramScopedId
            : null,
        isActive: item.isActive !== false,
        needsReconnection: item.needsReconnection === true,
      },
    ];
  });
}

export type ZernioSentMessage = {
  messageId: string;
  conversationId?: string;
};

/**
 * Resposta privada a um comentário (a nossa DM 1).
 *
 * `postId` é o ID da mídia na Meta, então funciona também em posts que não
 * foram publicados pela Zernio.
 */
export async function sendPrivateReply(params: {
  accountId: string;
  postId: string;
  commentId: string;
  message: string;
  buttons?: ZernioButton[];
  idempotencyKey?: string;
}): Promise<ZernioSentMessage> {
  const data = await requestJson(
    `/v1/inbox/comments/${encodeURIComponent(params.postId)}/${encodeURIComponent(params.commentId)}/private-reply`,
    {
      method: "POST",
      body: JSON.stringify({
        accountId: params.accountId,
        message: params.message,
        ...(params.buttons ? { buttons: params.buttons } : {}),
      }),
      idempotencyKey: params.idempotencyKey,
    },
  );

  const item = data as {
    status?: string;
    messageId?: string;
    commentId?: string;
  } | null;

  if (!item?.messageId) {
    throw new ZernioApiError(
      "A Zernio aceitou a resposta privada, mas não retornou o ID da mensagem.",
      502,
    );
  }

  return { messageId: item.messageId };
}

/** Mensagem em uma conversa já aberta (DM 2, porta de seguidor, reenvios). */
export async function sendConversationMessage(params: {
  accountId: string;
  conversationId: string;
  message: string;
  buttons?: ZernioButton[];
  idempotencyKey?: string;
}): Promise<ZernioSentMessage> {
  const data = await requestJson(
    `/v1/inbox/conversations/${encodeURIComponent(params.conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({
        accountId: params.accountId,
        message: params.message,
        ...(params.buttons ? { buttons: params.buttons } : {}),
      }),
      idempotencyKey: params.idempotencyKey,
    },
  );

  const item = data as {
    data?: { messageId?: string; conversationId?: string };
    message?: { id?: string };
  } | null;

  const messageId = item?.data?.messageId ?? item?.message?.id;
  if (!messageId) {
    throw new ZernioApiError(
      "A Zernio aceitou a mensagem, mas não retornou o ID.",
      502,
    );
  }

  return {
    messageId,
    conversationId: item?.data?.conversationId,
  };
}

export type ZernioFollowStatus = {
  /** true segue, false não segue, null = a Meta não informou. */
  isFollowing: boolean | null;
  unavailableReason?: string;
};

/**
 * Status de seguidor sob demanda.
 *
 * A Meta só responde para quem já mandou mensagem (consentimento). Quando não
 * dá para saber, a Zernio devolve 200 com `isFollower: null` — tratamos como
 * "desconhecido", nunca como "não segue".
 */
export async function getFollowStatus(params: {
  accountId: string;
  userId: string;
  refresh?: boolean;
}): Promise<ZernioFollowStatus> {
  const search = params.refresh ? "?refresh=true" : "";
  const path = `/v1/accounts/${encodeURIComponent(params.accountId)}/follow-status/${encodeURIComponent(params.userId)}${search}`;

  const data = await requestJson(path, { method: "GET" });
  const item = data as {
    isFollower?: boolean | null;
    unavailableReason?: string;
  } | null;

  return {
    isFollowing:
      typeof item?.isFollower === "boolean" ? item.isFollower : null,
    unavailableReason: item?.unavailableReason,
  };
}

export type ZernioWebhookSettings = {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
};

/** Cria o endpoint de webhook da Zernio apontando para este app. */
export async function createWebhookSettings(params: {
  name: string;
  url: string;
  secret: string;
  events: readonly string[];
}): Promise<ZernioWebhookSettings> {
  const data = await requestJson("/v1/webhooks/settings", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      url: params.url,
      secret: params.secret,
      events: params.events,
    }),
  });

  const item = data as {
    webhook?: { _id?: string; url?: string; events?: string[]; isActive?: boolean };
  } | null;

  return {
    id: item?.webhook?._id ?? "",
    url: item?.webhook?.url ?? params.url,
    events: item?.webhook?.events ?? [...params.events],
    isActive: item?.webhook?.isActive !== false,
  };
}

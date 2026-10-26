/**
 * Configuração central da integração com a Meta (Instagram API com Instagram Login).
 *
 * A versão da Graph API NÃO é fixada por suposição: em outubro/2026 a versão
 * documentada é v26.0. Ela pode ser sobrescrita por INSTAGRAM_API_VERSION sem
 * alterar código. Os endpoints e escopos ficam todos aqui.
 */

export const INSTAGRAM_API_VERSION =
  process.env.INSTAGRAM_API_VERSION?.trim() || "v26.0";

export const IG = {
  apiVersion: INSTAGRAM_API_VERSION,
  graphBaseUrl: "https://graph.instagram.com",
  oauthAuthorizeUrl: "https://www.instagram.com/oauth/authorize",
  oauthTokenUrl: "https://api.instagram.com/oauth/access_token",
  longLivedTokenUrl: "https://graph.instagram.com/access_token",
  refreshTokenUrl: "https://graph.instagram.com/refresh_access_token",

  scopes: [
    "instagram_business_basic",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
  ],

  webhookFields: ["comments", "messages"] as const,

  /** Respostas privadas a comentários: 7 dias a partir do comentário. */
  privateReplyWindowMs: 7 * 24 * 60 * 60 * 1000,
  /** Margem de segurança para não tentar enviar no limite exato do prazo. */
  privateReplySafetyMs: 2 * 60 * 1000,
  /** Janela de mensageria aberta quando o usuário responde. */
  messagingWindowMs: 24 * 60 * 60 * 1000,

  /** Renovação preventiva: renova quando faltar menos que isso para expirar. */
  tokenRefreshLeadMs: 10 * 24 * 60 * 60 * 1000,
  /** Token de longa duração só pode ser renovado após 24h de vida. */
  tokenRefreshMinAgeMs: 24 * 60 * 60 * 1000,

  requestTimeoutMs: 15_000,
  maxSendAttempts: 3,
  /** Espera progressiva após a 1ª e a 2ª falha recuperável. */
  retryDelaysMs: [60_000, 5 * 60_000] as const,
} as const;

export const LIMITS = {
  /** Texto de mensagem: 1.000 bytes UTF-8. */
  messageTextBytes: 1000,
  /** Título de quick reply: 20 caracteres. */
  quickReplyTitleChars: 20,
  /** Título de elemento de template genérico: 80 caracteres. */
  templateTitleChars: 80,
  /** Título de botão: 20 caracteres. */
  buttonTitleChars: 20,
  /** URL precisa ser HTTPS válida. */
  urlMaxChars: 2000,
} as const;

/**
 * Configuração central da integração com a Meta (Instagram API com Instagram Login).
 *
 * A versão da Graph API NÃO é fixada por suposição: em outubro/2026 a versão
 * documentada é v26.0. Ela pode ser sobrescrita por INSTAGRAM_API_VERSION sem
 * alterar código. Os endpoints e escopos ficam todos aqui.
 */

export const INSTAGRAM_API_VERSION =
  process.env.INSTAGRAM_API_VERSION?.trim() || "v26.0";

/**
 * Só existe para o teste local com a API simulada (`npm run demo:local`).
 * Em produção é sempre ignorada: o endereço oficial não pode ser trocado
 * por variável de ambiente.
 */
const localGraphOverride =
  process.env.NODE_ENV === "production"
    ? undefined
    : process.env.INSTAGRAM_GRAPH_BASE_URL?.trim();

export const IG = {
  apiVersion: INSTAGRAM_API_VERSION,
  graphBaseUrl: localGraphOverride || "https://graph.instagram.com",
  oauthAuthorizeUrl: "https://www.instagram.com/oauth/authorize",
  oauthTokenUrl: "https://api.instagram.com/oauth/access_token",
  longLivedTokenUrl: "https://graph.instagram.com/access_token",
  refreshTokenUrl: "https://graph.instagram.com/refresh_access_token",

  scopes: [
    "instagram_business_basic",
    "instagram_business_manage_comments",
    "instagram_business_manage_messages",
  ],

  webhookFields: ["comments", "messages", "messaging_postbacks"] as const,

  /**
   * Espera antes de reconsultar o perfil após o toque em "Já segui".
   *
   * A Meta demora alguns segundos para refletir um follow novo em
   * `is_user_follow_business` (medido em projetos de referência: ~17s e ~68s).
   * Consultar na hora devolveria "não segue" para quem acabou de seguir.
   */
  followCheckDelayMs: 20_000,

  /**
   * Teto de consultas ao perfil no modo "travado".
   *
   * O modo tolerante libera o link após 2 checagens. No travado não há
   * liberação automática: cada toque em "Já segui" reconsulta o perfil, até
   * este teto. Depois disso a conversa fica retida (expira com a janela de
   * 24h), para não insistir indefinidamente com a Meta.
   */
  maxLockedFollowChecks: 6,

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
  /** Título de elemento de template genérico: 80 caracteres. */
  templateTitleChars: 80,
  /** Título de botão: 20 caracteres. */
  buttonTitleChars: 20,
  /** URL precisa ser HTTPS válida. */
  urlMaxChars: 2000,
} as const;

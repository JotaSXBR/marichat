import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Estrutura mínima do MVP, já preparada para múltiplas contas no futuro
 * (todas as tabelas operacionais apontam para instagram_accounts), mas sem
 * qualquer tela ou fluxo multi-conta implementado agora.
 */

export const instagramAccounts = pgTable(
  "instagram_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * De onde vêm os eventos e por onde saem as mensagens:
     * `meta` = API oficial com Instagram Login (token próprio);
     * `zernio` = API da Zernio (app Meta aprovado por ela, sem token nosso).
     */
    provider: text("provider").notNull().default("meta"),
    /** ID da conta do Instagram na API oficial. */
    instagramUserId: text("instagram_user_id").notNull(),
    /** ID da conta na Zernio (`accountId`), quando provider = zernio. */
    providerAccountId: text("provider_account_id"),
    username: text("username").notNull(),
    /** Token cifrado com AES-256-GCM; nunca gravado em texto puro. */
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    /** connected | reconnect_required | revoked */
    connectionStatus: text("connection_status").notNull().default("connected"),
    lastTokenRefreshAt: timestamp("last_token_refresh_at", {
      withTimezone: true,
    }),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("instagram_accounts_user_id_uq").on(table.instagramUserId),
  ],
);

export const automations = pgTable(
  "automations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => instagramAccounts.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    /** Palavra/frase digitada pelo administrador. */
    keyword: text("keyword").notNull(),
    /** Publicação específica; NULL = qualquer publicação. */
    mediaId: text("media_id"),
    firstDmText: text("first_dm_text").notNull(),
    /**
     * Rótulo do botão opcional da primeira DM (postback "continuar").
     * NULL = texto puro. Botões podem ser recusados pela Meta para quem não
     * segue a conta, e a recusa consome a resposta privada única do comentário.
     */
    firstDmButtonLabel: text("first_dm_button_label"),
    /**
     * Campo legado da primeira versão (botão de quick reply na primeira DM).
     * Mantido para não perder dados; a primeira DM agora é sempre texto puro.
     */
    quickReplyTitle: text("quick_reply_title")
      .notNull()
      .default("Quero o link"),
    secondDmText: text("second_dm_text").notNull(),
    linkButtonTitle: text("link_button_title").notNull(),
    linkUrl: text("link_url").notNull(),
    /**
     * Como o link é entregue depois que a pessoa responde à primeira DM:
     * off      = direto, sem porta de seguidor;
     * soft     = consulta o perfil até 2 vezes e libera mesmo sem confirmação;
     * locked   = só libera quando a Meta confirma que a pessoa segue;
     * optional = uma mensagem com os botões "Seguir" e "Abrir link", sem checagem;
     * direct   = só o link, com aviso de que seguir leva as próximas mensagens
     *            à caixa principal.
     */
    followMode: text("follow_mode").notNull().default("off"),
    followGateText: text("follow_gate_text")
      .notNull()
      .default(
        'Para liberar o link, siga o perfil e depois toque em "Já segui". Se preferir, toque em "Seguir agora".',
      ),
    followGateFollowLabel: text("follow_gate_follow_label")
      .notNull()
      .default("Seguir agora"),
    followGateConfirmLabel: text("follow_gate_confirm_label")
      .notNull()
      .default("Já segui"),
    /** Texto da mensagem única do modo "opcional" (Seguir + link). */
    followOptionalText: text("follow_optional_text")
      .notNull()
      .default(
        "Se quiser receber as próximas mensagens na caixa principal, siga o perfil. O link já está aqui:",
      ),
    /** Texto do modo "direto", com o aviso sobre a caixa principal. */
    followDirectText: text("follow_direct_text")
      .notNull()
      .default(
        "Aqui está o link. Se seguir o perfil, as próximas mensagens chegam na caixa principal.",
      ),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automations_lookup_idx").on(table.accountId, table.isActive),
  ],
);

export const webhookEvents = pgTable(
  "webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Chave determinística do evento (ex.: comment:<id>, message:<mid>). */
    eventKey: text("event_key").notNull(),
    /** comments | messages */
    field: text("field").notNull(),
    instagramUserId: text("instagram_user_id"),
    payload: jsonb("payload").$type<unknown>().notNull(),
    /** received | processed | ignored | failed */
    status: text("status").notNull().default("received"),
    errorMessage: text("error_message"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("webhook_events_event_key_uq").on(table.eventKey),
    index("webhook_events_received_at_idx").on(table.receivedAt),
  ],
);

export const commentInteractions = pgTable(
  "comment_interactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => instagramAccounts.id, { onDelete: "restrict" }),
    automationId: uuid("automation_id")
      .notNull()
      .references(() => automations.id, { onDelete: "restrict" }),
    /** ID do comentário na API do Instagram. */
    commentId: text("comment_id").notNull(),
    mediaId: text("media_id").notNull(),
    /** Instagram-scoped ID de quem comentou. */
    commenterIgsid: text("commenter_igsid").notNull(),
    /**
     * ID da conversa no provedor (hoje só a Zernio usa). A DM 2 é enviada
     * nessa conversa; na Meta o destinatário é o próprio IGSID.
     */
    providerConversationId: text("provider_conversation_id"),
    commentText: text("comment_text"),
    commentCreatedAt: timestamp("comment_created_at", {
      withTimezone: true,
    }).notNull(),
    /** commentCreatedAt + 7 dias (janela oficial de resposta privada). */
    replyDeadlineAt: timestamp("reply_deadline_at", {
      withTimezone: true,
    }).notNull(),
    /** Identificador opaco usado nos botões (quick reply antigo ou postback). */
    token: text("token").notNull(),
    /**
     * queued | accepted | gate_pending | link_sent | uncertain | expired |
     * failed | canceled
     * gate_pending = link retido até a pessoa tocar em "Já segui".
     */
    state: text("state").notNull().default("queued"),
    firstDmMessageId: text("first_dm_message_id"),
    firstDmAcceptedAt: timestamp("first_dm_accepted_at", {
      withTimezone: true,
    }),
    secondDmMessageId: text("second_dm_message_id"),
    secondDmAcceptedAt: timestamp("second_dm_accepted_at", {
      withTimezone: true,
    }),
    /** Última mensagem recebida do usuário (abre a janela de 24h). */
    userLastMessageAt: timestamp("user_last_message_at", {
      withTimezone: true,
    }),
    /**
     * Quantas vezes já consultamos se a pessoa segue o perfil. Limitado a 2
     * para não insistir: depois disso o link é liberado mesmo sem confirmação.
     */
    followChecks: integer("follow_checks").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("comment_interactions_comment_uq").on(table.commentId),
    uniqueIndex("comment_interactions_token_uq").on(table.token),
    index("comment_interactions_commenter_idx").on(
      table.accountId,
      table.commenterIgsid,
    ),
  ],
);

export const outboundMessages = pgTable(
  "outbound_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => instagramAccounts.id, { onDelete: "restrict" }),
    interactionId: uuid("interaction_id")
      .notNull()
      .references(() => commentInteractions.id, { onDelete: "restrict" }),
    /**
     * private_reply (primeira DM) | followup_link (segunda mensagem) |
     * link_optional (botões Seguir + link) | link_direct (só o link) |
     * follow_gate (mensagem com os botões de seguidor) |
     * follow_check / follow_check_2 (consultas ao perfil; não enviam nada).
     */
    kind: text("kind").notNull(),
    /**
     * pending | processing | accepted | failed | uncertain | expired | canceled
     * "accepted" = a Meta aceitou a requisição; não significa entrega.
     */
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    lockToken: text("lock_token"),
    /** Corpo exato enviado à API (sem token de acesso). */
    payload: jsonb("payload").$type<unknown>().notNull(),
    externalMessageId: text("external_message_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("outbound_messages_logical_uq").on(
      table.interactionId,
      table.kind,
    ),
    index("outbound_messages_queue_idx").on(table.status, table.nextAttemptAt),
    index("outbound_messages_private_reply_usage_idx").on(
      table.accountId,
      table.kind,
      table.status,
      table.acceptedAt,
    ),
  ],
);

/**
 * Estado e diagnóstico da aplicação: última verificação de webhook, última
 * execução do drenador, última renovação de token etc. Chave/valor simples.
 */
export const appState = pgTable("app_state", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Pedidos de exclusão de dados recebidos pelo callback da Meta.
 * Guardamos apenas o hash do identificador, não o ID em texto puro.
 */
export const dataDeletionRequests = pgTable(
  "data_deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** SHA-256 do Instagram-scoped ID informado pela Meta. */
    instagramUserIdHash: text("instagram_user_id_hash").notNull(),
    confirmationCode: text("confirmation_code").notNull(),
    /** pending | completed | failed */
    status: text("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("data_deletion_requests_confirmation_uq").on(
      table.confirmationCode,
    ),
    index("data_deletion_requests_requested_idx").on(table.requestedAt),
  ],
);

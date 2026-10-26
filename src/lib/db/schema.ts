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
    /** ID do usuário do Instagram profissional obtido pela API oficial. */
    instagramUserId: text("instagram_user_id").notNull(),
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
    /** Forma canônica usada na comparação (minúsculas, sem acentos). */
    keywordNormalized: text("keyword_normalized").notNull(),
    /** Publicação específica; NULL = qualquer publicação. */
    mediaId: text("media_id"),
    firstDmText: text("first_dm_text").notNull(),
    quickReplyTitle: text("quick_reply_title").notNull(),
    secondDmText: text("second_dm_text").notNull(),
    linkButtonTitle: text("link_button_title").notNull(),
    linkUrl: text("link_url").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("automations_lookup_idx").on(
      table.accountId,
      table.isActive,
      table.keywordNormalized,
    ),
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
    commentText: text("comment_text"),
    commentCreatedAt: timestamp("comment_created_at", { withTimezone: true })
      .notNull(),
    /** commentCreatedAt + 7 dias (janela oficial de resposta privada). */
    replyDeadlineAt: timestamp("reply_deadline_at", {
      withTimezone: true,
    }).notNull(),
    /** Identificador opaco enviado no payload do quick reply. */
    token: text("token").notNull(),
    /** queued | accepted | link_sent | expired | failed | canceled */
    state: text("state").notNull().default("queued"),
    firstDmMessageId: text("first_dm_message_id"),
    firstDmAcceptedAt: timestamp("first_dm_accepted_at", {
      withTimezone: true,
    }),
    secondDmMessageId: text("second_dm_message_id"),
    secondDmAcceptedAt: timestamp("second_dm_accepted_at", {
      withTimezone: true,
    }),
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
    /** private_reply (primeira DM) | followup_link (segunda mensagem). */
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

CREATE TABLE "app_state" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"name" text NOT NULL,
	"keyword" text NOT NULL,
	"keyword_normalized" text NOT NULL,
	"media_id" text,
	"first_dm_text" text NOT NULL,
	"quick_reply_title" text NOT NULL,
	"second_dm_text" text NOT NULL,
	"link_button_title" text NOT NULL,
	"link_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comment_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"automation_id" uuid NOT NULL,
	"comment_id" text NOT NULL,
	"media_id" text NOT NULL,
	"commenter_igsid" text NOT NULL,
	"comment_text" text,
	"comment_created_at" timestamp with time zone NOT NULL,
	"reply_deadline_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"first_dm_message_id" text,
	"first_dm_accepted_at" timestamp with time zone,
	"second_dm_message_id" text,
	"second_dm_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instagram_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instagram_user_id" text NOT NULL,
	"username" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"connection_status" text DEFAULT 'connected' NOT NULL,
	"last_token_refresh_at" timestamp with time zone,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"interaction_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"lock_token" text,
	"payload" jsonb NOT NULL,
	"external_message_id" text,
	"error_code" text,
	"error_message" text,
	"last_attempt_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_key" text NOT NULL,
	"field" text NOT NULL,
	"instagram_user_id" text,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'received' NOT NULL,
	"error_message" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_account_id_instagram_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_interactions" ADD CONSTRAINT "comment_interactions_account_id_instagram_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_interactions" ADD CONSTRAINT "comment_interactions_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_account_id_instagram_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."instagram_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_messages" ADD CONSTRAINT "outbound_messages_interaction_id_comment_interactions_id_fk" FOREIGN KEY ("interaction_id") REFERENCES "public"."comment_interactions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automations_lookup_idx" ON "automations" USING btree ("account_id","is_active","keyword_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_interactions_comment_uq" ON "comment_interactions" USING btree ("comment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "comment_interactions_token_uq" ON "comment_interactions" USING btree ("token");--> statement-breakpoint
CREATE INDEX "comment_interactions_commenter_idx" ON "comment_interactions" USING btree ("account_id","commenter_igsid");--> statement-breakpoint
CREATE UNIQUE INDEX "instagram_accounts_user_id_uq" ON "instagram_accounts" USING btree ("instagram_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "outbound_messages_logical_uq" ON "outbound_messages" USING btree ("interaction_id","kind");--> statement-breakpoint
CREATE INDEX "outbound_messages_queue_idx" ON "outbound_messages" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_event_key_uq" ON "webhook_events" USING btree ("event_key");--> statement-breakpoint
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events" USING btree ("received_at");
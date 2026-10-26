ALTER TABLE "comment_interactions" ADD COLUMN "provider_conversation_id" text;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "provider" text DEFAULT 'meta' NOT NULL;--> statement-breakpoint
ALTER TABLE "instagram_accounts" ADD COLUMN "provider_account_id" text;
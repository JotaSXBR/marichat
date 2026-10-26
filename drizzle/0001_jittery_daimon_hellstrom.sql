CREATE TABLE "data_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instagram_user_id_hash" text NOT NULL,
	"confirmation_code" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "comment_interactions" ADD COLUMN "user_last_message_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "data_deletion_requests_confirmation_uq" ON "data_deletion_requests" USING btree ("confirmation_code");--> statement-breakpoint
CREATE INDEX "data_deletion_requests_requested_idx" ON "data_deletion_requests" USING btree ("requested_at");
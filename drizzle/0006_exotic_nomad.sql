DROP INDEX "automations_lookup_idx";--> statement-breakpoint
CREATE INDEX "outbound_messages_private_reply_usage_idx" ON "outbound_messages" USING btree ("account_id","kind","status","accepted_at");--> statement-breakpoint
CREATE INDEX "automations_lookup_idx" ON "automations" USING btree ("account_id","is_active");--> statement-breakpoint
ALTER TABLE "automations" DROP COLUMN "keyword_normalized";
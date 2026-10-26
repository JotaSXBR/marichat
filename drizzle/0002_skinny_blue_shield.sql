ALTER TABLE "automations" ALTER COLUMN "quick_reply_title" SET DEFAULT 'Quero o link';--> statement-breakpoint
ALTER TABLE "automations" ADD COLUMN "require_follow" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "automations" ADD COLUMN "follow_gate_text" text DEFAULT 'Para liberar o link, siga o perfil e depois toque em "Já segui". Se preferir, toque em "Seguir agora".' NOT NULL;--> statement-breakpoint
ALTER TABLE "automations" ADD COLUMN "follow_gate_follow_label" text DEFAULT 'Seguir agora' NOT NULL;--> statement-breakpoint
ALTER TABLE "automations" ADD COLUMN "follow_gate_confirm_label" text DEFAULT 'Já segui' NOT NULL;--> statement-breakpoint
ALTER TABLE "comment_interactions" ADD COLUMN "follow_checks" integer DEFAULT 0 NOT NULL;
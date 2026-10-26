ALTER TABLE "automations" ADD COLUMN "follow_mode" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "automations" ADD COLUMN "follow_optional_text" text DEFAULT 'Se quiser receber as próximas mensagens na caixa principal, siga o perfil. O link já está aqui:' NOT NULL;--> statement-breakpoint
ALTER TABLE "automations" ADD COLUMN "follow_direct_text" text DEFAULT 'Aqui está o link. Se seguir o perfil, as próximas mensagens chegam na caixa principal.' NOT NULL;--> statement-breakpoint
UPDATE "automations" SET "follow_mode" = 'soft' WHERE "require_follow" = true;
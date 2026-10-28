import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "@/lib/db/client";

/**
 * Recupera tarefas que ficaram "processing" porque o processo morreu.
 * O resultado do envio é desconhecido: NÃO reenvia automaticamente.
 */
export async function recoverStuckJobs(): Promise<number> {
  const db = getDb();
  const result = await db.execute(sql`
    UPDATE outbound_messages
    SET status = 'uncertain',
        error_code = 'INTERRUPTED',
        error_message = 'O processo foi interrompido durante o envio; o resultado é desconhecido.',
        locked_at = NULL,
        lock_token = NULL,
        updated_at = now()
    WHERE status = 'processing'
      AND locked_at < now() - interval '10 minutes'
  `);

  await db.execute(sql`
    UPDATE comment_interactions ci
    SET state = 'uncertain', updated_at = now()
    WHERE ci.state IN ('queued')
      AND EXISTS (
        SELECT 1 FROM outbound_messages om
        WHERE om.interaction_id = ci.id
          AND om.kind = 'private_reply'
          AND om.status = 'uncertain'
      )
  `);

  return (result as unknown as { count?: number }).count ?? 0;
}

/** Marca como expiradas as tarefas cujo prazo da Meta já passou. */
export async function expireOverdueJobs(): Promise<number> {
  const db = getDb();

  const result = await db.execute(sql`
    UPDATE outbound_messages om
    SET status = 'expired',
        error_code = 'EXPIRED',
        error_message = 'O prazo permitido pela Meta para esta mensagem expirou.',
        locked_at = NULL,
        lock_token = NULL,
        updated_at = now()
    FROM comment_interactions ci
    WHERE om.interaction_id = ci.id
      AND om.status = 'pending'
      AND (
        (om.kind = 'private_reply' AND ci.reply_deadline_at <= now())
        OR (
          om.kind IN (
            'followup_link',
            'link_optional',
            'link_direct',
            'follow_gate',
            'follow_check',
            'follow_check_2'
          )
          AND ci.user_last_message_at IS NOT NULL
          AND ci.user_last_message_at <= now() - interval '24 hours'
        )
      )
  `);

  await db.execute(sql`
    UPDATE comment_interactions ci
    SET state = 'expired', updated_at = now()
    WHERE ci.state IN ('queued', 'accepted', 'gate_pending', 'uncertain')
      AND EXISTS (
        SELECT 1 FROM outbound_messages om
        WHERE om.interaction_id = ci.id
          AND om.status = 'expired'
      )
      AND NOT EXISTS (
        SELECT 1 FROM outbound_messages om
        WHERE om.interaction_id = ci.id
          AND om.status = 'accepted'
          AND om.kind IN ('followup_link', 'link_optional', 'link_direct')
      )
  `);

  return (result as unknown as { count?: number }).count ?? 0;
}

/**
 * Retenção: some com eventos antigos (o dedupe só precisa de ~7 dias), apaga
 * o texto dos comentários velhos e esvazia payloads de mensagens concluídas.
 */
export async function cleanupOldData(): Promise<void> {
  const db = getDb();
  // Preenche o @ de interações antigas a partir do evento guardado (a Meta não
  // deixa consultar perfil por ID). Só funciona enquanto o evento existir.
  await db.execute(sql`
    UPDATE comment_interactions ci
    SET commenter_username = we.payload #>> '{comment,author,username}',
        updated_at = now()
    FROM webhook_events we
    WHERE ci.commenter_username IS NULL
      AND we.payload #>> '{comment,id}' = ci.comment_id
      AND we.payload #>> '{comment,author,username}' IS NOT NULL
  `);
  await db.execute(sql`
    DELETE FROM webhook_events
    WHERE received_at < now() - interval '30 days'
  `);
  await db.execute(sql`
    UPDATE comment_interactions
    SET comment_text = NULL, updated_at = now()
    WHERE comment_text IS NOT NULL
      AND created_at < now() - interval '90 days'
  `);
  await db.execute(sql`
    UPDATE outbound_messages
    SET payload = '{"removed": true}'::jsonb
    WHERE status IN ('accepted', 'failed', 'uncertain', 'expired', 'canceled')
      AND updated_at < now() - interval '30 days'
      AND payload <> '{"removed": true}'::jsonb
  `);
}

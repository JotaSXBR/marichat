/**
 * Prepara conta, automação e dados de demonstração no banco local. Limpa
 * apenas os registros `demo-*`, preservando o resto do banco.
 */

import { DEMO_IG_ID, DEMO_LINK, DEMO_TOKEN, DEMO_USERNAME } from "./env.mjs";
import { encryptToken } from "./util.mjs";

async function upsertAccount(sql) {
  const encrypted = encryptToken(DEMO_TOKEN);
  const expiresAt = new Date(Date.now() + 50 * 86_400_000);

  const [account] = await sql`
    INSERT INTO instagram_accounts
      (instagram_user_id, username, access_token_encrypted, token_expires_at, connection_status, last_verified_at)
    VALUES
      (${DEMO_IG_ID}, ${DEMO_USERNAME}, ${encrypted}, ${expiresAt}, 'connected', now())
    ON CONFLICT (instagram_user_id) DO UPDATE SET
      username = excluded.username,
      access_token_encrypted = excluded.access_token_encrypted,
      token_expires_at = excluded.token_expires_at,
      connection_status = 'connected',
      last_verified_at = now(),
      updated_at = now()
    RETURNING id
  `;
  return account.id;
}

async function removePreviousDemo(sql, accountId) {
  await sql`
    DELETE FROM outbound_messages
    WHERE interaction_id IN (
      SELECT id FROM comment_interactions
      WHERE account_id = ${accountId} AND comment_id LIKE 'demo-%'
    )
  `;
  await sql`
    DELETE FROM comment_interactions
    WHERE account_id = ${accountId} AND comment_id LIKE 'demo-%'
  `;
  await sql`DELETE FROM automations WHERE account_id = ${accountId} AND name = 'Demonstração local'`;
  await sql`
    DELETE FROM webhook_events
    WHERE event_key LIKE 'comment:demo-%' OR event_key LIKE 'message:demo-%'
  `;
}

async function insertAutomation(sql, accountId) {
  const [automation] = await sql`
    INSERT INTO automations (
      account_id, name, keyword, media_id,
      first_dm_text, second_dm_text, link_button_title,
      link_url, is_active
    ) VALUES (
      ${accountId}, 'Demonstração local', 'quero', NULL,
      'Que bom que você se interessou! Responda esta mensagem para receber o link.',
      'Aqui está o link que você pediu',
      'Abrir link', ${DEMO_LINK}, true
    )
    RETURNING id
  `;
  return automation.id;
}

export async function seedDatabase(sql) {
  const accountId = await upsertAccount(sql);
  await removePreviousDemo(sql, accountId);
  const automationId = await insertAutomation(sql, accountId);
  return { accountId, automationId };
}

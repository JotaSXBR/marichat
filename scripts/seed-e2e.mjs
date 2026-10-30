/**
 * Popula o banco de teste (5433) com dados suficientes para os specs de
 * navegador não rodarem sobre telas vazias.
 *
 * Uso: npm run seed:e2e   (o CI roda depois de `db:migrate`, antes do e2e)
 *
 * Só aceita o PostgreSQL de teste local — mesma proteção de
 * tests/helpers/db.ts. Em qualquer outro banco, aborta.
 */

import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

import postgres from "postgres";

function localEnv() {
  const values = {};
  let raw = "";
  try {
    raw = readFileSync(".env.local", "utf8");
  } catch {
    // No CI não existe .env.local: as variáveis vêm do job.
  }
  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return values;
}

const env = localEnv();
const url = process.env.DATABASE_URL ?? env.DATABASE_URL;
const keyBase64 = process.env.TOKEN_ENCRYPTION_KEY ?? env.TOKEN_ENCRYPTION_KEY;

if (!url || !/@(127\.0\.0\.1|localhost):5433\//.test(url)) {
  throw new Error(
    "DATABASE_URL precisa apontar para o PostgreSQL de teste (porta 5433).",
  );
}
if (!keyBase64) {
  throw new Error("TOKEN_ENCRYPTION_KEY não definida.");
}

// Mesmo formato de src/lib/crypto.ts: v1.<iv>.<tag>.<ciphertext> em base64url.
// Duplicado de propósito: o seed roda em Node puro, sem o alias @/ do Next.
function encryptToken(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(keyBase64, "base64"),
    iv,
  );
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

const sql = postgres(url, { onnotice: () => {} });

const minutes = (n) => new Date(Date.now() + n * 60_000);

await sql`
  TRUNCATE TABLE
    outbound_messages,
    comment_interactions,
    webhook_events,
    automations,
    instagram_accounts,
    data_deletion_requests,
    app_state
  RESTART IDENTITY CASCADE
`;

// Cron "vivo": sem isso a Atividade abre com alerta de drenador parado.
await sql`
  INSERT INTO app_state (key, value, updated_at)
  VALUES ('last_tick_at', to_jsonb(${new Date().toISOString()}::text), now())
`;

const [account] = await sql`
  INSERT INTO instagram_accounts
    (provider, instagram_user_id, username, access_token_encrypted, token_expires_at, connection_status)
  VALUES ('meta', '17841400000000000', 'conta_teste', ${encryptToken("IGQVJtoken-de-teste")},
    ${minutes(60 * 24 * 30)}, 'connected')
  RETURNING id
`;

const automations = await sql`
  INSERT INTO automations
    (account_id, name, keyword, first_dm_text, second_dm_text, link_button_title, link_url, follow_mode, is_active)
  VALUES
    (${account.id}, 'Material gratuito', 'QUERO', 'Responda esta mensagem para receber o link.',
      'Aqui está o link que você pediu', 'Abrir link', 'https://www.exemplo.com/material', 'off', true),
    (${account.id}, 'Porta travada', 'LIBERA', 'Responda para liberar o material.',
      'Link liberado', 'Abrir link', 'https://www.exemplo.com/travado', 'locked', true),
    (${account.id}, 'Campanha pausada', 'PAUSADA', 'Esta automação está pausada.',
      'Link pausado', 'Abrir link', 'https://www.exemplo.com/pausada', 'off', false)
  RETURNING id
`;

const [active, locked, paused] = automations;

async function interaction({
  automationId,
  index,
  state,
  username,
  minutesAgo,
  followChecks = 0,
}) {
  const [row] = await sql`
    INSERT INTO comment_interactions
      (account_id, automation_id, comment_id, media_id, commenter_igsid, commenter_username,
       comment_text, comment_created_at, reply_deadline_at, token, state, follow_checks,
       first_dm_accepted_at, second_dm_accepted_at, user_last_message_at, created_at, updated_at)
    VALUES
      (${account.id}, ${automationId}, ${`comment-${index}`}, 'media-1', ${`igsid-${index}`},
       ${username}, 'Quero', ${minutes(-minutesAgo)}, ${minutes(-minutesAgo + 60 * 24 * 7)},
       ${`token-${index}`}, ${state}, ${followChecks},
       ${["accepted", "gate_pending", "link_sent"].includes(state) ? minutes(-minutesAgo + 1) : null},
       ${state === "link_sent" ? minutes(-minutesAgo + 2) : null},
       ${state === "link_sent" ? minutes(-minutesAgo + 2) : null},
       ${minutes(-minutesAgo)}, ${minutes(-minutesAgo)})
    RETURNING id
  `;
  return row.id;
}

const interactions = [];
// 12 interações espalhadas entre os estados que a tabela sabe mostrar.
const scenario = [
  ["queued", "ana_souza", 5],
  ["accepted", "bruno_lima", 12],
  ["gate_pending", "carla_melo", 30, 1],
  ["link_sent", "diego_alves", 45],
  ["failed", "elisa_rocha", 60],
  ["expired", "fabio_nunes", 120],
  ["link_sent", "gabi_teixeira", 180],
  ["accepted", "heitor_prado", 240],
  ["queued", "iris_matos", 300],
  ["link_sent", "joao_paiva", 360],
  ["gate_pending", "karina_dias", 420, 2],
  ["accepted", "lucas_faria", 480],
];

for (const [
  i,
  [state, username, minutesAgo, followChecks],
] of scenario.entries()) {
  interactions.push(
    await interaction({
      automationId:
        i % 3 === 1 ? locked.id : i % 3 === 2 ? paused.id : active.id,
      index: i + 1,
      state,
      username,
      minutesAgo,
      followChecks: followChecks ?? 0,
    }),
  );
}

// Envios: um por interação com DM aceita, mais um falho e um incerto.
for (const [i, interactionId] of interactions.entries()) {
  const state = scenario[i][0];
  const status =
    state === "failed"
      ? "failed"
      : state === "expired"
        ? "expired"
        : "accepted";
  await sql`
    INSERT INTO outbound_messages
      (account_id, interaction_id, kind, status, attempts, payload, next_attempt_at,
       accepted_at, error_code, error_message, created_at, updated_at)
    VALUES
      (${account.id}, ${interactionId}, 'private_reply', ${status}, ${status === "failed" ? 3 : 1},
       ${sql.json({ recipient: { comment_id: `comment-${i + 1}` } })}, ${minutes(-scenario[i][2])},
       ${status === "accepted" ? minutes(-scenario[i][2] + 1) : null},
       ${status === "failed" ? "9007" : null},
       ${status === "failed" ? "Não foi possível enviar a mensagem." : null},
       ${minutes(-scenario[i][2])}, ${minutes(-scenario[i][2] + 1)})
  `;
}

await sql`
  INSERT INTO outbound_messages
    (account_id, interaction_id, kind, status, attempts, max_attempts, payload,
     next_attempt_at, error_code, error_message, created_at, updated_at)
  VALUES
    (${account.id}, ${interactions[3]}, 'followup_link', 'uncertain', 2, 3,
     ${sql.json({ recipient: { id: "igsid-4" } })}, ${minutes(-10)}, 'timeout',
     'Sem resposta da Meta dentro do tempo limite.', ${minutes(-30)}, ${minutes(-10)})
`;

await sql`
  INSERT INTO webhook_events (event_key, field, instagram_user_id, payload, status, received_at, processed_at)
  VALUES
    ('comment:comment-1', 'comments', '17841400000000000',
     ${sql.json({ field: "comments", value: { id: "comment-1" } })}, 'processed', ${minutes(-5)}, ${minutes(-5)}),
    ('message:mid-1', 'messages', '17841400000000000',
     ${sql.json({ field: "messages", value: { mid: "mid-1" } })}, 'ignored', ${minutes(-15)}, ${minutes(-15)}),
    ('comment:comment-99', 'comments', '17841400000000000',
     ${sql.json({ field: "comments", value: { id: "comment-99" } })}, 'failed', ${minutes(-40)}, ${minutes(-40)})
`;

await sql.end();

console.log(
  `Seed e2e: 1 conta, ${automations.length} automações, ${interactions.length} interações, 13 envios, 3 webhooks.`,
);

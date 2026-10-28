# Zernio: levantamento da API e decisão de arquitetura

Pesquisa feita em 2026-10-26 na documentação oficial
(<https://docs.zernio.com>), antes de escrever qualquer código de integração,
conforme a regra do `AGENTS.md`.

## O que a Zernio resolve

A Zernio é uma API intermediária ("BSP"/agregador) que já possui app Meta
aprovado. Ao conectar a conta do Instagram **dentro do painel da Zernio**, ela
cuida de:

- OAuth e renovação de token (não precisamos mais guardar token da Meta);
- inscrição e verificação dos webhooks da Meta;
- envio de DM, resposta privada a comentário, botões e quick replies;
- consulta do status de seguidor (`isFollower`).

Isso elimina a etapa mais lenta do projeto: criar o app Meta, pedir permissões e
passar pela análise. O custo é uma dependência paga e uma camada a mais entre o
nosso código e a Meta.

## Fatos confirmados na documentação

### Autenticação

- `Authorization: Bearer $ZERNIO_API_KEY` em todas as chamadas.
- Chave ausente/ inválida → `401` com `code: missing_credentials` ou
  `invalid_credentials`.
- Base: `https://zernio.com/api` (ex.: `POST https://zernio.com/api/v1/...`).

### Contas conectadas

`GET /v1/accounts?platform=instagram` devolve `accounts[]`, cada uma com:

- `_id` — é o `accountId` usado nos envios;
- `platformUserId` — ID do Instagram (em contas com Instagram Login é
  app-scoped; o id profissional `17841...` fica em `metadata.instagramScopedId`);
- `username`, `isActive`, `needsReconnection`, `metadata.loginMethod`.

### Comentário recebido

Evento `comment.received`, assinado com `X-Zernio-Signature`:

- `comment.id` — ID do comentário na Meta;
- `comment.platformPostId` — ID da mídia na Meta (usável como `postId`);
- `comment.text`, `comment.author.id` (IGSID), `comment.createdAt`,
  `comment.isReply`, `comment.parentCommentId`;
- `comment.author.instagramProfile` — **só existe para quem já mandou DM
  antes**. Ausente = desconhecido, nunca "não segue".
- `account.accountId` — a conta que recebeu.

### Mensagem recebida

Evento `message.received`:

- `conversation.id` — é o `conversationId` para enviar a próxima mensagem;
- `message.sender.id` — IGSID de quem escreveu;
- `message.sender.instagramProfile.isFollower` — `boolean | null`, disponível
  **porque a pessoa acabou de mandar mensagem** (o consentimento existe);
- `message.text`;
- `metadata.postbackPayload` — payload do botão tocado (toques em botão chegam
  como `message.received`, não como evento separado);
- `metadata.interactiveType` / `interactiveId` — para quick reply/botão;
- `metadata.standby` — outro app é dono da conversa; não responder.

### Envio

Resposta pública ao comentário (aparece na publicação, antes da DM):

```
POST /v1/inbox/comments/{postId}
Body: { accountId, message, commentId }
```

- `commentId` no corpo responde àquele comentário; sem ele, vira comentário
  novo no post.
- Não gasta a resposta privada nem depende da janela de 7 dias.
- Única tarefa que não devolve `messageId` — não há mensagem, só comentário.

Resposta privada a comentário (DM 1):

```
POST /v1/inbox/comments/{postId}/{commentId}/private-reply
Body: { accountId, message, buttons? (1-3) | quickReplies? (até 13) }
```

- `postId` é o **ID da mídia na Meta** — funciona para posts que não foram
  publicados pela Zernio (importante: não exige migrar o histórico de posts).
- Uma resposta por comentário, janela de 7 dias.
- Botões/cards podem ser recusados para não seguidores (Meta código 2, subcode
  `1545133`; a Zernio devolve 400 "non-retryable"). A falha **consome** a única
  resposta do comentário. Por isso nossa DM 1 continua sendo texto puro.
- `details.privateReplyConsumed: true` → nunca repetir.
- `502` com `details.privateReplyOutcome: "unknown"` → pode ter sido entregue;
  não repetir às cegas (nosso estado `uncertain` já cobre isso).

Mensagem em conversa (DM 2 e reenvios):

```
POST /v1/inbox/conversations/{conversationId}/messages
Body: { accountId, message, buttons? (1-3, texto ≤ 640) | quickReplies? }
```

- Aceita `Idempotency-Key`.
- Botões viram um `button_template` da Meta (mesmo formato que já usamos).
- Fora da janela de 24h: `messageTag: "HUMAN_AGENT"` + `messagingType:
  "MESSAGE_TAG"`. Nós não precisamos: só enviamos depois de a pessoa responder.

Status de seguidor sob demanda:

```
GET /v1/accounts/{accountId}/follow-status/{userId}?refresh=true
```

- `200` com `isFollower: boolean | null` e `unavailableReason`
  (`consent_required`, `dm_access_disabled`, `not_messageable`, `error`).
- Só responde para quem já mandou mensagem — a mesma regra da Meta.
- Cache curto por (conta, usuário); `refresh=true` força reconsulta (nosso
  "Já segui" já espera ~20s antes de checar).

### Webhooks da Zernio

- Criados com `POST /v1/webhooks/settings`
  (`name`, `url`, `events[]`, `secret`, opcional `profileIds`/`accountIds`).
- Assinatura: `X-Zernio-Signature` = HMAC-SHA256 hexadecimal do corpo cru,
  chave = `secret`. Também `X-Zernio-Event-Id` (dedupe) e `X-Zernio-Event`.
- Entrega pelo menos uma vez, até 7 tentativas, precisa responder `2xx` em 5s.
- Eventos que usaremos: `comment.received`, `message.received`,
  `conversation.control_changed` (opcional; detecta outro app assumindo a
  conversa).
- Teste: `POST /v1/webhooks/test` com `webhookId`.

## Automações nativas de comentário (opção A)

`POST /v1/comment-automations` já faz keyword → DM, com:

- `audience.followerStatus`: `any` | `follower` | `non_follower`;
- `audience.whenUnknown`: `send` | `skip` | `verify`;
- `followGate`: `message`, `buttonLabel`, `profileButtonLabel`,
  `notFollowingMessage`;
- `buttons`, `quickReplies`, `publicReplyPolicy`, `repeatPolicy`,
  `dedupeSameTextHours`, polling de comentários a cada 10 min como rede de
  segurança.

## Comparação das duas arquiteturas

### Opção A — usar as automações da Zernio e aposentar o motor

Fluxo: o painel do MARICHAT vira um formulário que cria/edita
`comment-automations` na Zernio. Quem responde, quem checa seguidor e quem
envia é a Zernio.

Ganhos:

- Muito menos código: some fila, retentativa, token, webhook da Meta.
- A Zernio já tem polling de comentários e dashboard de logs.

Perdas:

- **O modo `soft` deixa de existir.** A Zernio só sabe "libera" (`send`),
  "silencia" (`skip`) ou "pede confirmação" (`verify`, que ao não seguir manda
  `notFollowingMessage` e não libera depois de N checagens).
- O modo `optional`/`direct` até mapeia (botões), mas o controle fino de quando
  a segunda mensagem sai (após a resposta, com rechecagem em 20s) some.
- Nosso banco/página Atividade perdem o significado: não há mais tarefa própria
  para acompanhar; o diagnóstico passa a ser o painel da Zernio.
- Migrar as cinco automações existentes para o formato deles exige reescrever
  schema, painel e testes. O trabalho de ontem seria descartado.

### Opção B — manter o motor e trocar só o transporte (recomendada)

Fluxo: `provider = meta | zernio`, escolhido por variável de ambiente.

- Entrada: `/api/webhook/zernio` valida `X-Zernio-Signature`, traduz
  `comment.received` / `message.received` para os eventos internos que
  `src/lib/webhook/process.ts` já entende.
- Saída: `src/lib/instagram/client.ts` ganha uma implementação Zernio
  (`privateReply`, `sendMessage`, `getFollowStatus`) com a mesma interface.
- `comment.author.id` → `commenterIgsid`; `comment.platformPostId` →
  `mediaId`; `conversation.id` fica guardado na interação para a DM 2.
- `isFollower` vem de `message.sender.instagramProfile` ou de
  `follow-status?refresh=true`; `null` continua sendo "desconhecido" e mantém a
  porta (modo `locked`).

Ganhos:

- Os cinco modos continuam exatamente como estão, inclusive `soft` e o teto de
  6 checagens do `locked`.
- Schema, fila, rate limit de 750/h, página Atividade e testes continuam válidos.
- Um único ponto de troca: dá para voltar para a Meta direto mudando a variável.
- Elimina a necessidade de app Meta aprovado (a Zernio já é o app aprovado).

Custos:

- Uma camada de tradução a mais (dois formatos de evento).
- Dependência de disponibilidade da Zernio.
- O `conversationId` passa a ser obrigatório; hoje a DM 2 usa `recipient.id`.

## Decisão proposta

**Opção B.** Preserva o comportamento já acordado com o usuário (cinco modos),
aproveita tudo o que foi construído e testado, e ainda assim remove o maior
risco do projeto (análise do app Meta). A opção A só faria sentido se
aceitássemos perder o modo `soft` e reescrever o painel.

## Pendências que só a conta real resolve

1. Confirmar que `comment.received` chega para posts antigos, não publicados
   pela Zernio (a doc diz `postId: null` mas `platformPostId` presente; o
   endpoint de resposta privada aceita o ID da mídia).
2. Ver no `GET /v1/accounts` qual é o `accountId` e se `platformUserId`
   corresponde ao `instagramUserId` que já guardamos.
3. Medir se `isFollower` vem preenchido em `message.received` na prática.
4. Verificar o limite de mensagens do plano (a doc cita add-on de inbox e
   `message_allowance_exceeded`).

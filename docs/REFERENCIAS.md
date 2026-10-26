# Referências consultadas (porta de seguidor)

Pesquisa feita antes de evoluir a porta de seguidor, conforme a regra do
`AGENTS.md`. Data: 2026-10-26.

## Documentação oficial da Meta

- [Instagram User Profile API](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api/user-profile)
  — campo `is_user_follow_business`; exige consentimento (a pessoa precisa ter
  enviado uma mensagem ou tocado em icebreaker/menu); permissões
  `instagram_business_basic` e `instagram_business_manage_messages`; host
  `graph.instagram.com`.
- [Webhooks for Instagram Messaging](https://developers.facebook.com/docs/messenger-platform/instagram/features/webhook/)
  — `messages` e `messaging_postbacks` são campos separados. O toque em botão
  de template chega como postback.
- [Subscribe to webhooks](https://developers.facebook.com/documentation/instagram-platform/webhooks.md)
  — lista de campos assináveis em `/subscribed_apps`.
- [Messenger Platform rate limits](https://developers.facebook.com/documentation/business-messaging/messenger-platform/overview/rate-limiting)
  — 750 respostas privadas por hora por conta do Instagram; Send API 300/s para
  texto (100/s em versões anteriores da doc); Conversations 2/s.
- [Page Subscribed Apps](https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps/)
  — `GET` devolve `data[].subscribed_fields`; `POST` devolve apenas
  `{"success": true}`, por isso a leitura de volta é necessária.

## Projetos open source comparados

| Projeto | Stack | Como trata o gate |
| --- | --- | --- |
| [diwenne/openreply](https://github.com/diwenne/openreply) (MIT) | Next.js + Prisma + BullMQ | Consulta `is_user_follow_business`; em `false` no toque, reagenda rechecagens (20s e 40s) antes de reapresentar o prompt; libera em `null` (fail-open). Dedupe durável por `mid`. |
| [LdwS123/instagram-dm-funnel](https://github.com/LdwS123/instagram-dm-funnel) | Worker + dashboard | Reconsulta a cada minuto por até 7 dias e libera sozinho quando a pessoa passa a seguir, sem novo toque. |
| [aashir-athar/mind-dm-bot](https://github.com/aashir-athar/mind-dm-bot) | Python + GitHub Actions | Reenvia o pedido até `MAX_FOLLOW_RETRIES`, depois envia um "soft close" e silencia. |
| [harshithgangone/open-autodm](https://github.com/harshithgangone/open-autodm) | Next.js + Supabase | Gate de "peça para seguir" com botões; foco em conversão, não em verificação real. |
| [ryanlaiyanip-ctrl/chatmany](https://github.com/ryanlaiyanip-ctrl/chatmany) | Cloudflare Workers | Defende que o gate é "nudge", não checagem; botão "I followed" sempre avança. |
| [dangogit/instagram-cta-kit](https://github.com/dangogit/instagram-cta-kit) | Node sem dependências | Checagem após comentário/mensagem/toque; entrega em segundo plano desligada por padrão. |
| [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) | Rails | Usa o mesmo campo no perfil para exibir o relacionamento no inbox. |

## O que o MARICHAT adotou

1. **Consulta só depois de uma mensagem da pessoa** — é o consentimento exigido
   pela Meta; antes disso a API responde erro, não "não segue".
2. **Falha aberta** — erro, campo ausente ou `null` liberam o link. Nenhum
   seguidor real fica preso por indisponibilidade da Meta (mesma escolha do
   OpenReply no caminho de toque).
3. **Modos explícitos** — `off` (link direto), `soft` (até duas checagens e
   libera sem confirmação), `locked` (só libera com `true`), `optional` (botões
   Seguir + link) e `direct` (só o link, com aviso). O modo tolerante é o padrão
   para quem já usava a porta; o travado atende quem quer o gate real.
4. **Espera de 20s antes da segunda checagem** — a Meta demora a refletir um
   follow novo (OpenReply mediu ~17s e ~68s em produção). Consultar na hora
   devolveria "não segue" para quem acabou de seguir.
5. **`messaging_postbacks` assinado** — sem esse campo o toque em "Já segui"
   pode não chegar; o MARICHAT agora assina `comments`, `messages` e
   `messaging_postbacks`.
6. **Limites de botão** — título com até 20 caracteres e texto do template de
   botão até 640 bytes (a Meta documenta 640 caracteres; bytes é mais restrito
   e seguro para acentos).
7. **Rate limiting de respostas privadas** — a fila conta os envios aceitos na
   última hora e, ao chegar em 750, devolve a tarefa para `pending` com
   `RATE_LIMITED`, sem consumir tentativa. A próxima tentativa é agendada para
   quando a mensagem mais antiga sair da janela.
8. **Verificação da inscrição de webhooks** — depois do `POST`, lemos
   `GET /subscribed_apps` e comparamos com os campos exigidos. Isso pegou um
   problema real: a Meta responde `success: true` mesmo quando a inscrição não
   reflete o esperado.

## Diferenças conscientes (possíveis evoluções)

- **Rigor do gate:** o modo `locked` agora mantém o pedido até a Meta confirmar
  (com teto de checagens); o `soft` segue a escolha de libertar após duas
  checagens. Os modos `optional` e `direct` não verificam nada — são escolhas de
  produto, não de API.
- **Caixa principal x Requests:** a documentação oficial confirma que conversas
  de não seguidores ficam em Requests até serem aceitas; depois disso as
  próximas vão para a caixa principal. O modo `direct` usa esse fato no aviso,
  mas a primeira mensagem ainda pode cair em Requests.
- **Rechecagem automática sem novo toque:** o `instagram-dm-funnel` verifica a
  cada minuto por dias. Exigiria uma tarefa recorrente por interação (mais carga
  no banco e risco de spam); não foi adotado.
- **Aviso de "estamos verificando":** OpenReply envia um aviso opcional após o
  toque. Pode melhorar a espera de 20s.
- **Limite de 750 respostas privadas por hora:** implementado por conta no
  drenador (ver item 7). O limite de Send API por segundo não preocupa no
  volume atual.

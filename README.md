# MARICHAT

[![CI](https://github.com/JotaSXBR/marichat/actions/workflows/ci.yml/badge.svg)](https://github.com/JotaSXBR/marichat/actions/workflows/ci.yml)

Automação oficial de comentários do Instagram: quando alguém comenta uma
palavra-chave, o perfil envia uma DM privada pedindo uma resposta. Quando a
pessoa responde (abre a janela de 24h), ela recebe uma segunda mensagem com o
link. Opcionalmente, o link só é liberado depois de confirmar que ela segue o
perfil.

```
comentário com a palavra-chave
        │
        ▼
webhook assinado (Meta ou Zernio) ──► PostgreSQL (interação + tarefa)
        │                                 │
        ▼                                 ▼
resposta privada (DM 1)  ◄──── fila com retentativas (cron)
        │
        ▼  pessoa responde à DM
webhook de mensagem ──► consulta opcional "segue o perfil?"
        │
        ▼
segunda mensagem com botão de link HTTPS
```

Stack: Next.js 16.4.1 (App Router), TypeScript, Drizzle ORM, PostgreSQL,
Tailwind, Docker. Sem Supabase, sem serviços pagos, sem `pg_cron`.

## O que já está pronto

- Painel administrativo com HTTP Basic, automações (criar/editar/ativar/desativar),
  escolha de publicação (lista oficial da API, com miniatura de vídeos).
- Login oficial do Instagram (`state` em cookie, token de 60 dias cifrado com
  AES-256-GCM, renovação automática).
- Webhook `GET` (verificação) e `POST` (assinatura `X-Hub-Signature-256`),
  deduplicação de eventos e resposta rápida.
- Transporte alternativo pela **Zernio** (`MESSAGING_PROVIDER=zernio`), que já
  tem app Meta aprovado: o motor continua igual e só a entrada/saída mudam
  (`/api/webhook/zernio`, assinatura `X-Zernio-Signature`).
- Fila em PostgreSQL com `FOR UPDATE SKIP LOCKED`, 3 tentativas com espera
  progressiva, expiração pelos prazos da Meta e estado "incerto" sem reenvio.
- Porta de seguidor com cinco modos: direta, tolerante (até 2 checagens),
  travada (só entrega a seguidor confirmado), opcional (Seguir + link na mesma
  mensagem) e direta com aviso sobre a caixa principal.
- Tarefa agendada protegida por segredo (`/api/cron/tick`).
- Diagnóstico em **Conexão**: testa o token e lê `/subscribed_apps` para
  confirmar os campos de webhook realmente assinados.
- Página **Atividade** com as últimas interações, tarefas da fila e webhooks,
  incluindo erros — útil no primeiro teste em produção.
- Respeito ao limite oficial de 750 respostas privadas por hora por conta: a
  tarefa espera a janela deslizante liberar espaço em vez de falhar.
- Páginas públicas `/privacidade` e `/exclusao-de-dados` e callback de exclusão
  de dados da Meta (`/api/data-deletion`).

## Rodar localmente

Pré-requisitos: Node 24 LTS, Docker Desktop, npm.

```powershell
# 1. Banco de teste (porta 5433; nunca use o banco de produção)
docker run -d --name marichat-pg-test `
  -e POSTGRES_USER=marichat -e POSTGRES_PASSWORD=marichat_local_dev `
  -e POSTGRES_DB=marichat -p 127.0.0.1:5433:5432 postgres:18-alpine

# 2. Variáveis locais
Copy-Item .env.example .env.local
# edite .env.local: APP_URL=http://localhost:3000 e DATABASE_URL do banco acima

# 3. Dependências, migrations e servidor
npm ci
npm run db:migrate
npm run dev
```

Painel: `http://localhost:3000/admin` (usuário `admin`, senha de
`ADMIN_PASSWORD`).

Gerar a chave do token e o segredo do cron:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # TOKEN_ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"     # CRON_SECRET
```

### Testes

```powershell
npm test        # unitários + integração no PostgreSQL de teste (porta 5433)
npm run lint     # eslint, sem informação de tipo
npm run lint:ci  # eslint + tipos; falha se os avisos passarem do baseline
npm run typecheck
npm run build
npm run format       # formata com Prettier
npm run format:check # só confere (usado no CI)
npm run clean        # apaga .next/caches regeneráveis (limpeza de disco)
```

O lint usa `recommendedTypeChecked` (informações de tipo) e cobre `src` e
`tests`. As escolhas de regras e a dívida de refatoração estão em
`docs/QUALIDADE.md`.

### Verificação automática (CI)

Todo push em `master` e todo Pull Request rodam `.github/workflows/ci.yml`:
PostgreSQL 18, migrations, `format:check`, `lint:ci`, `typecheck`, testes e
build. Se o lint passar do baseline de avisos (26 em `package.json`) ou qualquer
etapa falhar, o PR fica vermelho. O build não recebe segredos e não acessa o
banco, igual ao Dockerfile.


Os testes de integração só rodam quando `DATABASE_URL` aponta para
`127.0.0.1:5433` ou `localhost:5433`. Eles limpam as tabelas antes de cada caso.
Nenhuma mensagem real é enviada: a API é simulada nos testes de fila.

O PGlite não é usado: a fila depende de `FOR UPDATE SKIP LOCKED` e de conexões
concorrentes reais, que o PGlite (uma única conexão) não reproduz.

### Teste completo local (Instagram simulado)

Valida o fluxo inteiro sem tocar na Meta. Com o banco local ligado:

```powershell
# terminal 1
npm run dev

# terminal 2
npm run demo:local
```

O script sobe um "Instagram falso" em `127.0.0.1:4010`, cadastra uma conta e uma
automação de demonstração, envia o webhook assinado de comentário, roda a fila
pelo endpoint de cron e confere:

- a primeira DM em texto puro, pedindo que a pessoa responda, em resposta
  privada ao comentário;
- a resposta da pessoa abrindo a segunda mensagem com o botão HTTPS;
- o painel e a lista de publicações (incluindo a miniatura do vídeo).

> O demo simula só a API da Meta. Se o `.env.local` estiver com
> `MESSAGING_PROVIDER=zernio`, defina `MESSAGING_PROVIDER=meta` (ou remova a
> linha) e reinicie o `npm run dev` antes de rodar o demo. O script avisa e
> para se detectar a Zernio ligada.

No fim ele imprime o JSON exato que seria enviado. Para isso o `.env.local`
define `INSTAGRAM_GRAPH_BASE_URL=http://127.0.0.1:4010`; essa variável é
**ignorada em produção** (o endereço oficial não pode ser trocado). Sem a API
falsa ligada, o app local não envia nada para a Meta.

## Variáveis de ambiente

| Variável | Obrigatória | Para que serve |
| --- | --- | --- |
| `APP_URL` | sim | Endereço público HTTPS estável (OAuth, links, status de exclusão). |
| `DATABASE_URL` | sim | Conexão PostgreSQL (rede interna do Coolify). |
| `ADMIN_PASSWORD` | sim | Senha do painel (usuário `admin`). |
| `TOKEN_ENCRYPTION_KEY` | sim | 32 bytes em base64; cifra o token do Instagram. |
| `MESSAGING_PROVIDER` | não | `meta` (padrão) ou `zernio`. Define o transporte. |
| `INSTAGRAM_APP_ID` | só com `meta` | App ID do app Business da Meta. |
| `INSTAGRAM_APP_SECRET` | só com `meta` | App Secret (assina os webhooks). |
| `META_WEBHOOK_VERIFY_TOKEN` | só com `meta` | Token que você define no painel da Meta. |
| `ZERNIO_API_KEY` | só com `zernio` | Chave de API da Zernio (Bearer). |
| `ZERNIO_WEBHOOK_SECRET` | só com `zernio` | Segredo do webhook da Zernio (HMAC-SHA256). |
| `CRON_SECRET` | sim | Segredo da tarefa agendada. |
| `PRIVACY_CONTACT_EMAIL` | recomendada | E-mail nas páginas de privacidade/exclusão. |
| `INSTAGRAM_OAUTH_REDIRECT_URI` | opcional | Sobrescreve a URL de callback do OAuth. |
| `INSTAGRAM_API_VERSION` | opcional | Versão da Graph API (padrão `v26.0`). |
| `INSTAGRAM_GRAPH_BASE_URL` | só local | Aponta para a API simulada. Ignorada em produção. |
| `ZERNIO_BASE_URL` | só local | Aponta para uma Zernio simulada (padrão `https://zernio.com/api`). |

Nunca troque `TOKEN_ENCRYPTION_KEY` com uma conta conectada sem antes
reconectar: o token antigo fica ilegível.

## Usar a Zernio como transporte

A Zernio é uma API intermediária que já possui um app aprovado pela Meta. Ao
usá-la, você **não precisa** criar app, pedir permissões nem passar por análise:
basta conectar a conta do Instagram no painel da Zernio. O levantamento completo
da API está em [`docs/ZERNIO.md`](docs/ZERNIO.md).

1. No painel da Zernio, conecte a conta profissional do Instagram.
2. Crie uma **API key** e copie o valor.
3. Defina no servidor:
   - `MESSAGING_PROVIDER=zernio`
   - `ZERNIO_API_KEY=<a chave>`
   - `ZERNIO_WEBHOOK_SECRET=<um segredo aleatório seu>`
4. Reinicie a aplicação e abra **Conexão**. Escolha a conta da Zernio e clique
   em **Conectar conta da Zernio**.
5. Clique em **Registrar webhook na Zernio**. Se preferir criar manualmente no
   painel dela, a URL é `https://SEU_DOMINIO/api/webhook/zernio`, os eventos são
   `comment.received` e `message.received`, e o segredo é o mesmo
   `ZERNIO_WEBHOOK_SECRET`.
6. Rode **Testar conexão** e faça um comentário de teste com uma conta
   secundária.

Regras que continuam valendo: a primeira DM é texto puro (a Zernio/Meta pode
recusar botões para quem não segue e a falha consumiria a única resposta
privada), a segunda mensagem sai na conversa aberta pela resposta da pessoa, e
os cinco modos da porta de seguidor funcionam igual.

Para voltar à Meta direto, troque `MESSAGING_PROVIDER=meta`, preencha as
variáveis da Meta e conecte a conta em **Conexão → Conectar Instagram**.

## Configurar o app na Meta (somente com `MESSAGING_PROVIDER=meta`)

Estas etapas são feitas por você, no painel da Meta (developers.facebook.com).
O app precisa ser do tipo **Business**.

1. Crie o app e adicione o produto **Instagram API with Instagram Login**
   (Business Login for Instagram).
2. Em **Configurações do app → Básico**, copie **App ID** e **App Secret**.
3. Em **Instagram → Business login settings**, cadastre a URL de redirecionamento
   exatamente como `https://SEU_DOMINIO/api/auth/instagram/callback`.
4. Permissões necessárias: `instagram_business_basic`,
   `instagram_business_manage_comments`, `instagram_business_manage_messages`.
   A porta de seguidor usa `is_user_follow_business` no perfil de quem conversa
   (disponível só depois que a pessoa envia uma mensagem).
5. Em **Webhooks**, configure:
   - Callback URL: `https://SEU_DOMINIO/api/webhook`
   - Verify token: o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN`
   - Campos assinados: `comments`, `messages` e `messaging_postbacks` (o
     postback é o toque em "Já segui")
6. Enquanto o app estiver em modo de desenvolvimento, adicione sua conta do
   Instagram em **Funções / Testadores** para conseguir autorizar.
7. Para uso por qualquer pessoa, o app precisa ficar **Live**, com **Advanced
   Access** nas permissões, revisão de app e verificação de empresa (Meta).

Depois de conectar a conta pelo painel, o próprio MARICHAT assina os webhooks
dela (`/subscribed_apps`). Se essa etapa falhar, use **Reassinar webhooks** em
`/admin/conexao`.

## Deploy no Coolify

1. Envie este repositório para o GitHub (privado).
2. No Coolify, crie um **PostgreSQL 18** e guarde a URL interna.
3. Crie uma aplicação a partir do repositório, build pack **Dockerfile**,
   porta `3000`, uma réplica.
4. Configure o domínio com HTTPS e defina `APP_URL` com esse domínio.
5. Cadastre todas as variáveis da tabela acima (ambiente de produção),
   incluindo `MESSAGING_PROVIDER` e as credenciais do transporte escolhido.
6. Health check: `GET /api/health`.
7. Faça o deploy. O container aplica as migrations do Drizzle antes de iniciar o
   servidor; se a migração falhar, o container não sobe (fail fast).
8. Crie a **tarefa agendada** do Coolify, a cada minuto:

```sh
curl -fsS -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/cron/tick
```

9. Ative backups do PostgreSQL no Coolify.
10. Abra `https://SEU_DOMINIO/admin`, conecte o Instagram e crie a primeira
    automação.

Rollback: mantenha a imagem anterior no Coolify. As migrations são apenas
aditivas até aqui; antes de qualquer migration destrutiva, faça backup.

## Operação

O resumo de uma página está em [`docs/OPERACAO.md`](docs/OPERACAO.md). As
referências e decisões da porta de seguidor estão em
[`docs/REFERENCIAS.md`](docs/REFERENCIAS.md).
Pontos que não podem ser esquecidos:

- **"Aceita" não é "entregue".** A Meta não informa confirmação de entrega nem
  de leitura no Instagram. O painel mostra "DM enviada (aceita)".
- **Incerteza não reenvia sozinha.** Se o processo cair no meio de um envio ou a
  rede falhar sem resposta, a tarefa fica `uncertain` para evitar mensagem
  duplicada.
- **Prazos da Meta:** resposta privada ao comentário em até 7 dias (usamos
  2 minutos de margem) e link somente dentro de 24h após a resposta da pessoa.
- **A porta de seguidor tem modos com regras explícitas:** o modo tolerante
  libera após no máximo duas checagens ou quando a Meta não informa o status; o
  modo travado só libera com confirmação positiva (`is_user_follow_business =
  true`) e mantém o pedido enquanto não houver confirmação. Os modos opcional e
  direto já entregam o link e não consultam o perfil.
- **Mensagens de quem não segue podem cair em Requests.** A documentação da Meta
  confirma que conversas de não seguidores ficam em Requests até serem
  aceitas/respondidas; depois disso, as próximas mensagens vão para a caixa
  principal. É isso que o aviso do modo direto informa.
- **Conteúdo congelado:** editar uma automação só afeta comentários novos.
- **Uma conta por instalação** no MVP.
- **Sem `pg_cron`/`pg_net`:** a fila anda pela tarefa agendada do Coolify.

## Privacidade e exclusão de dados

- Política pública: `/privacidade`.
- Instruções e consulta por código: `/exclusao-de-dados`.
- Callback exigido pela Meta: `POST /api/data-deletion` com `signed_request`
  (valida HMAC-SHA256, apaga interações/mensagens do usuário e registra apenas
  o hash do identificador).
- Payloads de webhook e de mensagens são limpos após 30 dias.

## Estrutura

```
src/app/admin/            painel (páginas + Server Actions)
src/app/api/webhook/      webhook da Meta (GET/POST)
src/app/api/webhook/zernio webhook da Zernio (POST assinado)
src/app/api/auth/...      login OAuth do Instagram
src/app/api/cron/tick/    tarefa agendada
src/app/api/data-deletion callback de exclusão
src/lib/queue/          fila: claim, envio, follow-check, retry, token, limpeza
src/lib/webhook/process.ts regras de comentário e DM
src/lib/webhook/zernio.ts tradução dos eventos da Zernio
src/lib/instagram/        config, cliente Graph API, OAuth
src/lib/zernio/           cliente, assinatura, configuração e diagnóstico
src/lib/db/               schema e cliente Drizzle
drizzle/                  migrations SQL
scripts/migrate.mjs       migrations no start do container
tests/                    unitários e integração
```

## Pendências antes de produção

- Validar em conta real se a Meta devolve `is_user_follow_business` no perfil de
  quem conversa. No modo travado, a ausência do campo mantém a conversa retida
  (por definição, não há como confirmar o follow); nos demais modos o link é
  liberado ou entregue sem checagem.
- Com a Zernio, confirmar em conta real que `comment.received` chega para posts
  antigos e que o status de seguidor vem preenchido; os testes cobrem apenas o
  formato documentado.
- Criar o app Meta, obter credenciais, revisar permissões e publicar o app —
  **somente se** usar `MESSAGING_PROVIDER=meta`.
- Definir o e-mail de privacidade (`PRIVACY_CONTACT_EMAIL`).
- Revisar a política de privacidade com quem for responsável pelo perfil.

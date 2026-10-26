# MARICHAT

Automação oficial de comentários do Instagram: quando alguém comenta uma
palavra-chave, o perfil envia uma DM privada com um botão. Ao tocar no botão, a
pessoa recebe uma segunda mensagem com o link.

```
comentário com a palavra-chave
        │
        ▼
webhook assinado da Meta ──► PostgreSQL (interação + tarefa)
        │                                 │
        ▼                                 ▼
resposta privada (DM 1)  ◄──── fila com retentativas (cron)
        │
        ▼  pessoa toca em "Quero o link"
webhook de mensagem ──► segunda mensagem com botão de link HTTPS
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
- Fila em PostgreSQL com `FOR UPDATE SKIP LOCKED`, 3 tentativas com espera
  progressiva, expiração pelos prazos da Meta e estado "incerto" sem reenvio.
- Tarefa agendada protegida por segredo (`/api/cron/tick`).
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
npm run lint
npm run typecheck
npm run build
```

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

- a primeira DM com o botão `Quero o link`, em resposta privada ao comentário;
- o toque no botão abrindo a segunda mensagem com o botão HTTPS;
- o painel e a lista de publicações (incluindo a miniatura do vídeo).

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
| `INSTAGRAM_APP_ID` | sim | App ID do app Business da Meta. |
| `INSTAGRAM_APP_SECRET` | sim | App Secret (assina os webhooks). |
| `META_WEBHOOK_VERIFY_TOKEN` | sim | Token que você define no painel da Meta. |
| `CRON_SECRET` | sim | Segredo da tarefa agendada. |
| `PRIVACY_CONTACT_EMAIL` | recomendada | E-mail nas páginas de privacidade/exclusão. |
| `INSTAGRAM_OAUTH_REDIRECT_URI` | opcional | Sobrescreve a URL de callback do OAuth. |
| `INSTAGRAM_API_VERSION` | opcional | Versão da Graph API (padrão `v26.0`). |
| `INSTAGRAM_GRAPH_BASE_URL` | só local | Aponta para a API simulada. Ignorada em produção. |

Nunca troque `TOKEN_ENCRYPTION_KEY` com uma conta conectada sem antes
reconectar: o token antigo fica ilegível.

## Configurar o app na Meta

Estas etapas são feitas por você, no painel da Meta (developers.facebook.com).
O app precisa ser do tipo **Business**.

1. Crie o app e adicione o produto **Instagram API with Instagram Login**
   (Business Login for Instagram).
2. Em **Configurações do app → Básico**, copie **App ID** e **App Secret**.
3. Em **Instagram → Business login settings**, cadastre a URL de redirecionamento
   exatamente como `https://SEU_DOMINIO/api/auth/instagram/callback`.
4. Permissões necessárias: `instagram_business_basic`,
   `instagram_business_manage_comments`, `instagram_business_manage_messages`.
5. Em **Webhooks**, configure:
   - Callback URL: `https://SEU_DOMINIO/api/webhook`
   - Verify token: o mesmo valor de `META_WEBHOOK_VERIFY_TOKEN`
   - Campos assinados: `comments` e `messages`
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
5. Cadastre todas as variáveis da tabela acima (ambiente de produção).
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

O resumo de uma página está em [`docs/OPERACAO.md`](docs/OPERACAO.md).
Pontos que não podem ser esquecidos:

- **"Aceita" não é "entregue".** A Meta não informa confirmação de entrega nem
  de leitura no Instagram. O painel mostra "DM enviada (aceita)".
- **Incerteza não reenvia sozinha.** Se o processo cair no meio de um envio ou a
  rede falhar sem resposta, a tarefa fica `uncertain` para evitar mensagem
  duplicada.
- **Prazos da Meta:** resposta privada ao comentário em até 7 dias (usamos
  2 minutos de margem) e link somente dentro de 24h após a resposta da pessoa.
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
src/app/api/auth/...      login OAuth do Instagram
src/app/api/cron/tick/    tarefa agendada
src/app/api/data-deletion callback de exclusão
src/lib/queue/drain.ts    fila, retentativas, prazos, token
src/lib/webhook/process.ts regras de comentário e DM
src/lib/instagram/        config, cliente Graph API, OAuth
src/lib/db/               schema e cliente Drizzle
drizzle/                  migrations SQL
scripts/migrate.mjs       migrations no start do container
tests/                    unitários e integração
```

## Pendências antes de produção

- Validar em conta real se a resposta privada aceita `quick_replies` (a
  documentação pública mostra apenas texto). Se a Meta recusar, será necessário
  ajustar o formato ou solicitar suporte; o restante do fluxo não muda.
- Criar o app Meta, obter credenciais, revisar permissões e publicar o app.
- Definir o e-mail de privacidade (`PRIVACY_CONTACT_EMAIL`).
- Revisar a política de privacidade com quem for responsável pelo perfil.

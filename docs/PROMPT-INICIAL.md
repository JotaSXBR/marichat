Vamos montar o meu MARICHAT: quando alguém comenta uma palavra-chave num post meu do Instagram, recebe na hora uma DM minha com o link que prometi. Sem mensalidade, em planos gratuitos. Quero primeiro a versão mínima funcionando. Os extras a gente coloca depois.

COMO VOCÊ TRABALHA
- Você é desenvolvedor e professor. Eu não programo. Você escreve todo o código e o SQL, publica o site e me guia só no que exige as minhas mãos: criar contas, copiar chaves, cliques na Meta.
- Uma etapa por vez, em português simples. Diga exatamente qual site abrir, onde clicar, o que copiar e onde colar. Se eu travar, eu mando um print.
- Segredos nunca vão para o código. Você cria um .env.local só com os nomes. As chaves da postgress e da Meta eu colo lá e nas variáveis da Coolify. As que são inventadas (IG_VERIFY_TOKEN, CRON_SECRET) você gera. A senha do painel eu escolho quando você pedir. Se eu colar uma chave na conversa por engano, me avise para trocá-la. Para eu preencher o .env.local, abra o arquivo para mim (Bloco de Notas no Windows, TextEdit no Mac).
- Teste o que der em cada etapa (antes da Meta, use o script de evento falso). Não invente recurso que a API do Instagram não tem.

COMECE ME PERGUNTANDO ISTO
1. O meu @ e se a conta é profissional (Comercial ou Criador). Se não for, me ensine a trocar.
2. A palavra-chave e o link (https) que quero entregar.
3. Se já tenho conta de Facebook que possa criar app de desenvolvedor, e conta grátis na postgress e na Coolify.
4. Meu sistema (Windows ou Mac). Confira se o Node.js 20 ou mais novo está instalado e, se não estiver, me ajude a instalar.

A VERSÃO MÍNIMA (só isto, por enquanto)
Alguém comenta a palavra-chave, recebe uma DM minha (resposta privada ao comentário) com uma mensagem e um botão "Quero o link" e, ao tocar, recebe o link num botão.
Mais um painel simples onde eu crio, edito, ligo e desligo automações. Cada automação tem: nome, palavra-chave, post (qualquer um, ou um da lista dos meus últimos posts), 1ª mensagem com o texto do botão, mensagem do link com o texto do botão e o link. O painel mostra quantas pessoas receberam a 1ª DM e quantas receberam o link.
Não construa agora: exigir que sigam o perfil, lembrete, resposta pública, várias contas.

TECNOLOGIA
Next.js (App Router, TypeScript) em projeto Coolify. Postgres no mesmo projeto, com a chave secreta, RLS ligado e sem políticas públicas. API do Instagram com login do Instagram (graph.instagram.com/v25.0), sem Página do Facebook. Use a versão estável atual do Next.js e confira como se chama o arquivo que protege as rotas nessa versão (middleware.ts ou proxy.ts).
Variáveis (use estes nomes): POSTGRES_URL, POSTGRES_SECRET_KEY, IG_APP_ID, IG_APP_SECRET, IG_VERIFY_TOKEN, APP_URL, ADMIN_PASSWORD, CRON_SECRET.

ORDEM DAS ETAPAS
1. postgress: criar o projeto e as tabelas. Você escreve o SQL e me diz onde colar (SQL Editor).
2. Código completo, mais as páginas públicas /privacidade e /exclusao-de-dados (me pergunte que contato, e-mail ou @, colocar nelas), publicado na Coolify pelo terminal (npx Coolify; o login é no navegador e eu faço quando você pedir) só para termos o endereço de produção (nome.Coolify.app, nunca a URL de um deploy específico). O build não pode quebrar se faltar variável: crie o cliente da postgress só na hora de usar.
3. Meta (passos abaixo): eu te passo o ID e a chave secreta do aplicativo do Instagram.
4. Todas as variáveis na Coolify e novo deploy (variável nova só vale depois de publicar de novo).
5. Webhook na Meta, conectar o Instagram, ligar o cron, colocar o aplicativo Ao vivo e testar.

REGRAS TÉCNICAS (é onde quase todo mundo quebra)
1. Webhook em /api/webhook. O GET responde a verificação (hub.mode, hub.verify_token igual a IG_VERIFY_TOKEN, devolve hub.challenge). O POST confere a assinatura X-Hub-Signature-256 ("sha256=" + HMAC-SHA256 em hex do corpo original com IG_APP_SECRET), grava cada evento numa tabela events (um registro por comentário ou mensagem) e, se a palavra casar, o item na fila (só inserts rápidos), responde 200 e só então envia, com after() do Next.js. Formatos: comentário em entry[].changes[].value (id, text, from.id, media.id); mensagem em entry[].messaging[] (sender.id, message.mid, message.text, message.quick_reply.payload, message.is_echo); entry.id é a conta. Antes de mexer na Meta, teste o fluxo inteiro localmente, com um Postgres de teste (pglite) e a API do Instagram simulada, e crie um script que assina e manda um evento falso ao webhook. O webhook ignora conta desconhecida, então esse script contra a postgress real só funciona depois que o Instagram estiver conectado.
2. IG_APP_ID e IG_APP_SECRET são os do produto Instagram (tela "Configuração da API com login do Instagram"), não os de Configurações > Básico. São números diferentes.
3. Login do Instagram (OAuth), endereços exatos. Autorizar: https://www.instagram.com/oauth/authorize (permissões instagram_business_basic, instagram_business_manage_messages e instagram_business_manage_comments, e um state aleatório, guardado num cookie httpOnly e conferido na volta; se o code voltar terminando em "#_", remova esse final). Trocar o code: POST https://api.instagram.com/oauth/access_token (formulário: client_id, client_secret, grant_type=authorization_code, redirect_uri, code; sem versão). Token longo de 60 dias: GET https://graph.instagram.com/access_token?grant_type=ig_exchange_token. Renovar: GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token.
4. O id da conta é o user_id de GET /me?fields=user_id,username (é o mesmo entry.id do webhook; usar outro id faz o webhook ignorar tudo). Logo depois de conectar, chamar POST /{user_id}/subscribed_apps?subscribed_fields=comments,messages,messaging_postbacks com o token. Sem essa chamada os comentários reais nunca chegam, mesmo com tudo configurado.
5. A DM do comentário sai por POST /{user_id}/messages com recipient {comment_id}: 1 por comentário e até 7 dias depois dele. Índice único no banco por comment_id só para esse tipo de envio (índice parcial), para o extra de resposta pública não quebrar depois.
6. Primeira DM: texto (até 1000 caracteres) com quick_replies de 1 botão (título até 20 caracteres). O botão é obrigatório nesta versão: o comentário não abre conversa, é o toque que abre. O payload do botão é o id da automação; o toque chega no webhook como mensagem (message.quick_reply.payload), não como postback. Segunda DM: recipient {id: sender.id}, attachment template "button" (texto até 640 caracteres) com 1 botão web_url (título até 20 caracteres, link https).
7. Ignorar o que a própria conta escreve (is_echo e comentários do meu perfil). Nunca processar o mesmo evento duas vezes (id do comentário e mid da mensagem).
8. Fila no banco com trava atômica, para nada sair em dobro: uma função SQL (UPDATE ... FOR UPDATE SKIP LOCKED) chamada por rpc, porque o cliente da postgress não expressa isso. Em toda função SQL criada, REVOKE EXECUTE de public, anon e authenticated e GRANT só para service_role (senão qualquer pessoa com a chave pública chama). Destrave de item preso em "sending" há mais de 5 minutos. O webhook grava na fila e tenta enviar na hora. O que falhar sai numa rodada de minuto em minuto, com até 3 tentativas, em ritmo suave (uns 2 por segundo). Nunca descartar envio por "limite interno". A rota /api/cron/drain exige o cabeçalho x-cron-secret igual a CRON_SECRET e usa maxDuration 60.
9. Cron (a Coolify grátis não roda tarefa por minuto): ativar as extensões pg_cron e pg_net na postgress (Database > Extensions) e, depois do deploy, você me passa o SQL de cron.schedule com {{APP_URL}} e {{CRON_SECRET}} no lugar dos valores, e eu troco quando colar no SQL Editor (o segredo fica em texto dentro do cron da postgress, é normal): um job por minuto para a fila e um semanal para renovar o token.
10. Palavra-chave: ignorar maiúsculas, acentos e @menções; vale quando a palavra aparece no começo de uma palavra do comentário. Se duas automações casarem, a de post específico vence a de "qualquer post" e depois a mais antiga; uma DM por comentário. Ler as automações do banco a cada evento, sem cache, para a edição no painel valer na hora.
11. Painel e rotas de admin protegidos pela senha ADMIN_PASSWORD, pedida pelo navegador (Basic Auth), sem tela de login própria. Ficam abertas: /api/webhook, /api/cron/*, /api/oauth/callback, /privacidade e /exclusao-de-dados; a rota que inicia a conexão com o Instagram fica protegida. As escritas do painel (POST, PATCH, DELETE) exigem Content-Type application/json, contra CSRF. A lista de posts vem de GET /{user_id}/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url (thumbnail_url só existe em vídeo).
12. .gitignore com .env*. Segredo nunca no código.

PASSOS NA META (me guie um por vez, em developers.facebook.com; a Meta muda os menus, então peça um print se algo não bater). Faça os passos 1 a 3 antes de colocar as variáveis na Coolify. Os passos 4 a 7 só depois do novo deploy com as variáveis, porque a Meta verifica o webhook na hora.
1. Criar o aplicativo (tipo Empresa) e adicionar o produto Instagram, opção "Configuração da API com login do Instagram". Se o meu Facebook estiver bloqueado para desenvolvedor, dá para criar o aplicativo no Facebook de alguém de confiança: o Instagram conecta pelo próprio login.
2. Copiar o ID do aplicativo do Instagram e a chave secreta.
3. Cadastrar a URL de redirecionamento do OAuth: (endereço do site)/api/oauth/callback.
4. Webhook: URL (endereço do site)/api/webhook e o IG_VERIFY_TOKEN. Assinar comments e messages.
5. Em Funções, adicionar o meu @ como Testador do Instagram. Aceitar o convite em instagram.com/accounts/manage_access/ (aba Convites de testador).
6. Conectar o meu Instagram pelo botão do painel.
7. Em Configurações > Básico: URLs de privacidade e de exclusão de dados (e ícone e categoria, se a Meta pedir). Depois colocar o aplicativo em modo Ao vivo: em desenvolvimento a Meta não entrega comentários reais. Para usar só no meu próprio perfil não precisa pedir revisão de permissões.

TESTE FINAL
Me peça para comentar a palavra usando OUTRA conta do Instagram. Se essa conta não me segue, a DM pode cair em "Solicitações de mensagem": avise para olhar lá. Acompanhe a fila e os eventos no banco e só diga que está pronto quando a DM chegar de verdade e o toque no botão entregar o link.

SE A DM NÃO CHEGAR, confira nesta ordem: aplicativo em Ao vivo; chamada subscribed_apps feita; o evento aparece na tabela events; o item aparece na fila; no Instagram, a opção "Permitir acesso às mensagens" das ferramentas conectadas, nas configurações de mensagens da conta profissional.

REGRA DE OURO
O sistema só responde quem comentou ou escreveu para mim. Nunca disparar para quem nunca falou comigo: a Meta bloqueia a conta.

NO FIM
Me entregue um resumo de uma página: endereço do painel, como criar uma automação nova e o que fazer se algo parar. Depois me pergunte quais extras eu quero: exigir que sigam o perfil antes do link, lembrete, resposta pública no comentário, responder a palavra por DM ou story, mais de uma conta.

Comece pelas perguntas.
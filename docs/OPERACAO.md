# MARICHAT — resumo operacional (1 página)

## Rotina diária (2 minutos)

1. Abra `https://SEU_DOMINIO/admin`.
2. Confira os cartões **Aguardando resposta**, **Links enviados** e
   **Precisam de atenção**.
3. Se houver aviso de token, conexão ou webhook, abra **Conexão**.
4. Se "Precisam de atenção" aumentar, abra **Atividade**: lá estão o comentário,
   o envio e o erro de cada tarefa.
5. Depois de qualquer mudança no app da Meta, rode **Testar conexão** em
   Conexão: ele confere o token e os campos de webhook assinados.

## Criar uma automação

1. **Automações → Nova automação**.
2. Nome interno (só você vê).
3. Palavra-chave: compare sem diferenciar maiúsculas, acentos ou pontuação;
   precisa ser a palavra inteira (`quero` não casa com `queroo`).
4. Escolha **qualquer publicação** ou uma publicação específica.
5. DM 1: texto (até ~1.000 bytes). Termine pedindo que a pessoa responda:
   é a resposta que abre a janela de 24h e libera o link.
6. DM 2: texto (até 80 caracteres), botão (até 20) e link **https://**.
7. Escolha o modo da **Porta de seguidor**:
   - **Sem porta:** o link vai direto após a resposta.
   - **Tolerante:** pede para seguir, faz até 2 checagens e libera mesmo sem
     confirmação.
   - **Travado:** só entrega o link com confirmação positiva da Meta.
   - **Opcional:** uma mensagem com os botões "Seguir" e "Abrir link".
   - **Direto:** só o link, com aviso de que seguir leva as próximas mensagens
     à caixa principal.
   Ajuste os textos e botões conforme o modo. Desligada/“sem porta” por padrão.
8. Marque **Ativa** e salve.
9. Teste com uma **conta secundária**: comente a palavra-chave, abra a DM,
   responda e confirme o comportamento do modo escolhido.

Editar uma automação **não** altera a primeira DM já agendada. O modo da porta
e os textos da segunda mensagem são lidos no momento do envio e valem também
para conversas em andamento.

## Situações no painel

| Situação | Significado | Ação |
| --- | --- | --- |
| Na fila | Aguardando envio pelo cron | Nenhuma (roda a cada minuto) |
| DM enviada (aceita) | Meta aceitou a requisição; não é confirmação de entrega | Nenhuma |
| Aguardando confirmação | Porta de seguidor travada/tolerante; link retido até a checagem | Nenhuma (tolerante libera em até 2 checagens; travado espera confirmação) |
| Link enviado | Segunda mensagem aceita | Nenhuma |
| Incerta | Não sabemos se a Meta recebeu | **Não reenviar**: pode duplicar |
| Expirada | Passou de 7 dias (DM 1) ou 24h (link) | Nenhuma; prazo da Meta |
| Falhou | Erro definitivo (token, permissão, texto inválido) | Ver erro e reconectar/corrigir |

## Se algo der errado

- **Token expirado/revogado:** Conexão → Reconectar. Envios ficam parados até lá.
- **Webhooks não chegam:** Conexão → **Testar conexão**.
  - Com Meta: confira a callback `https://SEU_DOMINIO/api/webhook`, os campos
    `comments`, `messages` e `messaging_postbacks` no app **e** na conta; use
    **Reassinar webhooks**.
  - Com Zernio: confira a callback `https://SEU_DOMINIO/api/webhook/zernio`, os
    eventos `comment.received`/`message.received` e o `ZERNIO_WEBHOOK_SECRET`;
    use **Registrar webhook na Zernio**.
- **Nada é enviado:** abra **Atividade** para ver a fila e os erros; confira a
  tarefa agendada no Coolify (a cada minuto) e os logs do container.
- **Muitos comentários de uma vez:** a fila respeita o limite de 750 respostas
  privadas por hora. Acima disso, as tarefas ficam como `RATE_LIMITED` na
  Atividade e são retomadas quando a janela libera — não é falha definitiva.
- **Mensagem duplicada:** nunca "reprocessar" uma tarefa `uncertain` sem
  conferir a conversa no Instagram.
- **Pedido de exclusão de dados:** use `/exclusao-de-dados` ou o callback da
  Meta; o pedido é concluído automaticamente.

## Regras de ouro

1. Nunca cole senhas, tokens ou App Secret em conversas, prints ou issues.
2. Nunca teste automações na conta principal com seguidores reais sem avisar.
3. Não altere `TOKEN_ENCRYPTION_KEY` com a conta conectada.
4. Antes de deploy ou migration destrutiva: backup do PostgreSQL.
5. "Aceita" não significa "entregue"; o Instagram não fornece essa confirmação.
6. Uma conta do Instagram por instalação no MVP.

## Onde estão as coisas

- Painel: `/admin` (usuário `admin`).
- Webhook da Meta: `/api/webhook`.
- Saúde: `/api/health`.
- Cron: `/api/cron/tick` (Bearer `CRON_SECRET`).
- Privacidade: `/privacidade` · Exclusão: `/exclusao-de-dados`.
- Logs e variáveis: Coolify, na aplicação `marichat`.
- Segredos: gerenciador de senhas da conta; não no código.

## Limpeza de disco (builds e caches)

Cada deploy guarda uma imagem Docker antiga para permitir rollback. Sem limpeza,
o disco do servidor enche e o próximo deploy falha. São dois lugares diferentes:

### 1. Servidor (Coolify) — limpeza automática

Configurar uma vez, no painel do Coolify:

1. Abra **Servers** na barra lateral e escolha o servidor.
2. No menu do servidor, abra **Docker Cleanup**.
3. Em **Cleanup frequency**, use `0 0 * * *` (todo dia à meia-noite).
4. Em **Cleanup trigger**, escolha **Only above disk threshold** e deixe o
   **Disk threshold** em `80` (só limpa quando o disco passar de 80%).
5. Em **Advanced cleanup**, deixe:
   - **Unused volumes** = *Keep unused volumes* (o banco usa volume; apagar
     pode significar perda de dados);
   - **Unused networks** = *Keep unused networks*;
   - **Application images** = *Keep retained images* (mantém o rollback).
6. Salve e clique em **Run cleanup** uma vez para conferir. Em **Recent
   executions**, veja se terminou sem erro e quanto de disco foi liberado.

Para o MARICHAT, deixe **Images to keep** em `2` na aplicação (aba
**Rollback**). Assim existem a versão atual e a anterior para voltar atrás, e
as mais antigas são removidas na limpeza.

### 2. Computador local — comando `npm run clean`

A pasta `.next` (resultado do build) e o cache do Next são descartáveis. Para
limpar:

```powershell
cd C:\Projetos\marichat
npm run clean
```

O comando apaga `.next`, `coverage`, `.turbo` e `tsconfig.tsbuildinfo`, mostra
quanto liberou e não toca em código, banco nem `.env.local`. O próximo
`npm run dev` ou `npm run build` recria tudo.

Se quiser automatizar no Windows, crie uma tarefa no **Agendador de Tarefas**
apontando para `npm` com os argumentos `run clean`, começando em
`C:\Projetos\marichat`, uma vez por mês. Não é obrigatório: o comando pode ser
rodado manualmente sempre que o disco apertar.

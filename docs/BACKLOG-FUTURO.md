# MARICHAT — backlog futuro (segunda leva)

Data: 2026-10-29. Pesquisa de mercado para a segunda leva de melhorias, usando o MARICHAT como referência. Não é roadmap aprovado: é insumo para decidir o que construir depois da Seção 1 do `docs/BACKLOG.md` e da validação em conta real.

## 1. Resumo

- A Seção 4 do backlog atual continua valendo: lembrete, gatilho por DM/story, multi-conta, relatórios e excluir automação **não são novidade** (Seção 5).
- A pesquisa encontrou 10 ideias novas que cabem no produto sem IA, sem raspagem e sem serviço pago obrigatório.
- As três mais fortes: limite por pessoa, vários gatilhos/palavras excluídas e visibilidade da fila em picos.
- Duas mexem no modelo de dados de forma pequena, mas estruturante: identidade por pessoa e clique no link.
- O que os concorrentes empacotam como "plataforma" (flow builder, CRM, IA, broadcast, publicação) fica de fora; ver Seção 8.

## 2. Método e limitações

Método: leitura do `README.md`, `docs/BACKLOG.md`, `DESIGN.md` (§1 e §11), `docs/PROMPT-INICIAL.md`, `docs/OPERACAO.md`, `docs/ZERNIO.md` e `src/lib/db/schema.ts`; depois pesquisa web em documentação oficial da Meta, centrais de ajuda e páginas de fornecedores. Nenhum código foi alterado e nenhum teste foi executado.

Limitações: as páginas de fornecedores são marketing e descrevem o que o produto promete, não o que testamos; a página de preços do ManyChat respondeu 403 e não foi usada, então não há comparação de preço; não houve entrevista com operadores nem teste em conta real; as fontes são em inglês e refletem o mercado internacional; "não confirmado" aparece quando a fonte não sustenta a afirmação.

## 3. Mercado em uma página

| Ferramenta | O que oferece hoje | Fonte |
| :-- | :-- | :-- |
| ManyChat | Comentário em post/reel, palavras incluídas e excluídas, resposta pública com variações, preview no Instagram, story reply, story mention, tags e randomizador | S5–S7 |
| LinkDM | AutoDM para post, reel, story reply e story mention, click analytics, modelos de DM, fila, "slow down", reenvio (Rewind) e até 3/10 contas | S8 |
| InstantDM | Comentário, story reply, comentário em live, próximo post, agendamento com AutoDM, follow-up, insights e 800 DMs/hora | S9 |
| ReplyRush | SendBack (recuperar DMs perdidas), Excess DM Queue, story mention, porta de seguidor, captura de e-mail e IA | S10 |
| Chatfuel | Comentário para DM e depois qualificação no WhatsApp, com atribuição de campanha | S11 |
| InstaChamp / MobileMonkey | Produto legado do Customers.ai; relatos de terceiros dizem que não é mais foco. Não confirmado pela empresa | S12, S14, S15 |
| Zernio | Transporte oficial que já usamos; também tem automações nativas com `repeatPolicy` e `dedupeSameTextHours` | S13 |

Leitura: quase todos viraram "flow builder + CRM + IA". O MARICHAT não precisa disputar isso. O nicho dele é entrega de um link, com uma conta, sem mensalidade obrigatória e sem app Meta próprio quando usado com a Zernio.

Limites da Meta que valem para todas as ideias: uma resposta privada por comentário, em até 7 dias, e continuação só depois que a pessoa responde, dentro de 24 horas [S1, S2]; 750 respostas privadas por hora por conta [S4]; conversa só começa quando a pessoa fala com o perfil, e story mention é uma das portas documentadas [S1]; quem não segue pode cair em Requests, sem pasta nem leitura na API [S1].

## 4. Restrições do produto

Toda ideia abaixo foi filtrada por estas regras: automação oficial via Meta ou Zernio; nada de raspar Instagram, extensão de navegador ou login por senha; sem serviço pago obrigatório; uma conta por instalação no MVP; sem IA no painel na v1; o operador só responde quem comentou ou escreveu primeiro; "aceita" não é "entregue". Ideias que quebram alguma regra estão na Seção 8, com o motivo.

## 5. Seção 4 do backlog atual (não é novidade)

| Item já previsto | Como a pesquisa viu | Novidade? |
| :-- | :-- | :-- |
| Lembrete para quem não respondeu | LinkDM fala em sequência de DMs e lembretes; InstantDM tem follow-up [S8, S9] | Não |
| Gatilho por DM ou story | ManyChat e LinkDM têm story reply e story mention como gatilhos distintos; InstantDM tem story e live [S5–S9] | Não; a pesquisa só detalha que "story" são dois gatilhos |
| Mais de uma conta | LinkDM oferece 3 contas no Pro e 10 no plano maior; o schema já aponta tudo para `instagram_accounts` [S8] | Não |
| Relatórios por período | Chatfuel vende atribuição; LinkDM tem click analytics; InstantDM tem insights [S8, S9, S11] | Não |
| Excluir automação | Não apareceu como diferencial; é higiene de painel | Não |

Sequência: fazer lembrete **depois** de limite por pessoa e clique no link. Sem esses dois, o lembrete aumenta volume sem provar que ajudou.

## 6. Ideias novas

### 6.1 Limite de DM por pessoa, entre posts e automações

- **Problema.** A mesma pessoa comenta em três posts e recebe três DMs. Parece spam, gasta a cota de 750/h e repete o pedido de follow.
- **Concorrente.** O ManyChat só dispara no primeiro comentário da pessoa em cada post/reel, por limitação da Meta; em story mention deixa escolher "toda menção" ou "uma a cada 24h" [S5, S7]. A Zernio tem `repeatPolicy` e `dedupeSameTextHours` [S13].
- **Hoje.** O MARICHAT é único por `commentId`; a mesma pessoa gera várias interações e várias DMs, e não existe visão por pessoa.
- **Falta.** Chave `(account_id, igsid)`, política (`sempre`, `uma vez`, `uma a cada N dias`) e escopo (automação ou conta). Ao pular, gravar o motivo para a Atividade não mentir. Migração aditiva e teste de precedência.
- **Valor/esforço/risco.** Alto / M / baixo. Reduz spam e pressão na fila; não depende de nada novo da Meta.

### 6.2 Vários gatilhos e palavras excluídas por automação

- **Problema.** "quero", "link", "guia" e "material" deveriam levar ao mesmo lugar; "não quero" e "já tenho" não deveriam disparar nada. Hoje o operador duplica automações e cai na regra "post específico vence, depois a mais antiga".
- **Concorrente.** O ManyChat aceita lista de palavras incluídas, lista de excluídas e "qualquer comentário" no mesmo gatilho [S5].
- **Hoje.** `automations.keyword` é um texto único; não há exclusão.
- **Falta.** Tabela (ou `text[]`) de gatilhos, lista de exclusão, chips no editor, migração do campo atual e testes de correspondência. A precedência precisa continuar explicável no painel.
- **Valor/esforço/risco.** Alto / M / baixo. Evita automações duplicadas e respostas erradas.

### 6.3 Capacidade da fila visível em picos

- **Problema.** Um reel viral enche a fila. O operador vê "Precisam de atenção", mas não sabe quantos estão na frente, em quanto tempo saem, nem quais expiram antes dos 7 dias.
- **Concorrente.** ReplyRush vende Excess DM Queue e SendBack; LinkDM tem DM Queue e Slow Down; InstantDM anuncia 800 DMs/hora [S8–S10].
- **Hoje.** A fila já respeita 750/h, marca `RATE_LIMITED` e não descarta; falta transformar isso em leitura operacional.
- **Falta.** Consulta agregada por estado, ETA pela janela deslizante, contagem que expira em 24h e limite de alerta. Sem mudança de schema.
- **Valor/esforço/risco.** Médio / P / baixo. "SendBack" não é necessário: o MARICHAT não perde a tarefa, só não mostra o tamanho do problema.

### 6.4 Teste assistido no Instagram

- **Problema.** O primeiro teste real falha por webhook não assinado, DM em Requests ou botão recusado. O operador descobre com seguidores olhando, e o teste suja as métricas.
- **Concorrente.** O preview do ManyChat mostra a automação dentro do ManyChat ou direto no Instagram [S5–S7]. É preview, não teste de webhook.
- **Hoje.** Existe `npm run demo:local` com Instagram falso e instruções manuais em `OPERACAO.md`; não existe marca de "teste" no banco.
- **Falta.** `is_test` em interação/tarefa, checklist guiado com conta secundária, exclusão das métricas e aviso de que a resposta privada é única. Não dá para simular DM privada sem comentário real; o teste precisa ser um comentário de verdade.
- **Valor/esforço/risco.** Alto / M / baixo. Consome uma DM real, nada além disso.

### 6.5 Duplicar automação e modelos

- **Problema.** Cada campanha ou post exige recriar textos, botões e modo de follow; erro de digitação vira DM errada.
- **Concorrente.** LinkDM tem DM Templates para salvar e reutilizar [S8]. O ManyChat reutiliza fluxos, mas a fonte consultada não detalha "modelo" [S5].
- **Hoje.** Só criar e editar; não há cópia nem modelo embutido.
- **Falta.** Ação "Duplicar" (copia a linha, acrescenta sufixo, nasce inativa) e dois ou três modelos simples: link, material e porta de seguidor. Sem schema novo.
- **Valor/esforço/risco.** Médio / P / baixo. Barato e reduz erro do operador.

### 6.6 Clique no link

- **Problema.** A Meta só confirma "aceita". O operador não sabe se alguém abriu o link nem compara post A com post B. É a única prova real de interesse.
- **Concorrente.** LinkDM tem Click Analytics; Chatfuel leva atribuição até o WhatsApp e a venda [S8, S11].
- **Hoje.** O link vai direto para o destino; não há registro de clique.
- **Falta.** Rota de redirecionamento por token, tabela de cliques (interação, horário, IP opcional e hasheado), contagem de únicos e total, métrica no painel e atualização da política de privacidade. Não mede entrega, só clique.
- **Valor/esforço/risco.** Alto / M / médio. Risco de privacidade e de número inflado por bots; mitigar com único, retenção curta e aviso no painel.

### 6.7 Ficha da pessoa

- **Problema.** A pessoa responde "e o link?" e o operador não sabe se ela já recebeu, quando, por qual automação, nem se o gate está pendente. O @ também costuma vir nulo.
- **Concorrente.** ManyChat trata contatos, tags e campos personalizados como cidadãos de primeira classe; LinkDM captura lead [S5, S8].
- **Hoje.** Atividade mostra interações e tarefas soltas; não há visão por pessoa. O índice por `commenter_igsid` existe.
- **Falta.** Busca por IGSID ou @, linha do tempo, contagem de DMs e último estado. Depende da identidade por pessoa da ideia 6.1. Nada de PII nova.
- **Valor/esforço/risco.** Médio / P–M / baixo. Ajuda suporte e auditoria.

### 6.8 Exportar CSV das interações

- **Problema.** O operador quer levar a lista para planilha, cobrar equipe ou conferir quem recebeu o quê. A tela corta em 30 e não exporta.
- **Concorrente.** Chatfuel vende relatório e atribuição; LinkDM tem analytics. Exportação em CSV não foi confirmada nas fontes consultadas [S8, S11].
- **Hoje.** Só leitura no painel.
- **Falta.** Exportar com filtro de período e colunas de estado, @, post e horários; streaming para não carregar tudo; aviso de dado pessoal. Depende dos filtros/relatórios da Seção 4.
- **Valor/esforço/risco.** Médio / P / médio (privacidade do arquivo). Não é relatório novo; é saída de dados.

### 6.9 A/B de mensagens

- **Problema.** O operador escolhe o texto da primeira DM e do botão no chute; não sabe qual versão faz mais gente responder ou clicar.
- **Concorrente.** O ManyChat tem Randomizer para variar mensagens; o MARICHAT já sorteia respostas públicas, mas não as DMs [S5].
- **Hoje.** `firstDmText`, `secondDmText` e `linkButtonTitle` são únicos.
- **Falta.** Variantes por automação, divisão determinística por IGSID, métrica de resposta/clique e leitura honesta de amostra pequena. Depende de 6.6 para a métrica de clique.
- **Valor/esforço/risco.** Médio / M / baixo. Sem clique, vira só "qual texto parece melhor".

### 6.10 Aviso operacional fora do painel

- **Problema.** Token perto de expirar, refresh falhando, webhook desassinado ou fila crescendo. O operador só descobre se abrir o painel; a automação para em silêncio.
- **Concorrente.** LinkDM fala em acompanhamento em tempo real; ReplyRush também. Alerta por e-mail ou webhook não foi confirmado nas fontes [S8, S10].
- **Hoje.** Existem cartões e diagnóstico em Conexão, mas nada empurra o aviso.
- **Falta.** Faixa persistente no painel e canal opcional (SMTP existente ou webhook), com limites: token < 7 dias, falhas repetidas, tarefas expirando, webhook sem evento há 24h. Deduplicar para não virar spam.
- **Valor/esforço/risco.** Médio–alto / P / baixo. Custo só se o operador ligar e-mail; sem serviço obrigatório.

## 7. Prioridade sugerida

| Ordem | Ideia | Valor | Esforço | Risco | Depende de |
| :--: | :-- | :-- | :-- | :-- | :-- |
| 1 | Limite de DM por pessoa | Alto | M | Baixo | Nada |
| 2 | Vários gatilhos e exclusões | Alto | M | Baixo | Nada |
| 3 | Capacidade da fila visível | Médio | P | Baixo | Nada |
| 4 | Teste assistido no Instagram | Alto | M | Baixo | Nada |
| 5 | Duplicar automação e modelos | Médio | P | Baixo | Nada |
| 6 | Clique no link | Alto | M | Médio | Nada |
| 7 | Ficha da pessoa | Médio | P–M | Baixo | 1 |
| 8 | Exportar CSV | Médio | P | Médio | Seção 4 (filtros) |
| 9 | A/B de mensagens | Médio | M | Baixo | 6 |
| 10 | Aviso operacional | Médio–alto | P | Baixo | Nada |

Sequência prática: 1, 2, 3 e 10 fecham o básico de operação e proteção da conta; 4 e 5 reduzem erro humano; 6 abre a única métrica de conversão real que temos; 7, 8 e 9 só valem depois que houver volume e clique medido.

## 8. Não fazer

- **IA/agente no painel** (ManyChat AI, ReplyRush AI, InstantDM AI): fora do escopo da v1, custo por token e risco de resposta errada em nome do perfil.
- **Flow builder visual com ramificações** (ManyChat, Chatfuel): transforma o produto em plataforma e multiplica estados/testes; o caso do MARICHAT é um link, não uma árvore de decisão.
- **Captura de e-mail/CRM e handoff para WhatsApp** (ReplyRush Email Collector, LinkDM Lead Gen, Chatfuel WhatsApp): aumenta PII, LGPD, suporte e integrações pagas; só faz sentido se o produto virar CRM.
- **Broadcast/reenvio em massa** (LinkDM Broadcasts): depende de opt-in e da janela de 24h; fora dela, a conta é bloqueada. O lembrete da Seção 4 já é o limite seguro.
- **Publicação e agendamento de posts, "próximo post"** (InstantDM, LinkDM): é outro produto; "qualquer post" com palavra-chave já cobre o caso.
- **Múltiplas contas agora**: está na Seção 4 e o schema já prevê; antes de abrir, a operação de uma conta precisa estar estável.
- **Raspar Instagram, extensão de navegador, login por senha**: risco de ban e violação da regra de ouro do projeto; nunca.
- **Rastrear unfollow ou "quem deixou de seguir"**: a API não confirma isso de forma confiável e o custo de privacidade é alto.
- **White label, cupons, Shopify, inbox starters**: não são o núcleo e adicionam dependências.
- **Relatório de receita/atribuição de venda** (Chatfuel): exige dados de comércio que o MARICHAT não tem e não deveria coletar.
- **Teste com Instagram falso em produção**: o demo local existe; em produção o teste tem de ser um comentário real de conta secundária.

## 9. Incertezas e o que validar em conta real

- Se `repeatPolicy` da Zernio cobre o caso entre posts ou só dentro da mesma automação; a documentação local cita o campo, mas não o detalhe.
- Se story mention chega no webhook de Instagram Login como `comments` ou como outro payload; a Meta documenta a superfície, mas o field exato precisa de teste [S1, S3].
- Se o clique no link pode ser medido sem guardar IP; a decisão de produto é nossa, não da Meta.
- Quantos cliques únicos são necessários para um A/B deixar de ser ruído.
- Se o ManyChat realmente exporta contatos em CSV; a página de preços bloqueou e a central consultada não cobre exportação.
- Se o InstaChamp ainda recebe novos clientes; a página existe, mas os relatos de descontinuação são de terceiros [S12, S14, S15].

## 10. Fontes

Todas acessadas em 2026-10-29.

- [S1] Meta — Send Messages (Instagram API with Instagram Login): <https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging-api>
- [S2] Meta — Send a Private Reply to a Commenter: <https://developers.facebook.com/docs/instagram-platform/private-replies>
- [S3] Meta — Instagram webhook fields and permissions: <https://developers.facebook.com/documentation/instagram-platform/webhooks/fields>
- [S4] Meta — Graph API Rate Limits (Messaging Rate Limits): <https://developers.facebook.com/docs/graph-api/overview/rate-limiting/>
- [S5] ManyChat Help — Instagram Post and Reel Comments trigger (atualizado em 2026-08-27): <https://help.manychat.com/hc/en-us/articles/14281316989724-Instagram-Post-and-Reel-Comments-trigger>
- [S6] ManyChat Help — Instagram Story Reply Trigger (atualizado em 2026-08-27): <https://help.manychat.com/hc/en-us/articles/13556930006428-Instagram-Story-Reply-Trigger>
- [S7] ManyChat Help — Instagram Story Mention Reply trigger (atualizado em 2026-08-27): <https://help.manychat.com/hc/en-us/articles/14281309502108-Instagram-Story-Mention-Reply-trigger>
- [S8] LinkDM — página inicial e recursos: <https://www.linkdm.com/>
- [S9] InstantDM — Instagram DM automation: <https://instantdm.com/instagram-dm-automation>
- [S10] ReplyRush — features: <https://www.replyrush.com/features>
- [S11] Chatfuel — Chatfuel vs ManyChat vs LinkDM (2026), publicado em 2026-10-20: <https://chatfuel.com/blog/best-instagram-comment-to-dm-tools-2026>
- [S12] Customers.ai — página legada do InstaChamp: <https://customers.ai/instachamp>
- [S13] Zernio — documentação da API: <https://docs.zernio.com> e `docs/ZERNIO.md` deste repositório.
- [S14] Reachlee — MobileMonkey (InstaChamp) alternatives (terceiro): <https://www.reachlee.co/alternatives/mobilemonkey/>
- [S15] Inro — Customers.ai has left Instagram DM automation (terceiro): <https://www.inro.social/vs/customers-ai>

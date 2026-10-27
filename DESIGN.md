# MARICHAT — Design System v4

Fonte única de verdade visual do painel. Substitui a v3 por completo.

A diferença central: **o visual nasce do Kokonut UI OSS** (registry do shadcn),
com a base neutra escura e o vidro que ele já usa, e tudo o que o Kokonut não
tem vem do **shadcn/ui** — que é a dependência que o próprio Kokonut assume. O
produto, as telas e as leis de UX continuam os mesmos; o que muda é de onde vêm
os componentes e como eles são adaptados.

- Catálogo e regras do Kokonut: [`docs/KOKONUT.md`](docs/KOKONUT.md).
- Brief original do produto: [`docs/PROMPT-INICIAL.md`](docs/PROMPT-INICIAL.md).
- Especificação anterior (não usar): histórico do repositório.

---

## 1. Produto

Alguém comenta uma palavra-chave num post do Instagram e recebe uma DM privada
com um botão. Ao tocar, recebe o link. O painel cria, edita, liga e desliga
automações e mostra o que aconteceu.

| Tela | Rota | Objetivo | Ação primária |
| :-- | :-- | :-- | :-- |
| Visão geral | `/admin` | O fluxo está saudável? O que exige ação? | Nova automação |
| Automações | `/admin/automacoes` | Encontrar, ativar, pausar e editar | Nova automação |
| Editor | `/admin/automacoes/nova`, `/admin/automacoes/[id]` | Criar ou editar com prévia fiel | Salvar automação |
| Atividade | `/admin/atividade` | Diagnosticar interações, fila e webhooks | Atualizar |
| Conexão | `/admin/conexao` | Conectar, testar e corrigir a integração | Testar conexão |

Fora do escopo visual: `/privacidade` e `/exclusao-de-dados` são documentos de
leitura com o mesmo tema, sem navegação do painel e sem slots de IA. Login é o
diálogo HTTP Basic do navegador; não existe tela de login.

**Fora do escopo de produto (v1):** IA/agente no painel, várias contas, exigir
seguir antes da primeira DM (existe a porta de seguidor, mas sem slot de IA),
relatórios, tema claro.

---

## 2. Leis

1. **Uma ação primária por tela.** Ação primária no canto superior direito, a
   40 px (alvo de 44 px).
2. **Números não mentem.** "Aceita" não é "entregue": todo status de DM diz
   "aceita pela Meta". Métrica sem dado mostra `—` e "sem dados no período".
3. **Nada destrutivo sem confirmação.** Desconectar, excluir automação e
   descartar alterações usam diálogo com resumo do efeito.
4. **Sem segundo acento.** Lime é o único matiz de ação. Verde/âmbar/vermelho/azul
   existem só como estado.
5. **Densidade de operação, não de marketing.** Sem hero, sem ilustração, sem
   3D, sem partículas, sem texto animado, sem carrossel automático, sem chat
   lateral permanente.
6. **Movimento é feedback, não decoração.** 120–160 ms em hover/press; 240 ms
   em overlay. Nada de parallax, tilt, bounce ou scroll-jacking.
7. **Estado nunca só por cor.** Dot + texto, ícone + texto.
8. **Nenhum dado inventado.** Sem placeholder de demonstração, sem número
   fictício em produção.

---

## 3. Navegação e informação

Uma navegação só, em pílula de vidro no topo: **4 itens**, marca `MARICHAT`,
indicador de conexão (`@handle`), botão de comandos `Ctrl K` e menu de conta.
Sem sidebar, sem topbar duplicada, sem seletor de tema.

Profundidade máxima: 2 níveis (nav → página → drawer). O editor tem URL própria.
Filtros e busca vivem na URL (`?q=&status=`).

---

## 4. Regiões

Toda tela é `R1 + R2 + (R3?) + R4 + (R5?) + (R6?)`. Nenhuma sétima região.

| # | Região | Conteúdo | Regra |
| :-- | :-- | :-- | :-- |
| R1 | Navegação | pílula de vidro, 4 itens, status, conta | fixa, 24 px do topo |
| R2 | Cabeçalho | `h1`, subtítulo de uma linha, ação primária | ação à direita |
| R3 | Sinais | alertas e avisos | no máximo 2 empilhados |
| R4 | Conteúdo | cards, tabelas, formulário | única região que rola |
| R5 | Trilho | prévia da DM, diagnóstico, ajuda | 380 px, sticky |
| R6 | Ilha | conexão/fila em tempo real | rodapé central, 8 s |

**Grid:** desktop de referência 1440 px, conteúdo até 1240 px, 12 colunas,
gutter 24 px. Ritmo vertical: 32 px entre seções, 24 px entre cards, 16 px entre
campos, 12 px entre controles.

**Responsivo:** ≤1279 px o trilho vai para 320 px ou abaixo do conteúdo; ≤1023 px
nav compacta + drawer, tabela com scroll e primeira coluna fixa; <768 px uma
coluna, linhas de tabela viram blocos rotulados, ação primária em barra inferior
de 44 px com `safe-area-inset-bottom`. Em 320 px e 200% de zoom não há scroll
horizontal.

---

## 5. Tokens

Os nomes seguem os **slots do shadcn/ui**, para que todo componente baixado pelo
CLI (shadcn ou Kokonut) já herde o tema. Tokens extras do MARICHAT ficam com
prefixo próprio. Hex só existe em `src/styles/tokens.css`.

### 5.1 Cor

| Slot | Valor | Uso |
| :-- | :-- | :-- |
| `--background` | `#09090B` | fundo da página |
| `--foreground` | `#FAFAFA` | título e valor |
| `--card` | `rgb(255 255 255 / 0.04)` | superfície de card |
| `--card-foreground` | `#D4D4D8` | texto dentro do card |
| `--popover` | `#131315` | overlay elevado |
| `--popover-foreground` | `#FAFAFA` | texto em overlay |
| `--primary` | `#A3E635` | CTA, item ativo, foco |
| `--primary-foreground` | `#0A0A0A` | texto sobre lime |
| `--secondary` | `rgb(255 255 255 / 0.07)` | superfície de apoio |
| `--secondary-foreground` | `#FAFAFA` | texto sobre apoio |
| `--muted` | `#0F0F11` | trilho, cabeçalho de tabela, input |
| `--muted-foreground` | `#A1A1AA` | label, timestamp |
| `--accent` | `rgb(255 255 255 / 0.10)` | hover de item (slot do shadcn, **não** é o lime) |
| `--accent-foreground` | `#FAFAFA` | texto sobre hover |
| `--destructive` | `#F87171` | ação destrutiva |
| `--border` | `rgb(255 255 255 / 0.10)` | borda de card |
| `--input` | `#66666D` | borda de controle (3,49:1) |
| `--ring` | `#A3E635` | anel de foco |
| `--radius` | `24px` | raio base do shadcn (usado com `calc`) |

Extras do MARICHAT:

| Token | Valor | Uso |
| :-- | :-- | :-- |
| `--surface-hover` | `rgb(255 255 255 / 0.07)` | hover de card/linha |
| `--line-subtle` | `rgb(255 255 255 / 0.06)` | divisor decorativo |
| `--line-strong` | `rgb(255 255 255 / 0.18)` | seleção, hover forte |
| `--text-tertiary` | `#A1A1AA` | label, meta |
| `--text-muted` | `#8A8A93` | placeholder, nota (5,81:1) |
| `--success` | `#34D399` | conectado, aceita, enviado |
| `--warning` | `#FBBF24` | aguardando, token expirando |
| `--danger` | `#F87171` | falhou, desconectar |
| `--info` | `#60A5FA` | processando, informativo |
| `--radius-control` | `12px` | input, botão |
| `--radius-inner` | `16px` | bloco interno |
| `--radius-card` | `24px` | card, tabela |
| `--radius-frame` | `32px` | moldura de prévia |

**Proibido:** `#71717A` como texto (4,12:1, reprova), `zinc-*`/`emerald-*`/
`orange-*` do Kokonut cru, gradiente como fundo de área grande, mais de um
matiz de ação por tela.

### 5.2 Contraste verificado (WCAG 2.2 AA)

Fundo `#09090B` e vidro `#131315` (branco 4% sobre o canvas).

| Token | Canvas | Vidro | Veredito |
| :-- | --: | --: | :-- |
| `--foreground` | 19,06:1 | 17,78:1 | AAA |
| `--card-foreground` | 13,46:1 | 12,56:1 | AAA |
| `--muted-foreground` | 7,76:1 | 7,24:1 | AAA |
| `--text-muted` | 5,81:1 | 5,42:1 | AA |
| `--primary` (texto) | 13,19:1 | 12,31:1 | AAA |
| `--primary-foreground` | 13,13:1 | — | AAA |
| `--success` | 10,35:1 | 9,65:1 | AAA |
| `--warning` | 11,92:1 | 11,12:1 | AAA |
| `--danger` | 7,19:1 | 6,71:1 | AA |
| `--info` | 7,83:1 | 7,30:1 | AAA |
| `--input` (não-texto) | 3,49:1 | 3,26:1 | AA |
| `--ring` (não-texto) | 13,19:1 | 12,31:1 | AAA |

Regras: chip usa a cor de estado sobre fundo tintado a 12% (pior par: danger
6,32:1); desabilitado não usa `opacity` no texto — usa superfície apagada, borda
`--line-subtle`, `text-muted` e `aria-disabled`; placeholder nunca substitui
label; borda com significado usa `--input` ou `--ring`, nunca hairline de 10%.

### 5.3 Superfícies, vidro e movimento

- **Vidro:** `--card` + `backdrop-blur(20px)` + borda 1 px `--border` + realce
  interno de 1 px `rgb(255 255 255 / 0.10)` no topo.
- **Elevação:** sem sombra em card. Overlay usa `0 24px 64px rgb(0 0 0 / 0.45)`.
- **Card:** raio 24 px, padding 24 px. Hover em card interativo sobe 2 px e a
  borda vai para `--line-strong`.
- **Aurora:** um brilho radial lime no canto superior direito, ≤8%, nunca atrás
  de texto denso. Em `prefers-reduced-motion`, estático.
- **Dot grid:** 3% de opacidade, 24 px, só no fundo.

| Movimento | Duração | Onde |
| :-- | :-- | :-- |
| hover/press | 120–160 ms, ease-out | botão, card, linha |
| overlay/drawer | 240 ms, ease-out | diálogo, drawer, menu |
| mola | só na ilha de status | sem bounce > 0,18 |

Em `prefers-reduced-motion: reduce`, sem transform nem pulso; só opacidade.

### 5.4 Tipografia

**Inter** para interface, **JetBrains Mono** para `@handles`, IDs, URLs,
timestamps e números tabulares. Ambos via `next/font`, `display: swap`.

| Token | Tamanho/linha | Peso | Uso |
| :-- | :-- | :-- | :-- |
| `display` | 40/44, -0.03em | 600 | `h1` de página |
| `section` | 20/28, -0.02em | 600 | título de seção |
| `card` | 15/22 | 500 | título de card |
| `body` | 14/20 | 400 | corpo |
| `label` | 13/18 | 500 | label, botão, nav |
| `micro` | 11/14, +0.08em | 600 | label de tabela/métrica |
| `mono` | 13/18 | 400 | dados técnicos |

Máximo dois pesos por card; sem itálico; `tabular-nums` em métricas; linha de
68ch; títulos com `text-wrap: balance`.

### 5.5 Espaço, raio, ícones

Espaço só em 4, 8, 12, 16, 24, 32, 48 e 64. Raio: 12 controle, 16 interno, 24
card, 32 moldura. Ícones **Lucide** (16/18/20 px, stroke 1,75), `aria-hidden`
quando decorativos; ícone sozinho exige `aria-label`. Avatar 24 px em tabela,
40 px em card, 64 px em perfil, sempre com borda e fallback de iniciais.

### 5.6 Foco e teclado

Anel de 2 px lime + 2 px de offset, sempre visível. Ordem de tabulação segue a
leitura. `Esc` fecha overlay e devolve o foco ao gatilho. Rádio, segmentado e
menu usam setas. Skip link "Pular para o conteúdo". `Ctrl K` abre comandos.

---

## 6. Base de componentes

### 6.1 Regra de origem

1. Existe no **Kokonut OSS** e serve ao painel? → instalar pelo registry, copiar
   para `src/components/kokonut/` e adaptar.
2. Não existe no Kokonut? → **shadcn/ui** (o que o Kokonut usa por baixo).
3. Não existe em nenhum dos dois? → componente próprio em
   `src/components/marichat/`, com justificativa no commit.

A adaptação é obrigatória em todos os casos: tokens do §5, copy pt-BR, movimento
do §5.3, acessibilidade do §8. O código é nosso; atualização do Kokonut não
entra automaticamente.

### 6.2 Componentes por necessidade

| Necessidade | Componente | Origem | Arquivo |
| :-- | :-- | :-- | :-- |
| Botão | `button` | shadcn | `ui/button.tsx` |
| Campo, área de texto, select, label | `input`, `textarea`, `select`, `label` | shadcn | `ui/*` |
| Grupo de campo com ajuda/erro | `field` | shadcn | `ui/field.tsx` |
| Card, métrica, painel | `card` | shadcn | `ui/card.tsx` |
| Tabela (densidade única) | `table` | shadcn | `ui/table.tsx` |
| Chip de status | `badge` adaptado | shadcn | `ui/status-chip.tsx` |
| Alerta R3 | `alert` | shadcn | `ui/alert.tsx` |
| Toast | `sonner` | shadcn | `ui/toaster.tsx` |
| Diálogo de confirmação | `alert-dialog` | shadcn | `ui/alert-dialog.tsx` |
| Drawer mobile | `smooth-drawer` | Kokonut | `kokonut/drawer.tsx` |
| Menu de conta | `profile-dropdown` | Kokonut | `kokonut/account-menu.tsx` |
| Comandos `Ctrl K` | `action-search-bar` | Kokonut | `kokonut/command-bar.tsx` |
| Ilha de status R6 | `status-island` | Kokonut | `kokonut/status-island.tsx` |
| Saúde da conexão (30 dias) | `uptime-card` | Kokonut | `kokonut/uptime-card.tsx` |
| Checklist de ambiente | `onboarding-checklist` | Kokonut | `kokonut/env-checklist.tsx` |
| Confirmação destrutiva | `hold-button` | Kokonut | `kokonut/hold-button.tsx` |
| Ação reversível | `undo-button` | Kokonut | `kokonut/undo-button.tsx` |
| Toggle de automação | `switch` | shadcn | `ui/switch.tsx` |
| Porta de seguidor | `radio-group` em cards | shadcn | `ui/radio-group.tsx` |
| Skeleton | `skeleton` | shadcn | `ui/skeleton.tsx` |
| Avatar com fallback | `avatar` | shadcn | `ui/avatar.tsx` |
| Tooltip | `tooltip` | shadcn | `ui/tooltip.tsx` |

### 6.3 O que o Kokonut tem e o MARICHAT **não** usa

| Componente | Por que não |
| :-- | :-- |
| `morphic-navbar` | a barra dobra ao rolar e usa mola + laranja; a nav do painel é fixa e nunca rola para fora |
| `metric-card` | card analítico com período, gráfico e seleção por arrasto; o painel usa tile estático |
| `bento-grid` | composição trivial em CSS grid; não vale a dependência |
| `notification-stack` | pilha de toasts decorativa; alerta é `alert` e toast é `sonner` |
| `smooth-tab` | o produto não tem abas; filtro vive na URL |
| `card-flip`, `card-stack`, `liquid-glass-card`, `page-flip`, `carousel-cards` | física/3D/carrossel: fora das leis |
| Fundos (`particles`, `caustics`, `rain-glass`, `ink`, `topo`, `halftone`, `flow-field`, `drape`, `dot-field`) | performance, contraste e ruído |
| Texto animado (`type-writer`, `glitch`, `split-flap`, `dynamic-text`, `kinetic-type-hero`, `swoosh-text`, …) | leitura instável |
| Botões de efeito (`particle`, `attract`, `bell`, `pull-cord`, `tear`, `pay`, `v0`, `gradient`) | Hick/Fitts: efeito imprevisível |
| Inputs especializados (`seat-map`, `amount-pad`, `wheel-picker`, `signature-pad`, `tip-selector`, …) | não existem no domínio |
| `media/*` | o produto não edita mídia |
| `ai/*` (prompt, loading, approval, diff, citations…) | IA está fora do escopo v1; catálogo guardado para depois |
| Marking menu, scroll-index, stack-panel, toolbar | navegação gestual ou duplicada |

Detalhe completo em [`docs/KOKONUT.md`](docs/KOKONUT.md).

### 6.4 Orçamento de variantes

| Componente | Variantes permitidas |
| :-- | :-- |
| Botão | `primary`, `secondary`, `ghost`, `destructive`; tamanhos `sm 32`, `md 40`, `lg 48` |
| Card | `glass`, `interactive`, `empty`, `alert` |
| Chip | `success`, `warning`, `danger`, `neutral`, `info`, `loading` |
| Input | `default`, `with-icon`, `with-suffix`, `error`, `disabled` |
| Tabela | uma densidade: linha 56 px, sem zebra |
| Toggle | on, off, disabled |
| Diálogo | confirmação, drawer |

---

## 7. Estados

| Componente | Default | Hover | Focus | Active | Selected | Disabled | Loading | Error |
| :-- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Botão | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| Input/select/área | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ |
| Toggle/checkbox/rádio | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| Card interativo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Linha de tabela | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| Chip | ✓ | — | — | — | — | — | ✓ | — |
| Item de nav | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — |

`loading` mantém largura e altura finais (sem layout shift); `error` mantém o
valor digitado; `success` dura 1,2 s e não substitui a mensagem persistente.

Estados de tela: skeleton de 5 linhas para tabela, skeleton do mesmo tamanho
para tile, vazio com uma ação, erro com "Tentar novamente", parcial com
"Mostrando 10 de 1.284" + "Carregar mais". Lista vazia não mostra cabeçalho de
tabela vazio.

---

## 8. Acessibilidade (WCAG 2.2 AA)

- Contraste do §5.2 em todos os pares; texto de chip sobre o tint de 12%.
- Foco visível em todo elemento interativo; alvo mínimo 24×24, 44×44 no mobile.
- Um `h1` por tela; landmarks `nav`, `main`, `aside`; tabela com `caption`
  oculto e `scope="col"`.
- Métricas em `dl`; status com texto; ilha em `aria-live="polite"`; erro de
  campo com `aria-invalid` + `aria-describedby`.
- Overlays prendem o foco, fecham com `Esc` e devolvem o foco ao gatilho.
- 320 px e 200% de zoom sem scroll horizontal nem texto cortado.
- Nenhuma informação só por cor.

---

## 9. Especificação das telas

### 9.1 Visão geral (`/admin`) — R1, R2, R3, R4, R6

- **R2:** `h1` "Visão geral"; subtítulo "Comentário com a palavra-chave → DM
  pedindo resposta → link."; CTA "Nova automação".
- **R3:** no máximo 2 alertas. Exemplos: "2 DMs falharam e serão tentadas de
  novo" (warning, ação "Revisar"); "Token expira em 6 dias" (info, ação
  "Conexão").
- **R4:** 4 tiles (`card` shadcn, sem gráfico): Automações ativas 12 de 14;
  Aguardando resposta 38; Links enviados 1.284 (30 dias); Precisam de atenção 3
  (borda esquerda warning). Depois, painel Conta conectada (avatar, `@handle`,
  chip, expiração, "Gerenciar") e painel Operação (fila, última tarefa, último
  webhook, nota "aceita ≠ entregue"), lado a lado. Por último, tabela "Últimos
  comentários atendidos" com 5 linhas e rodapé "Mostrando 5 de 1.284".
- **R6:** ilha `@handle · Conectado há 2 h · Fila saudável`, some em 8 s.
- **Estados:** sem conta → vazio com "Conectar Instagram"; erro de webhook/token
  → alerta danger com link para Conexão; carregando → skeletons; parcial →
  "Carregar mais".

### 9.2 Automações (`/admin/automacoes`) — R1, R2, R3, R4

- Lista de cards (não tabela): chip de status + `switch`, nome, palavra-chave em
  mono, publicação, porta de seguidor, host do link, duas métricas, "Editar".
- Card pausado: superfície apagada, chip neutral, sem lime.
- Busca e filtro na URL; vazio com "Nova automação"; erro de carregamento com
  "Tentar novamente"; pausar oferece desfazer de 8 s (`undo-button`).

### 9.3 Editor (`/admin/automacoes/nova`, `/[id]`) — R1, R2, R3, R4, R5

- R2 com voltar, chip de status e "Salvar automação".
- Seções: identificação (nome, palavra-chave com prefixo `#` opcional e ajuda
  "ignora maiúsculas, acentos e pontuação"), publicação (select com miniatura
  40×40 e "Qualquer publicação" no topo), primeira mensagem (texto + texto do
  botão, contador dentro do controle), mensagem do link (texto + botão + URL
  https), porta de seguidor (5 cards de rádio, "Travado" mostra aviso âmbar).
- **R5:** prévia da DM em moldura de 32 px, 380 px, com as duas bolhas, o botão e
  "Prévia aproximada. O Instagram pode alterar a aparência." Atualiza com
  debounce de 300 ms.
- Sair com alterações não salvas → diálogo; descartar é destrutivo.

### 9.4 Atividade (`/admin/atividade`) — R1, R2, R3, R4, R6

- Tabela de interações (Quando, Automação, Quem comentou, Situação com chip),
  fila de tarefas e webhooks recentes, incluindo erro com texto.
- Filtro por situação na URL; "Atualizar" como ação primária; R6 reporta a
  rodada da fila.

### 9.5 Conexão (`/admin/conexao`) — R1, R2, R3, R4, R5

- Card da conta: avatar, `@handle`, chip, grid 2×2 de detalhes, "Reconectar" e
  "Desconectar" (hold-button + diálogo).
- Diagnóstico com lista de checagens (ícone + texto), último teste e "Testar
  conexão".
- Webhook: URL em mono, botão copiar, campos assinados, token e link para o
  painel da Meta/Zernio.
- Checklist de ambiente (`onboarding-checklist`): 6 variáveis com chip ok/faltando.
- `uptime-card` de 30 dias para webhooks recebidos.
- **R5:** ajuda curta por modo de transporte, sem repetir o README.

---

## 10. Governança

### 10.1 Componente pronto

- [ ] Usa só tokens do §5 (nenhum `zinc`, `emerald`, `orange`, hex ou px solto).
- [ ] Tem os estados do §7 que se aplicam.
- [ ] Tem anatomia (label, ajuda, erro, contador).
- [ ] Passa teclado, foco visível e leitor de tela.
- [ ] Contraste medido no fundo real.
- [ ] Tem vazio/loading/erro quando busca dados.
- [ ] Respeita `prefers-reduced-motion`.
- [ ] Está registrado no §6.2 com origem (Kokonut, shadcn ou próprio).

### 10.2 Tela pronta

- [ ] Cabe nas regiões do §4; nav com 4 itens.
- [ ] Uma ação primária; destrutivas com confirmação.
- [ ] AA, foco visível, alvos de 44 px no mobile.
- [ ] 320 px e 200% sem scroll horizontal.
- [ ] Vazio, loading (<400 ms percebidos) e erro existem.
- [ ] Copy pt-BR, sem emoji e sem exclamação.
- [ ] Nenhum dado inventado; "aceita" onde couber.

### 10.3 Stitch

O projeto Stitch anterior foi apagado. Ao regerar:

- Criar um projeto novo e vincular com `stitch config set project <id>`.
- Enviar este `DESIGN.md` e o design system antes de gerar telas.
- Declarar no prompt apenas os componentes do §6.2 pelo nome (ex.: "status
  island", "uptime card"), sem repetir cores, fontes ou raios.
- Desktop 1440 px, tema escuro fixo, 4 itens de nav, 6 regiões, gutter 24 px.
- Pedir foco visível, erro inline, skeleton, vazio e alvos de 44 px.
- Limitar a 5–7 linhas/cards visíveis, no máximo 2 alertas, uma ação primária.
- Nunca pedir hero, ilustração, emoji, 3D, partículas, carrossel, chat lateral,
  segundo acento, sidebar + topbar.

### 10.4 Ordem de implementação

1. `npx shadcn@latest init` + `components.json` com o registry `@kokonutui`;
   tokens do §5 em `src/styles/tokens.css` e `globals.css`.
2. Componentes do §6.2 (base shadcn primeiro, Kokonut depois), cada um pelo
   gate do §10.1.
3. Casca do painel (R1) e Visão geral.
4. Automações, Editor, Atividade, Conexão, uma por vez.
5. Testes: `axe` nas 5 rotas, varredura de teclado, contraste dos tokens e
   snapshot em 1440/1024/390/320.

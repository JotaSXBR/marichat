# MARICHAT — Design System v7

Fonte única de verdade visual do painel. Substitui a v6 por completo.

A v6 acertou a ideia (mesa de operação) e errou a execução: o mesmo card de 12 px
com padding 20 px aparecia em toda tela, o topo ficava vazio porque o `h1` era o
único conteúdo de uma faixa alta, os números do fluxo tinham tamanho de pôster e
o editor separava o formulário da prévia por uma coluna inteira de vazio.

A v7 muda a metáfora de "mesa" para **instrumento**: papel quente, tinta e
régua. Não existe cor de marca; cor só aparece para dizer estado. A ação
primária é tinta (preta no claro, branca no escuro), não um matiz. Toda tela usa
a mesma gramática — cabeçalho com uma linha de dado real, seções separadas por
régua, tabela densa no desktop e registro curto no celular — mas cada tela
mostra o que só ela tem.

Consequências diretas:

- **IBM Plex Sans** na interface e nos títulos; **IBM Plex Mono** em handle, ID,
  URL, data e contagem. As duas via `next/font`, `display: swap`.
- **Escala de instrumento**: `h1` de 30 px, número de 26 px, corpo de 16 px,
  rótulo de 13 px. Nenhum número em tamanho de manchete.
- **Raio curto**: 3 px em controle, 6 px em card, 10 px em overlay. Card não é
  almofada.
- **Régua antes de caixa**: se o conteúdo não é um objeto separado, ele vive em
  uma seção com `border-b` de 1 px e espaço, não dentro de outro card.
- **Dois temas, um conjunto de tokens**: claro é o padrão do CSS, `.dark` troca
  os mesmos slots. O tema inicial é decidido antes da primeira pintura.
- **Toda tela é uma tela**: Visão geral, Automações, Editor, Atividade e Conexão
  têm layout próprio. Nenhuma é um card genérico preenchido com dados.

A base de componentes continua shadcn/ui + Kokonut OSS; o que muda é a
composição e os tokens. O alvo aprovado está em
[`.stitch/rework/target.html`](.stitch/rework/target.html) e nas capturas
`target-*.png` ao lado; as capturas da v5/v6 ficam como histórico, não como
fonte.

- Catálogo e regras do Kokonut: [`docs/KOKONUT.md`](docs/KOKONUT.md).
- Brief original do produto: [`docs/PROMPT-INICIAL.md`](docs/PROMPT-INICIAL.md).

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
leitura com o mesmo tema, sem navegação do painel. Login é o diálogo HTTP Basic
do navegador; não existe tela de login.

**Fora do escopo de produto (v1):** IA/agente no painel, várias contas,
relatórios, tema por usuário salvo no servidor (a escolha é local ao navegador).

---

## 2. Leis

1. **Uma ação primária por tela.** No desktop, no canto superior direito de R2.
   No celular, na barra do polegar acima das abas, com 48 px de altura.
2. **Números não mentem.** "Aceita" não é "entregue": todo status de DM diz
   "aceita pela Meta". Métrica sem dado mostra `—`.
3. **Nada destrutivo sem confirmação.** Desconectar e descartar alterações
   usam diálogo com o efeito em uma frase. A v1 não exclui automação: ela é
   pausada.
4. **Cor é estado, não marca.** A ação primária é tinta. Verde, âmbar, vermelho
   e azul só aparecem em chip, alerta, ponto de status e erro.
5. **Densidade de operação, não de marketing.** Sem hero, ilustração, 3D,
   gradiente de área grande, carrossel ou chat lateral permanente.
6. **Movimento é feedback, não decoração.** 150 ms em hover/press; 240 ms em
   overlay. Sem parallax, tilt, bounce ou scroll-jacking.
7. **Estado nunca só por cor.** Ponto + texto, ícone + texto.
8. **Nenhum dado inventado.** Sem número fictício em produção. O seed de
   demonstração é local, gitignored e nunca entra em commit.
9. **A mesma gramática em todas as telas.** Cabeçalho, régua, mono para dado
   técnico e tabela/registro são iguais em todo lugar; o que muda é o conteúdo.

---

## 3. Navegação e informação

Uma navegação só: no desktop, **masthead** de 56 px encostado no topo, com
régua inferior, marca `MARICHAT` + quadrado de tinta, **4 itens** em texto com
sublinhado de 2 px de tinta no ativo, leitura de conexão em mono
(`● @handle`), botão de comandos `Ctrl K` (a partir de `lg`) e menu de conta.
No celular, a mesma barra sem os itens e **4 abas fixas no rodapé** de 64 px,
com ícone e rótulo de 12 px. Sem sidebar, sem topbar duplicada, sem pílula
flutuante.

O menu de conta contém: `@handle` em mono, Conexão, Política de privacidade,
Exclusão de dados, **Tema** (Sistema / Claro / Escuro) e o aviso de que o login
é feito pelo navegador. O tema é o único controle de aparência no produto.

Profundidade máxima: 2 níveis (nav → página → diálogo). O editor tem URL
própria. Filtros e busca vivem na URL (`?q=`, `?situacao=`, `?aba=`).

---

## 4. Regiões

Toda tela é `R1 + R2 + (R3?) + R4 + (R5?)`. Nenhuma sexta região.

| # | Região | Conteúdo | Regra |
| :-- | :-- | :-- | :-- |
| R1 | Navegação | masthead com régua, 4 itens, status em mono, conta | sticky, 56 px |
| R2 | Cabeçalho | `h1`, uma linha de dado real em mono, ação primária | régua inferior, ação à direita |
| R3 | Sinais | alertas e avisos | no máximo 2 empilhados |
| R4 | Conteúdo | seções, tabelas, formulário | única região que rola |
| R5 | Trilho | prévia da DM, diagnóstico lateral | 360 px, sticky a partir de `xl` |

A ilha de status (R6 da v6) foi retirada: o estado da fila já aparece em
Operação, na Visão geral, e em Atividade.

**Grid:** desktop de referência 1440 px, conteúdo até 1240 px, gutter 32 px.
Visão geral usa `1fr / 300px`; Conexão usa `1fr / 1fr` com régua vertical;
Editor usa `1fr / 360px` a partir de `xl`. Ritmo vertical: 24 px entre blocos
de R2, 36 px entre seções, 16 px entre campos, 8 px entre controles.

**Responsivo:** abaixo de `lg` o trilho desce; abaixo de `md` a navegação vira
abas, as tabelas viram registros de 2 a 3 linhas e a ação primária sobe para a
barra do polegar com `safe-area-inset-bottom`. Em 320 px e 200% de zoom não há
scroll horizontal. O editor mantém a prévia depois do formulário e uma barra
fixa de salvar.

---

## 5. Tokens

Os nomes seguem os **slots do shadcn/ui**, para que todo componente baixado pelo
CLI (shadcn ou Kokonut) herde o tema. Extras do MARICHAT têm prefixo próprio.
Hex só existe em `src/styles/tokens.css`; o resto do código usa utilitários
(`bg-card`, `text-muted-foreground`) e o teste de tokens barra qualquer hex
solto em `src/`.

### 5.1 Cor

`:root` é o tema claro; `.dark` redefine os mesmos slots. Não existe terceiro
conjunto de valores.

| Slot | Claro | Escuro | Uso |
| :-- | :-- | :-- | :-- |
| `--background` | `#f2efe7` | `#0b0b0a` | fundo da página |
| `--foreground` | `#191712` | `#f3f0e9` | título e valor |
| `--card` | `#faf8f2` | `#131210` | superfície de card |
| `--card-foreground` | `#191712` | `#f3f0e9` | texto no card |
| `--popover` | `#fdfbf6` | `#171613` | overlay elevado |
| `--popover-foreground` | `#191712` | `#f3f0e9` | texto em overlay |
| `--primary` | `#191712` | `#f3f0e9` | CTA, item ativo, foco |
| `--primary-foreground` | `#f7f4ec` | `#0b0b0a` | texto sobre a primária |
| `--secondary` | `#e7e2d7` | `#1b1917` | superfície de apoio |
| `--secondary-foreground` | `#191712` | `#f3f0e9` | texto sobre apoio |
| `--muted` | `#fbf9f4` | `#141311` | cabeçalho de tabela, campo |
| `--muted-foreground` | `#5c564d` | `#a6a099` | label, timestamp |
| `--accent` | `#e3ded2` | `#1e1c19` | hover de item (slot, não a marca) |
| `--accent-foreground` | `#191712` | `#f3f0e9` | texto sobre hover |
| `--destructive` | `#b42318` | `#f87171` | ação destrutiva |
| `--border` | `#d8d2c5` | `#2b2825` | borda de card e régua |
| `--input` | `#8c8375` | `#6e6862` | borda de controle (3,25:1) |
| `--ring` | `#191712` | `#f3f0e9` | anel de foco |
| `--radius` | `3px` | `3px` | raio base do shadcn |

Extras do MARICHAT:

| Token | Claro | Escuro | Uso |
| :-- | :-- | :-- | :-- |
| `--surface-hover` | `rgb(25 23 18 / 0.05)` | `rgb(243 240 233 / 0.05)` | hover de linha |
| `--line-subtle` | `#e4dfd3` | `#201e1b` | divisor decorativo |
| `--line-strong` | `#c4bcac` | `#3a3632` | seleção, hover forte |
| `--text-tertiary` | `#5c564d` | `#a6a099` | label, meta |
| `--text-muted` | `#6e675c` | `#8c867f` | nota, placeholder (`text-muted-soft`) |
| `--success` | `#0f6b3f` | `#5fd08a` | conectado, aceita, enviado |
| `--warning` | `#7a4f00` | `#fbbf24` | aguardando, token expirando |
| `--danger` | `#b42318` | `#f87171` | falhou, desconectar |
| `--info` | `#0a5f84` | `#7dd3fc` | processando, informativo |
| `--switch-thumb` | `#fdfbf6` | `#f3f0e9` | polegar do switch |
| `--radius-control` | `3px` | `3px` | input, botão |
| `--radius-inner` | `6px` | `6px` | bloco interno |
| `--radius-card` | `6px` | `6px` | card, tabela |
| `--radius-frame` | `10px` | `10px` | overlay, moldura de prévia |
| `--rail-width` | `360px` | `360px` | trilho R5 |
| `--shadow-overlay` | `0 24px 64px rgb(24 20 12 / 0.18)` | `0 24px 64px rgb(0 0 0 / 0.55)` | só overlay |

**Proibido:** `#71717a` como texto (4,12:1, reprova), `zinc-*`/`emerald-*`/
`orange-*` do Kokonut cru, gradiente como fundo de área grande, mais de um
matiz de estado na mesma linha, e hex fora de `tokens.css`.

### 5.2 Contraste verificado (WCAG 2.2 AA)

Valores medidos com os tokens acima; canvas = `--background`, superfície =
`--card`. Tint = a própria cor de estado a 12% sobre o fundo, como nos chips e
alertas.

| Token | Claro canvas | Claro card | Claro tint 12% | Escuro canvas | Escuro card | Escuro tint 12% |
| :-- | --: | --: | --: | --: | --: | --: |
| `--foreground` | 15,59:1 | 16,86:1 | — | 17,30:1 | 16,45:1 | — |
| `--muted-foreground` | 6,32:1 | 6,83:1 | — | 7,60:1 | 7,23:1 | — |
| `--text-muted` | 4,86:1 | 5,26:1 | — | 5,47:1 | 5,20:1 | — |
| `--primary-foreground` sobre `--primary` | 16,29:1 | — | — | 17,30:1 | — | — |
| `--success` | 5,72:1 | 6,19:1 | 4,82:1 | 10,20:1 | 9,70:1 | 7,85:1 |
| `--warning` | 6,20:1 | 6,71:1 | 5,23:1 | 11,80:1 | 11,21:1 | 8,86:1 |
| `--danger` | 5,72:1 | 6,19:1 | 4,74:1 | 7,12:1 | 6,77:1 | 5,80:1 |
| `--info` | 6,13:1 | 6,63:1 | 5,14:1 | 11,81:1 | 11,23:1 | 8,90:1 |
| `--input` (não-texto) | 3,25:1 | 3,52:1 | — | 3,58:1 | 3,41:1 | — |
| `--ring` (não-texto) | 15,59:1 | — | — | 17,30:1 | — | — |

Regras: o pior par de chip é `--danger` no claro (4,74:1) e continua AA. Os
estados do tema claro foram escurecidos de propósito — `#127242`, `#8a5a00` e
`#0b6e99` reprovavam no tint (4,41, 4,39 e 4,20). Desabilitado não usa
`opacity` no texto: usa superfície apagada, `--line-subtle`, `text-muted` e
`aria-disabled`. Placeholder nunca substitui label. Borda com significado usa
`--input` ou `--ring`, nunca hairline decorativa.

**Portão automático:** `tests/unit/design-tokens.test.ts` recalcula todos os
pares acima nos dois temas, mais o tint de 12% de cada estado sobre canvas e
card, e falha o CI abaixo de 4,5:1. Mudar um token sem remedir quebra o build.

### 5.3 Superfícies, régua e movimento

- **Superfície:** `--card` é papel mais claro que o canvas no tema claro e mais
  escuro no escuro; sempre opaco, borda de 1 px `--border`, sem realce interno
  e sem sombra.
- **Elevação:** só overlay. Diálogo e menu usam `--shadow-overlay` e raio de
  10 px.
- **Régua:** seção sem objeto próprio usa `border-b` de 1 px e espaço. Tabela
  usa hairline entre linhas (`--line-subtle`) e nenhuma moldura externa.
- **Hover:** linha e card interativo mudam o fundo para `--surface-hover`; sem
  translate, sem escala.
- **Textura:** nenhuma. Sem aurora, dot grid, ruído ou vidro.

| Movimento | Duração | Onde |
| :-- | :-- | :-- |
| hover/press | 150 ms, ease-out | botão, linha, item de nav |
| overlay | 240 ms, ease-out | diálogo, menu |
| troca de tema | instantânea | classe no `<html>` |

Em `prefers-reduced-motion: reduce`, sem transform nem pulso; só opacidade.

### 5.4 Tipografia

**IBM Plex Sans** (400/500/600) para interface e títulos, **IBM Plex Mono**
(400/500) para dado técnico. A escala é curta e não tem passo decorativo.

| Token | Tamanho/linha | Peso | Uso |
| :-- | :-- | :-- | :-- |
| `display` | 30/34 px, -0,02em | 600 | `h1` de página |
| `section` | 15/22 px, -0,005em | 600 | título de seção |
| `title` | 16/22 px | 600 | título de bloco |
| `body` | 16/24 px | 400 | corpo |
| `label` | 13/18 px | 500 | label, botão, nav |
| `micro` | 11/16 px, +0,08em | 600 | cabeçalho de tabela, chip |
| `figure` | 26/30 px, -0,01em | 500 | número de leitura |
| `mono` | 13/20 px | 400 | handle, ID, URL, data |

Dado pequeno em tabela e registro usa 12 px em mono — é dado, não texto
corrido. **16 px é o piso do texto corrido**; `micro` só existe em caixa alta
curta. Máximo dois pesos por bloco; sem itálico; `tabular-nums` em métrica;
linha de 62 a 70ch; `text-wrap: balance` em título.

### 5.5 Espaço, raio, ícones

Espaço só em 4, 8, 12, 16, 24, 32, 48 e 64. Raio: 3 controle, 6 card, 10
overlay. Ícones **Lucide** (16/18/20 px, stroke 1,75), `aria-hidden` quando
decorativos; ícone sozinho exige `aria-label`. Avatar 24 px em tabela, 32 px no
menu, 40 px em card, sempre com borda e fallback de iniciais. Ícone só onde
acelera reconhecimento: navegação, controle e estado. Sem ícone decorativo em
título de seção.

### 5.6 Foco e teclado

Anel de 2 px `--ring` + 2 px de offset, sempre visível (é tinta, não matiz).
Ordem de tabulação segue a leitura. `Esc` fecha overlay e devolve o foco ao
gatilho. Rádio, tema e menu usam setas. Skip link "Pular para o conteúdo".
`Ctrl K` abre comandos. O editor avisa antes de fechar a aba com alterações não
salvas.

### 5.7 Temas

- `:root` é claro; `.dark` no `<html>` troca os tokens e `color-scheme`.
- Um script inline no `<head>` (`themeScript`) lê `localStorage["marichat-theme"]`
  e aplica a classe **antes da primeira pintura** — sem flash de tema errado.
- O padrão é `system`. O menu de conta oferece Sistema / Claro / Escuro.
- Mudança do sistema operacional (`matchMedia`) e de outra aba (`storage`) são
  ouvidas; o menu emite `marichat-theme-change` para o próprio estado reagir.
- Sem dependência nova (`next-themes` não é usado): são ~40 linhas em
  `components/marichat/theme-menu.tsx`.
- O tema não vai para o servidor; cada navegador guarda o seu.

---

## 6. Base de componentes

### 6.1 Regra de origem

1. Existe no **Kokonut OSS** e serve ao painel? → instalar pelo registry, copiar
   para `src/components/kokonutui/` e adaptar.
2. Não existe no Kokonut? → **shadcn/ui** (o que o Kokonut usa por baixo).
3. Não existe em nenhum dos dois? → componente próprio em
   `src/components/marichat/`, com justificativa no commit.

A adaptação é obrigatória em todos os casos: tokens do §5, copy pt-BR, movimento
do §5.3, acessibilidade do §9. O código é nosso; atualização do Kokonut não
entra automaticamente.

### 6.2 Componentes por necessidade

| Necessidade | Componente | Origem | Arquivo |
| :-- | :-- | :-- | :-- |
| Botão | `button` | shadcn | `ui/button.tsx` |
| Campo, área de texto, label | `input`, `textarea`, `label` | shadcn | `ui/*` |
| Grupo de campo com ajuda/erro | `field` | shadcn | `ui/field.tsx` |
| Tabela (densidade única) | `table` | shadcn | `ui/table.tsx` |
| Chip de status | `badge` adaptado | shadcn | `ui/status-chip.tsx` |
| Alerta R3 | `alert` | shadcn | `ui/alert.tsx` |
| Toast | `sonner` | shadcn | `ui/sonner.tsx` |
| Diálogo de confirmação | `alert-dialog` | shadcn | `ui/alert-dialog.tsx` |
| Menu de conta e tema | `dropdown-menu` | shadcn | `ui/dropdown-menu.tsx` |
| Comandos `Ctrl K` | `action-search-bar` | Kokonut | `marichat/command-palette.tsx` + `kokonutui/action-search-bar.tsx` |
| Toggle de automação | `switch` | shadcn | `ui/switch.tsx` |
| Porta de seguidor | rádio nativo estilizado | — | `automacoes/follow-gate-section.tsx` |
| Skeleton | `skeleton` | shadcn | `ui/skeleton.tsx` |
| Avatar com fallback | `avatar` | shadcn | `ui/avatar.tsx` |
| Tooltip | `tooltip` | shadcn | `ui/tooltip.tsx` |
| Cabeçalho de página e de seção | próprio | — | `marichat/page-header.tsx` |
| Barra de ação do polegar | próprio | — | `marichat/mobile-action-bar.tsx` |
| Filtro que aplica sozinho | próprio | — | `marichat/filter-select.tsx` |
| Estado do tema | próprio | — | `marichat/theme-menu.tsx` |

A ilha de status saiu na v7 (§4); o componente não fica no repositório.

### 6.3 O que o Kokonut tem e o MARICHAT **não** usa

| Componente | Por que não |
| :-- | :-- |
| `morphic-navbar` | a barra dobra ao rolar e usa mola + laranja; a nav é fixa e nunca rola para fora |
| `metric-card` | card analítico com período, gráfico e seleção por arrasto; o painel usa leitura em `dl` |
| `bento-grid` | composição trivial em CSS grid; não vale a dependência |
| `notification-stack` | pilha de toasts decorativa; alerta é `alert` e toast é `sonner` |
| `smooth-tab` | abas com mola; Atividade usa régua com sublinhado |
| `smooth-drawer` | é um sheet de checkout, não um drawer de navegação |
| `profile-dropdown` | trava troca de tema e multi-conta; o menu usa `dropdown-menu` |
| `hold-button`, `undo-button` | não há ação irreversível por gesto nem desfazer pendente na v7 |
| `uptime-card` | não existe série histórica de saúde na v1 |
| `card-flip`, `card-stack`, `liquid-glass-card`, `page-flip`, `carousel-cards` | física/3D/carrossel: fora das leis |
| Fundos (`particles`, `caustics`, `rain-glass`, `ink`, `topo`, `halftone`, …) | performance, contraste e ruído |
| Texto animado (`type-writer`, `glitch`, `split-flap`, …) | leitura instável |
| Botões de efeito (`particle`, `attract`, `bell`, `pull-cord`, `tear`, …) | Hick/Fitts: efeito imprevisível |
| Inputs especializados (`seat-map`, `amount-pad`, `wheel-picker`, …) | não existem no domínio |
| `media/*` | o produto não edita mídia |
| `ai/*` | IA está fora do escopo v1 |

Detalhe completo em [`docs/KOKONUT.md`](docs/KOKONUT.md).

### 6.4 Orçamento de variantes

| Componente | Variantes permitidas |
| :-- | :-- |
| Botão | `primary`, `secondary`, `ghost`, `destructive`, `link`; tamanhos `sm 32`, `md 40`, `lg 48` |
| Chip | `success`, `warning`, `danger`, `neutral`, `info`, `loading` |
| Input | `default`, `with-icon`, `error`, `disabled` |
| Tabela | uma densidade: linha 52 px, sem zebra |
| Toggle | on, off, disabled |
| Diálogo | confirmação |

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

Estados de tela: skeleton de 5 linhas para tabela e de uma linha para leitura;
vazio com uma ação; erro com "Tentar novamente"; parcial com "Mostrando 8 de 44".
Lista vazia não mostra cabeçalho de tabela vazio.

---

## 8. Acessibilidade (WCAG 2.2 AA)

- Contraste do §5.2 em todos os pares, nos dois temas, inclusive chip sobre tint.
- Foco visível em todo elemento interativo; alvo mínimo 24×24, 48×48 no mobile.
- Um `h1` por tela; landmarks `nav`, `main`, `aside`; tabela com `caption`
  oculto e `scope="col"`.
- Métricas em `dl`; status com texto; erro de campo com `aria-invalid` +
  `aria-describedby`; abas com `aria-current`.
- Overlays prendem o foco, fecham com `Esc` e devolvem o foco ao gatilho.
- 320 px e 200% de zoom sem scroll horizontal nem texto cortado.
- Nenhuma informação só por cor.

**Portão automático:** `npm run a11y` roda axe (WCAG 2.0/2.1/2.2 A e AA) nas 7
rotas × 3 viewports (1440, 390, 320), mede `scrollWidth` e falha em qualquer
violação ou overflow. `node scripts/a11y.mjs dark` repete a auditoria no tema
escuro. Hoje: 21/21 em cada tema.

---

## 9. Especificação das telas

### 9.1 Visão geral (`/admin`) — R1, R2, R3, R4, R5

- **R2:** `h1` "Visão geral"; em mono, o fluxo real: `44 comentários → 38 DMs
  aceitas → 28 links`; CTA "Nova automação" (no celular, barra fixa).
- **R3:** no máximo 2 alertas. Exemplos: "Nenhuma conta conectada" (warning,
  ação "Conectar agora"); "O token expira em 6 dias" (warning); erro de webhook
  (danger, ação "Ver Conexão").
- **R4:** grid `1fr / 300px`. Na coluna principal:
  1. **Precisa de atenção** — ledger, não card: `@handle` em mono, motivo em
     texto, tempo relativo em mono, chip de estado e "Revisar". Cada linha leva
     a `/admin/atividade?situacao=`. No celular empilha em 3 linhas com
     "Revisar" à direita. Vazio: "Nada precisa de atenção agora. A fila segue
     sozinha."
  2. **Últimos comentários** — 8 no desktop (`8 de 44` na régua), 6 no celular.
     Desktop: tabela Quando / Automação / Quem comentou / Situação. Celular:
     registro de 2 linhas (automação + chip; handle + data).
  No trilho, **Operação**: `dl` de régua com Mensagens na fila, Aguardando
  resposta, Última tarefa, Último webhook, mais a nota de que "aceita" significa
  que a Meta recebeu a solicitação, não que a pessoa leu.
- **Fora da tela:** painel de conta (o `@handle` na nav resolve), token com data,
  métricas duplicadas e ilha flutuante.
- **Estados:** sem conta → alerta com "Conectar agora"; carregando → skeletons;
  fila parada → alerta danger com o horário do último tick.

### 9.2 Automações (`/admin/automacoes`) — R1, R2, R3, R4

- **R2:** `h1` + contagem real em mono (`6 automações · 5 ativas`, ou
  `2 de 6 automações` com filtro) + "Nova automação".
- **Filtro:** busca por nome/palavra-chave e select de situação, ambos na URL. O
  select aplica ao trocar (`requestSubmit`), sem botão "Filtrar"; "Limpar"
  aparece só quando há filtro. No celular, campo e select ficam empilhados com
  largura de controle, não de formulário.
- **Tabela (desktop):** Nome, Palavra-chave (mono), Link (host sem protocolo,
  mono, truncado em 240 px), Situação (chip `ativa`/`pausada`), switch com
  `aria-label`, "Editar" como link de texto com alvo de 48 px.
- **Registro (celular):** 3 linhas — nome + switch; palavra-chave · link em mono;
  chip + "Editar".
- **R3:** aviso de salvo; aviso de conta ausente.
- **Rodapé da lista:** "Editar uma automação afeta apenas comentários novos.
  Quem já comentou continua o fluxo com o texto do momento do comentário."
- **Estados:** sem conta → aviso + "Conectar"; nenhuma automação → bloco vazio
  com "Criar automação"; filtro sem resultado → "Nenhuma automação com esse
  filtro. Limpar".

### 9.3 Editor (`/admin/automacoes/nova`, `/[id]`) — R1, R2, R4, R5

- **R2:** voltar "Automações"; `h1` "Nova automação" / "Editar automação";
  status em mono (`rascunho · nada foi salvo ainda`, `alterações não salvas`,
  `salva`); "Cancelar" (secondary) e "Salvar automação" (primária).
- **R4 — formulário em seções com régua:**
  1. **Identificação** — nome, palavra-chave (prefixo `#`, ajuda "ignora
     maiúsculas, acentos e pontuação") e switch "Ativa".
  2. **Publicação** — lista de publicações da conta; quando a API não responde,
     aviso âmbar "Lista de publicações indisponível" e o campo de ID continua
     aceito. ID opcional em mono.
  3. **Resposta no comentário** — frases públicas, uma por linha.
  4. **Primeira mensagem (privada)** — texto e texto do botão (até 20
     caracteres), com o aviso de que a Meta pode recusar botão para quem não
     segue.
  5. **Porta de seguidor** — 5 opções em rádio: sem porta, tolerante, travado,
     opcional, direto; cada uma com uma linha de efeito.
  6. **Segunda mensagem (o link)** — texto, texto do botão e URL https em duas
     colunas a partir de `sm`.
- **R5:** prévia da DM em 360 px, sticky a partir de `xl`, com as duas bolhas, o
  botão e "Prévia aproximada. O Instagram pode alterar a aparência." Atualiza a
  cada tecla (a prévia é leve; sem debounce).
- **Celular:** formulário em uma coluna, prévia depois do formulário, barra fixa
  "Salvar automação" acima das abas.
- **Sair com alterações:** diálogo "Descartar alterações?" + aviso do navegador
  ao fechar a aba.

### 9.4 Atividade (`/admin/atividade`) — R1, R2, R3, R4

- **R2:** `h1` "Atividade"; contagem em mono
  (`30 interações · 30 envios · 30 webhooks`); "Atualizar" preserva aba e filtro.
- **R3:** até 2 alertas — conta ausente (warning), tarefa agendada parada
  (danger, com horário do último tick e o endpoint do cron), inscrição de
  webhook falhou (danger, "Ver Conexão").
- **Abas na URL:** Interações (`?situacao=`), Envios, Webhooks. Régua inferior
  com sublinhado de 2 px no ativo, não segmentado em pílula. Uma lista por vez.
- **Filtro** de situação só em Interações: select que aplica ao trocar.
- **Listas:** Interações — Quando, Automação, Comentário (texto + `@autor`),
  Situação. Envios — Atualizado, Tipo, Quem, Situação, Erro. Webhooks — Quando,
  Campo, Situação, Erro. No celular cada linha vira registro de 2 a 3 linhas
  (título + chip, handle/data em mono, erro em vermelho com 2 linhas no
  máximo). Sem ID de mídia, ID cru, contagem de checagens nem código cru.
- **Diagnóstico** (último tick, dreno, resultado, último envio, teste de
  conexão) fica em "Diagnóstico da operação", fechado por padrão.

### 9.5 Conexão (`/admin/conexao`) — R1, R2, R3, R4, R5

- **R2:** `h1` "Conexão"; `transporte: meta|zernio` em mono; "Testar conexão".
- **R3:** avisos de retorno (conectado, webhook solicitado, desconectado,
  testado, erro por código).
- **Conta:** avatar, `@handle`, chip "Conectada"; `dl` de régua com ID na API,
  Token expira em, Webhooks e Assinado em; "Reconectar", "Reassinar webhooks" e
  "Desconectar" (destrutiva com confirmação).
- **Diagnóstico** na coluna ao lado a partir de `lg`, separado por régua
  vertical: descrição em uma frase, lista de checagens com ícone e texto,
  último teste e um alerta de resultado ("Tudo certo" ou "O que precisa de
  atenção" com a lista de problemas).
- **Avançado** (fechado): endereço do webhook e campos a assinar, checklist de
  variáveis de ambiente e últimos webhooks recebidos. A tela padrão mostra
  conta, diagnóstico e a ação de testar.
- **Sem conta:** cartão vazio com as contas disponíveis no provedor e o caminho
  para conectar.

---

## 10. Governança

### 10.1 Componente pronto

- [ ] Usa só tokens do §5 (nenhum `zinc`, `emerald`, `orange`, hex ou px solto).
- [ ] Tem os estados do §7 que se aplicam.
- [ ] Tem anatomia (label, ajuda, erro, contador).
- [ ] Passa teclado, foco visível e leitor de tela.
- [ ] Contraste medido no fundo real, nos dois temas.
- [ ] Tem vazio/loading/erro quando busca dados.
- [ ] Respeita `prefers-reduced-motion`.
- [ ] Está registrado no §6.2 com origem (Kokonut, shadcn ou próprio).

### 10.2 Tela pronta

- [ ] Cabe nas regiões do §4; nav com 4 itens.
- [ ] Uma ação primária; destrutivas com confirmação.
- [ ] AA nos dois temas, foco visível, alvos de 48 px no mobile.
- [ ] 320 px e 200% sem scroll horizontal.
- [ ] Vazio, loading (<400 ms percebidos) e erro existem.
- [ ] Copy pt-BR, sem emoji e sem exclamação.
- [ ] Nenhum dado inventado; "aceita" onde couber.
- [ ] A tela tem layout próprio — não é o mesmo card com outro título.

### 10.3 Stitch

O alvo da v7 foi gerado e aprovado antes da implementação: `.stitch/rework/`
guarda `target.html`, as capturas do alvo e as capturas de conferência em
`after-light/` e `after-dark/` (7 rotas × 3 viewports por tema). O `.stitch/` é
gitignored: é material de trabalho, não fonte. Antes de gerar uma tela nova,
enviar este `DESIGN.md`; a v5 e a v6 não são fonte.

### 10.4 Ordem de implementação

1. Tokens do §5 em `src/styles/tokens.css` e a ponte em `globals.css`.
2. Componentes do §6.2 (base shadcn primeiro, Kokonut depois), cada um pelo
   gate do §10.1.
3. Casca do painel (R1), incluindo o script de tema antes da pintura.
4. Visão geral, Automações, Editor, Atividade, Conexão — uma por vez.
5. Portões: `npm run lint:ci`, `npm run typecheck`, `npm test`,
   `npm run a11y` e `npm run build`.

---

## 11. Decisões

### 11.1 Decisões da v7 (2026-10-28)

| Decisão | Por quê |
| :-- | :-- |
| Identidade "instrumento" no lugar de "mesa de operação" | A v6 ainda lia como dashboard: lime de marca, card em toda parte e métrica grande. Papel, tinta e régua dão densidade sem decoração. |
| Ação primária é tinta, não matiz | Com a cor reservada para estado, a primária fica óbvia em qualquer tela e o produto deixa de depender de um acento sazonal. |
| IBM Plex Sans + Plex Mono | Plex tem desenho de instrumento e uma mono com o mesmo esqueleto; Archivo nos títulos pesava mais que o dado. |
| Escala menor: `display` 30, `figure` 26 | Número grande virava pôster e empurrava o conteúdo para baixo; o dado agora tem o tamanho do dado. |
| Masthead de 56 px | 64 px gastava 8 px de conteúdo em telas de 900 px sem ganhar legibilidade. |
| Tema claro e escuro no mesmo conjunto de tokens | Pedido do produto; `.dark` troca os mesmos slots, sem segundo CSS nem dependência nova. |
| Script de tema antes da primeira pintura | Evita o flash de tema errado sem `next-themes` e sem hidratação divergente. |
| Tema escolhido no menu da conta | É a única preferência de aparência do produto; um botão de tema na nav seria um controle a mais em toda tela. |
| Filtro que aplica ao trocar, sem "Filtrar" | Um controle a menos, e o resultado chega na mesma ação; no celular libera a largura que o botão ocupava. |
| Tabela no desktop, registro de 2–3 linhas no celular | Cinco colunas não cabem em 390 px; o registro mantém a hierarquia sem scroll horizontal. |
| Prévia de 360 px sticky a partir de `xl` | A prévia estava longe do campo que a altera; agora acompanha a rolagem. |
| Atividade e Conexão sem mock próprio | A gramática de R2 + régua + tabela já resolve as duas; um mock por tela só duplicaria decisões. |
| `--switch-thumb` separado do `--background` | Com o polegar em `background`, o switch claro virava um furo branco no trilho escuro. |
| Estados do claro escurecidos | `#127242`, `#8a5a00` e `#0b6e99` reprovavam em 4,41, 4,39 e 4,20 sobre o tint de 12%. |
| Ilha de status removida | O estado da fila já está em Operação e em Atividade; a ilha flutuante era um segundo lugar para a mesma informação. |
| Teste de tokens com tint de 12% | O contraste real do chip não é cor sobre canvas; medir o tint evita aprovar no papel e reprovar no axe. |

### 11.2 Herdado da v6 (continua valendo)

| Decisão | Por quê |
| :-- | :-- |
| Superfícies opacas, sem vidro/aurora/dot grid | Profundidade falsa não ajuda a decidir; densidade vem da régua e do dado. |
| Régua antes de caixa | Card em tudo era o principal sinal de template. |
| "Editar" como link em cada automação | Ação repetida em card vira ruído; link com alvo de 48 px resolve. |
| Uma ação primária por tela | Duas ações de peso igual não dizem o que fazer primeiro. |
| Números não mentem | "Aceita" é o que a Meta confirma; o produto não promete leitura. |
| Sem dado inventado | Métrica sem dado mostra `—`; demo só existe local. |

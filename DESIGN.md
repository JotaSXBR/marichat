---
name: MARICHAT Design System v3
colors:
  background: '#09090B'
  on-background: '#FAFAFA'
  surface: '#0F0F11'
  on-surface: '#FAFAFA'
  surface-container: '#131315'
  on-surface-variant: '#D4D4D8'
  primary: '#A3E635'
  on-primary: '#0A0A0A'
  primary-container: '#A3E635'
  on-primary-container: '#0A0A0A'
  outline: '#66666D'
  error: '#F87171'
  on-error: '#0A0A0A'
  canvas: '#09090B'
  sunken: '#0F0F11'
  glass: 'rgba(255,255,255,0.04)'
  glass-raised: 'rgba(255,255,255,0.07)'
  hairline: 'rgba(255,255,255,0.10)'
  hairline-strong: 'rgba(255,255,255,0.18)'
  control-border: '#66666D'
  accent: '#A3E635'
  accent-soft: 'rgba(163,230,53,0.12)'
  text-primary: '#FAFAFA'
  text-secondary: '#D4D4D8'
  text-tertiary: '#A1A1AA'
  text-muted: '#8A8A93'
  text-on-accent: '#0A0A0A'
  success: '#34D399'
  warning: '#FBBF24'
  danger: '#F87171'
  info: '#60A5FA'
  focus-ring: '#A3E635'
typography:
  type-display:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.03em
  type-section:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.02em
  type-card:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 22px
  type-body:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  type-label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  type-micro:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
  type-mono:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  control: 12px
  inner: 16px
  card: 24px
  device: 32px
  pill: 9999px
spacing:
  space-1: 4px
  space-2: 8px
  space-3: 12px
  space-4: 16px
  space-6: 24px
  space-8: 32px
  space-12: 48px
  space-16: 64px
---

# Design System: MARICHAT v3

**Versão 3.0 · 26/10/2026.** Substitui a v2 (`docs/DESIGN.md`). Esta versão mantém a direção visual aprovada, corrige os pontos de contraste e de estados, incorpora o que o **Kokonut UI** tem de melhor e reduz o que ele tem de excessivo. É normativa: os números daqui vencem o gosto.

**Hierarquia de decisão:** acessibilidade (WCAG 2.2 AA) > consistência (tokens e estados) > leis de usabilidade > expressão visual.

**Contrato de uso**

- Toda tela nasce das seis regiões, dos componentes e dos tokens definidos aqui. Não existe cor, raio, espaçamento ou tamanho de fonte avulso.
- Todo componente interativo entrega os estados da matriz da §6.2. Componente sem `focus-visible`, `disabled`, `loading` e `error` (quando busca dados) é considerado incompleto.
- O produto é **dark-first, tema único**. Não há alternância claro/escuro: isso reduz variantes, evita inconsistência e simplifica a revisão de contraste.
- A interface é em português do Brasil, operacional e direta. Sem emoji, sem exclamação, sem tom de marketing.
- O Stitch é a **referência de layout**. A implementação usa Kokonut UI (padrões expressivos) + shadcn/ui (primitivas) sobre os tokens abaixo.

---

## 0. O que mudou da v2 para a v3

| Área | Mudança | Motivo |
| :-- | :-- | :-- |
| Kokonut UI | Auditoria explícita: 12 padrões adotados, 6 famílias rejeitadas | Aprender sem transformar o painel em vitrine de efeitos |
| Leis | Matriz lei → regra → antídoto | A regra deixa de ser princípio solto e vira teste de tela |
| Contraste | `border.control` sólido em `#66666D` (3,49:1) para campos | O hairline de 10% não sustenta 3:1 em borda de controle |
| Contraste | `Steel #71717A` proibido como texto normal | 4,12:1 no canvas e 3,84:1 no vidro; reprova em AA |
| Contraste | Texto desabilitado não cai abaixo de 4,5:1 | Opacidade 40% era ilegível; o estado passa a usar superfície e `aria-disabled` |
| Navegação | 4 itens fixos + menu de conta + `Ctrl K` | Miller e Hick: reconhecer em vez de procurar |
| Telas | Inventário fechado de 5 telas | "Sem exageros": cada tela tem função operacional distinta |
| Formulários | Confirmação ao **ativar** automação, não ao "publicar no Instagram" | O produto cria automações; não publica conteúdo na Meta |
| Erros | Resumo de erro no topo + erro inline + foco no primeiro campo inválido | Nielsen #5 e #9 |
| Agentic UX | Escada de autonomia, proveniência e aprovação humana | IA sugere; pessoa aprova; nada é aplicado sozinho |
| Movimento | Apenas 3 movimentos aprovados | `prefers-reduced-motion` e foco operacional |

---

## 1. Produto, público e princípios

**O que é.** MARICHAT automatiza o fluxo *comentário com palavra-chave → DM privada → resposta da pessoa → link*. O operador é uma pessoa ou equipe pequena que precisa saber, em segundos, se o fluxo está saudável e o que fazer quando não está.

**O que o painel precisa entregar, em ordem:**

1. **Verdade operacional.** "Aceita" não é "entregue". O painel não inventa confirmação de leitura.
2. **Ação segura.** Criar, editar, ativar e pausar automações sem perder texto e sem disparo acidental.
3. **Diagnóstico rápido.** Quando a fila para, a tela mostra onde parou e qual é o próximo passo.
4. **Calma.** Densidade sem ruído; um acento; movimento discreto.

**Princípios de design**

1. **Status antes de decoração.** Todo número tem rótulo, unidade, período e estado. Nada de gráfico sem fonte.
2. **Uma ação primária por tela.** O resto é secundário, fantasma ou está no menu de contexto.
3. **Consequência antes do clique.** Ação destrutiva explica o efeito, oferece cancelar e exige confirmação proporcional.
4. **Nunca perder trabalho.** Rascunho local a cada 5 s; aviso ao sair com alterações; restauração com banner.
5. **IA sugere, pessoa aprova.** Nenhuma mutação gerada por IA é aplicada automaticamente.
6. **Acessível por padrão.** Contraste, foco, teclado, zoom e leitor de tela não são "extras".

---

## 2. Leis → regras → antídotos

| Lei / princípio | Onde aparece | Regra concreta | Antídoto (o que não fazer) |
| :-- | :-- | :-- | :-- |
| **Jakob** | Navegação, copy, estados | Usar o vocabulário do Instagram: comentário, DM, link, seguidor, webhook. "DM enviada (aceita)" em vez de "sucesso". | Inventar "campanhas", "fluxos", "jornadas" |
| **Região comum** | Cards, painéis, formulário | Coisas que funcionam juntas ficam no mesmo contêiner. Grupos não relacionados são separados por 32 px, não por uma linha. | Card dentro de card sem hierarquia; painel solto no meio do conteúdo |
| **Proximidade** | Anatomia de campo | Label → controle: 8 px. Controle → ajuda/erro: 6 px. Entre grupos: 16 px. | Erro no topo da página para um campo específico |
| **Miller (chunking)** | Nav, filtros, grids, formulário | Nav: 4 itens (máx. 5). Filtros: máx. 4. Grid: 5–7 itens por bloco. Formulário: máx. 7 controles visíveis por grupo. | 12 cards soltos; 8 filtros; nav com 7 abas; abas dentro de abas |
| **Hick** | Variantes e escolhas | Só existe variante usada por uma das 5 telas. Padrão seguro: "Sem porta de seguidor" e "Opcional" antes de "Travado". | 6 estilos de botão; 5 opções de densidade; menu com 20 ações |
| **Fitts** | Alvos de clique | CTA primário 40 px de altura, área ≥ 44×44. Ícone 36 px visual, 44 px de alvo. Linha inteira da tabela é clicável. | Ícone de 16 px sem padding; dois alvos a menos de 8 px |
| **Nielsen #1** (status) | Header, chips, ilha | Estado sempre visível: dot + texto. Fila e conexão em `aria-live="polite"`. | Cor sozinha; bolinha sem rótulo |
| **Nielsen #2** (mundo real) | Copy | Palavras do domínio, não do banco. "Aguardando confirmação de seguidor", não `gate_pending`. | Código interno na interface |
| **Nielsen #3** (controle) | Automações, formulário | Pausar é reversível com "Desfazer" por 8 s. Cancelar sempre visível. Esc fecha overlay. | Modal sem saída; ação que salva e fecha sem confirmação |
| **Nielsen #4** (consistência) | Tokens e componentes | Mesmo token, mesmo estado, mesmo nome em todas as telas. | Botão primário verde em uma tela e azul em outra |
| **Nielsen #5** (prevenção) | Formulários e destrutivos | Validação no blur; resumo no submit; confirmação ao ativar; digitar `@handle` para desconectar. | Validar só no servidor; apagar sem confirmação |
| **Nielsen #6** (reconhecer) | Busca, filtros, prévia | Prévia da DM ao lado do formulário; filtros com contagem; sugestões com exemplos. | Decorar sintaxe de palavra-chave; formulário sem prévia |
| **Nielsen #7** (flexibilidade) | Atalhos | `Ctrl K` abre comandos; `/` foca a busca; setas navegam rádio/segmentado. Atalhos não substituem o clique. | Atalho escondido como única forma |
| **Nielsen #8** (minimalismo) | Todas as telas | Cada elemento tem função. Sem ilustração decorativa, sem card de marketing, sem gráfico sem dado. | Hero, badges sem significado, 3 gráficos para 1 número |
| **Nielsen #9** (recuperação) | Erros | Erro inline diz o que houve e como corrigir; retry no bloco afetado; nunca página inteira em erro. | "Algo deu errado" sem ação |
| **Nielsen #10** (ajuda) | Conexão, vazio | Ajuda contextual no ponto de dúvida (helper, checklist, link para doc). | Central de ajuda separada para o básico |
| **Doherty (<400 ms)** | Loading | 0–100 ms: otimista, sem spinner. 100–400 ms: skeleton do layout final. 400 ms–10 s: skeleton + rótulo do passo. >10 s: job + ilha de status. | Spinner sobre conteúdo; tela em branco; layout pulando |
| **WCAG 2.2 AA** | Tokens e componentes | Contraste, foco visível, alvo mínimo, teclado, zoom 200%, 320 px. | `outline: none`; texto cinza claro; alvo de 20 px |

---

## 3. Arquitetura de informação

### 3.1 Navegação

Uma única navegação, em pílula flutuante. **4 itens, máximo 5** (o quinto só entra via "Mais", nunca como sexto):

1. **Visão geral** — saúde do fluxo e próximos passos.
2. **Automações** — lista e editor.
3. **Atividade** — interações, fila e webhooks.
4. **Conexão** — conta, token, webhooks e ambiente.

À direita: indicador de conexão (`● @handle`), botão de comandos (`Ctrl K`) e menu de conta. O menu de conta concentra "Reconectar", "Documentação" e "Sair". Não há sidebar, não há topbar duplicada, não há tema claro.

### 3.2 Inventário fechado de telas (5)

| # | Rota | Tela | Objetivo | Ação primária | Regiões |
| :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | `/admin` | Visão geral | Saber se o fluxo está saudável e o que exige atenção | Nova automação | R1, R2, R3, R4, R6 |
| 2 | `/admin/automacoes` | Automações | Encontrar, ativar, pausar e editar automações | Nova automação | R1, R2, R3, R4 |
| 3 | `/admin/automacoes/nova` e `/[id]` | Editor de automação | Criar ou editar com prévia fiel | Salvar automação | R1, R2, R3, R4, R5 |
| 4 | `/admin/atividade` | Atividade | Diagnosticar interações, fila e webhooks | Atualizar | R1, R2, R3, R4, R6 |
| 5 | `/admin/conexao` | Conexão | Conectar, testar e corrigir a integração | Testar conexão | R1, R2, R3, R4, R5 |

**Fora do escopo visual:** páginas legais (`/privacidade`, `/exclusao-de-dados`) usam o mesmo tema, mas são documentos de leitura; não recebem os slots de IA nem a navegação do painel. A tela de autenticação é o diálogo HTTP Basic do navegador; não criamos tela de login própria.

### 3.3 Profundidade e URLs

- Profundidade máxima: **2 níveis** (nav → página → drawer). Nunca nav → página → aba → drawer.
- O editor tem URL própria (`/admin/automacoes/[id]`) para voltar, recarregar e compartilhar.
- Filtros e busca vivem na URL (`?q=&status=`) para sobreviver ao refresh.
- "Voltar" preserva a posição da lista; o editor avisa se há alterações não salvas.

---

## 4. Arquitetura visual

### 4.1 As seis regiões canônicas

Toda tela do produto é composta por estas regiões, nesta ordem:

| # | Região | Conteúdo | Regra |
| :-- | :-- | :-- | :-- |
| **R1** | Navegação global | Pílula de vidro flutuante, 4 itens, status, conta | Fixa, 24 px do topo, nunca rola para fora |
| **R2** | Cabeçalho da página | `h1`, subtítulo de uma linha, ação primária, prompt-slot | Ação primária no canto superior direito (Fitts) |
| **R3** | Sinais | Alertas, avisos, faixa de status | Logo abaixo do header; no máximo 2 empilhados |
| **R4** | Conteúdo principal | Bento, tabelas, listas, formulário | A única região que rola |
| **R5** | Trilho de contexto | Prévia da DM, diagnóstico, ajuda | Coluna direita de 380 px, sticky, nunca sobre o conteúdo |
| **R6** | Ilha de status | Conexão/fila em tempo real | Rodapé central, dispensável, esconde após 8 s |

Uma página é `R1 + R2 + (R3?) + R4 + (R5?) + (R6?)`. Nenhuma tela inventa uma sétima região.

### 4.2 Grid, ritmo e densidade

- **Referência:** desktop 1440 px. Conteúdo máximo **1240 px**, margens laterais 24 px.
- **Grid:** 12 colunas, gutter 24 px. Bento: 4 tiles na primeira linha (3+3+3+3), painéis 5/7, tabela full-width.
- **Ritmo vertical:** seções separadas por 32 px; cards por 24 px; controles por 12 px; campos por 16 px.
- **Padding:** card 24 px; controle 12 px horizontal; linha de tabela 16 px.
- **Linha de leitura:** máximo **68ch** dentro de cards; tabelas com `tabular-nums`.
- **Densidade:** uma única densidade de tabela (linha 56 px, sem zebra). Não existe variante compacta/comfortable.
- **Scroll:** só R4 rola. R1, R2 e R5 ficam fixas/sticky. A página não deve ter scroll horizontal em 320 px.

### 4.3 Responsivo

| Faixa | Grid | Navegação | Trilho R5 | Tabelas |
| :-- | :-- | :-- | :-- | :-- |
| ≥ 1280 px | 12 col, 1240 px | Pílula completa | 380 px sticky | Densidade única |
| 1024–1279 px | 8 col, fluido | Pílula compacta | 320 px ou abaixo | Densidade única |
| 768–1023 px | 4 col, 16 px gutter | Barra compacta + drawer | Empilhado abaixo do formulário | Scroll horizontal com primeira coluna sticky |
| < 768 px | 1 col, 16 px gutter | Drawer | Empilhado | Linhas viram blocos rotulados, sem scroll lateral |

- Ação primária em mobile: barra inferior fixa, 44 px de altura, com `safe-area-inset-bottom`.
- O prompt-slot colapsa em um botão de 40 px; o drawer abre por cima, com foco preso e Esc.
- Em 200% de zoom e 320 px, nenhum texto é cortado e nenhum alvo fica abaixo de 24×24.

### 4.4 Conteúdo adaptável

- Textos gerados por IA usam `min-height` + `line-clamp-2`; nunca quebram o card.
- Métrica sem dados mostra `—` e a dica "sem dados no período"; nunca um card vazio.
- Tabela cresce com "Carregar mais"; nunca muda a altura da linha.
- Número gerado por IA carrega chip de proveniência ("Gerado · 24/10 14:32").
- Lista vazia mostra estado vazio com uma ação; não mostra cabeçalho de tabela vazio.

---

## 5. Tokens

### 5.1 Cor

Nomes semânticos no padrão `color.<papel>.<variante>`. Componentes nunca usam hex; só tokens.

| Token | Valor | Uso |
| :-- | :-- | :-- |
| `color.bg.canvas` | `#09090B` | Fundo da página |
| `color.bg.sunken` | `#0F0F11` | Trilho, cabeçalho de tabela, input |
| `color.surface.default` | `rgba(255,255,255,0.04)` | Card, painel |
| `color.surface.hover` | `rgba(255,255,255,0.07)` | Hover de card/linha |
| `color.surface.active` | `rgba(255,255,255,0.10)` | Segmento selecionado, pressionado |
| `color.border.subtle` | `rgba(255,255,255,0.06)` | Divisor decorativo |
| `color.border.default` | `rgba(255,255,255,0.10)` | Borda de card (decorativa) |
| `color.border.strong` | `rgba(255,255,255,0.18)` | Card selecionado, hover forte |
| `color.border.control` | `#66666D` | Borda de input, toggle, segmentado; 3,49:1 |
| `color.accent.default` | `#A3E635` | CTA, item ativo, foco |
| `color.accent.soft` | `rgba(163,230,53,0.12)` | Chip e tile de ícone |
| `color.text.primary` | `#FAFAFA` | Títulos e valores |
| `color.text.secondary` | `#D4D4D8` | Corpo |
| `color.text.tertiary` | `#A1A1AA` | Labels, timestamps |
| `color.text.muted` | `#8A8A93` | Placeholder, nota, meta (AA) |
| `color.text.on-accent` | `#0A0A0A` | Texto sobre lime |
| `color.status.success` | `#34D399` | Conectado, aceita, link enviado |
| `color.status.warning` | `#FBBF24` | Aguardando, token expirando |
| `color.status.danger` | `#F87171` | Falhou, desconectar |
| `color.status.info` | `#60A5FA` | Informativo, processando |
| `color.focus.ring` | `#A3E635` | Anel de 2 px + offset de 2 px |

**Proibido:** `#71717A` (Steel) como texto normal; qualquer hex fora desta tabela; gradiente como fundo de área grande; mais de um matiz de acento por tela.

### 5.2 Contraste medido (WCAG 2.2 AA)

Fundos de referência: canvas `#09090B` e glass `#131315` (branco 4% sobre o canvas).

| Token | Canvas | Glass | Veredito |
| :-- | --: | --: | :-- |
| `text.primary` | 19,06:1 | 17,78:1 | AAA |
| `text.secondary` | 13,46:1 | 12,56:1 | AAA |
| `text.tertiary` | 7,76:1 | 7,24:1 | AAA |
| `text.muted` | 5,81:1 | 5,42:1 | AA |
| `text.accent` (lime) | 13,19:1 | 12,31:1 | AAA |
| `text.on-accent` | 13,13:1 | — | AAA |
| `status.success` | 10,35:1 | 9,65:1 | AAA |
| `status.warning` | 11,92:1 | 11,12:1 | AAA |
| `status.danger` | 7,19:1 | 6,71:1 | AA (AAA em texto grande) |
| `status.info` | 7,83:1 | 7,30:1 | AAA |
| `text.muted` (Steel `#71717A`) | 4,12:1 | 3,84:1 | **reprovado para texto normal** |
| `border.control` (`#66666D`) | 3,49:1 | 3,26:1 | AA não-texto |
| `focus.ring` (lime) | 13,19:1 | 12,31:1 | AAA não-texto |

Regras:

- **Texto de chip:** o rótulo usa a cor de status sobre o fundo tintado a 12%. Menor par: danger 6,32:1; info 6,75:1; success 8,72:1; warning 9,79:1; accent 10,66:1. Todos passam AA.
- **Bordas com significado** (input, toggle, segmento, foco) usam `border.control` ou `focus.ring`; hairline de 10% é decoração e não pode ser a única indicação de um controle.
- **Desabilitado:** não usar `opacity: 0.4` no texto. Use superfície mais apagada, borda `border.subtle`, cursor `not-allowed`, `aria-disabled="true"` e texto `text.muted` (5,81:1). O estado é perceptível sem ficar ilegível.
- **Placeholder:** `text.muted` sobre `bg.sunken` (5,60:1). Placeholder nunca substitui label.
- **Foco:** anel de 2 px lime + 2 px de offset. Em superfícies claras do sistema (não existem no produto), usar anel escuro; aqui, lime sempre.
- **Não codificar estado só por cor:** dot + texto; ícone + texto; padrão + rótulo em gráfico.

### 5.3 Superfícies e elevação

- **Vidro:** `surface.default` + blur 20 px + borda 1 px `border.default` + realce interno de 1 px no topo `rgba(255,255,255,0.10)`.
- **Elevação:** sem sombra pesada. Overlays (dialog, drawer, toast) usam sombra `0 24px 64px rgba(0,0,0,0.45)` + borda `border.default`.
- **Aurora:** um brilho radial verde-lima no canto superior direito, opacidade ≤ 8%, nunca atrás de texto denso. Em `prefers-reduced-motion`, estático.
- **Dot grid:** 3% de opacidade, 24 px, apenas no fundo; não sobre cards.
- **Card:** raio 24 px, padding 24 px, sem sombra. Hover eleva 2 px e sobe a borda para `border.strong` (só em card interativo).

### 5.4 Tipografia

**Inter** para UI; **JetBrains Mono** para `@handles`, IDs, URLs, timestamps e números tabulares.

| Token | Tamanho/linha | Peso | Uso |
| :-- | :-- | :-- | :-- |
| `type.display` | 40/44, -0.03em | 600 | `h1` de página |
| `type.section` | 20/28, -0.02em | 600 | Título de seção |
| `type.card` | 15/22 | 500 | Título de card |
| `type.body` | 14/20 | 400 | Corpo |
| `type.label` | 13/18 | 500 | Label, botão, nav |
| `type.micro` | 11/14, +0.08em | 600 | Label uppercase de tabela/métrica |
| `type.mono` | 13/18 | 400 | Dados técnicos |

Regras: no máximo dois pesos por card; sem itálico; `tabular-nums` em métricas e tabelas; 68ch de linha; títulos com `text-wrap: balance`; números grandes com unidade em `type.label` e cor `text.tertiary`.

### 5.5 Espaço, raio e ícones

- **Espaço:** 4, 8, 12, 16, 24, 32, 48, 64. Fora disso, inválido.
- **Raio:** 12 controle, 16 interno, 24 card, 32 moldura de dispositivo, 9999 pílula.
- **Ícones:** Lucide, 16/18/20 px, stroke 1,75, `aria-hidden` quando decorativos. Ícone sozinho exige `aria-label`.
- **Avatares:** 24 px em tabela, 40 px em card, 64 px em perfil. Sempre com borda de 1 px e fallback de iniciais.

### 5.6 Movimento

| Movimento | Duração | Onde |
| :-- | :-- | :-- |
| Hover/press | 120–160 ms, ease-out | Botão, card, linha |
| Revelar painel/drawer | 240 ms, ease-out | Overlay, drawer |
| Pulso de status | 1,6 s, opacidade | Dot "ao vivo" |

Proibido: parallax, tilt 3D, scroll-jacking, partículas, texto que se digita sozinho, bounce. Em `prefers-reduced-motion: reduce`, remover transforms e pulsos; manter apenas mudanças de opacidade.

### 5.7 Foco e teclado

- Foco sempre visível: 2 px lime + 2 px offset. Nunca `outline: none` sem substituto.
- Ordem de tabulação segue a leitura visual; o foco não fica preso atrás de overlay.
- `Esc` fecha dialog/drawer/menu e devolve o foco ao gatilho.
- Rádio, segmentado e menu usam setas; `Enter`/`Espaço` ativam.
- Skip link "Pular para o conteúdo" no topo; landmarks `nav`, `main`, `aside`.
- `Ctrl K` abre comandos; `/` foca a busca quando não há campo em edição.

---

## 6. Componentes

### 6.1 Orçamento de variantes (Hick / Pareto)

Só existe variante usada por pelo menos uma das 5 telas. O padrão é sempre a escolha segura.

| Componente | Variantes permitidas | Proibido |
| :-- | :-- | :-- |
| Botão | `primary`, `secondary`, `ghost`, `destructive` (4) | outline, link, gradient, split, ícone+label combinado |
| Tamanho de botão | `sm 32`, `md 40`, `lg 48` (3) | xs, xl, largura total no desktop |
| Input | `default`, `with-icon`, `with-suffix`, `error`, `disabled` (5) | outlined/filled/underlined misturados, floating label |
| Card | `glass`, `interactive`, `empty`, `alert` (4) | card colorido de marketing, card com sombra pesada |
| Chip de status | `success`, `warning`, `danger`, `neutral`, `info` (5) | cor arbitrária, chip só com ícone |
| Tabela | **uma densidade** (56 px, sem zebra) | compacta/comfortable |
| Toggle | on, off, disabled (3) | switch com label duplicado |
| Segmentado | 2–3 opções | 4+ opções (usar select) |
| Modal | dialog (confirmação) e drawer (nav/detalhe) | sheet, popover-modal, tela cheia |
| Nav | **uma**: pílula de vidro | sidebar + topbar duplicadas |
| Prompt | colapsado (40 px) e expandido | chat lateral permanente |

### 6.2 Matriz de estados

| Componente | Default | Hover | Focus | Active | Selected | Disabled | Loading | Error | Success |
| :-- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Botão | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — | ✓ |
| Input/select/textarea | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | ✓ |
| Toggle/checkbox/radio | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | — |
| Card interativo | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | — |
| Linha de tabela | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | — |
| Chip de status | ✓ | — | — | — | — | — | ✓ | — | — |
| Nav item | ✓ | ✓ | ✓ | ✓ | ✓ | — | — | — | — |
| Prompt/agent card | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | ✓ |

Regra: "loading" mantém a largura e a altura finais (sem layout shift). "Error" mantém o valor digitado. "Success" é temporário (1,2 s) e não substitui a mensagem persistente.

### 6.3 Navegação e cabeçalho

**Pílula de navegação (R1).** 64 px de altura, vidro elevado, raio 9999, blur 24. Marca `MARICHAT` (20/600), 4 itens (13/500), `● @handle` em mono 13, botão de comando 36 px e avatar 32 px. Item ativo: pill `accent.soft` + texto lime + borda 1 px `border.strong`; `aria-current="page"`. Em <1024 px: marca + menu 44 px; drawer com os 4 itens e a conta.

**Cabeçalho de página (R2).** `h1` 40/600, subtítulo 14 `text.tertiary`, ação primária 40 px (alvo 44), prompt-slot colapsado de 40 px à esquerda do CTA quando a tela tem IA. Variações: com voltar (editor), com chip de status, com skeleton de título.

**Prompt-slot.** Pill de 40 px com ícone de brilho lime, rótulo "Pedir uma alteração ao agente" e atalho `Ctrl K`. Expande para um composer de 2–4 linhas com anexo, modelo e botão Enviar. Estados: idle, composing, streaming, disabled. Nunca abre sozinho, nunca rouba foco, `Esc` fecha.

### 6.4 Métricas e cartões

**Metric tile (bento).** Micro label uppercase; valor 36/600 tabular; dica 13 `text.tertiary`; delta com seta + sinal; tile de ícone 32 px em `accent.soft`; sparkline opcional de 48 px. Estados: default, hover (2 px), loading (skeleton do mesmo tamanho), empty (`—` + dica), alert (borda esquerda 3 px warning), selected (borda strong). Um `dl` por tile; delta anunciado com direção.

**Card de automação.** Chip de status + switch; nome 15/600; palavra-chave em mono; publicação; porta de seguidor; host do link; duas métricas; ações "Editar" e switch. Card inteiro não é clicável se houver switch dentro; o título é o link. Estado pausado: superfície mais apagada, chip neutral, sem lime.

**Card de conexão.** Avatar 40 px, `@handle`, chip de status, grid 2×2 de detalhes, ações. Não usar card para cada campo.

**Prévia de DM (R5).** Moldura de 32 px, 380 px de largura, cabeçalho com `@handle` e chip "AO VIVO"; duas bolhas (primeira mensagem e link), botão de quick reply; rodapé "Prévia aproximada. O Instagram pode alterar a aparência." Atualiza com debounce de 300 ms.

### 6.5 Formulários

**Anatomia:** label 13/500 → controle 44 px → ajuda 13 `text.tertiary` → erro 12/500 `text.danger` com ícone. 8 px label-controle, 6 px controle-mensagem, 16 px entre campos.

**Input/textarea/select.** Altura 44 px, raio 12, fundo `bg.sunken`, borda 1 px `border.control`; foco: borda `border.strong` + anel lime 2 px/2 px. Contador de caracteres/bytes dentro do controle, alinhado à direita, em mono 11 `text.muted`; em textarea, no canto inferior direito. Erro: borda danger + `aria-invalid` + mensagem + `aria-describedby`.

**Toggle.** 40×22 dentro de alvo 44×44; thumb 16 px `#0A0A0A`; label clicável; `role="switch"` + `aria-checked`. Loading: spinner de 14 px no lugar do thumb, largura travada. Erro: reverte e mostra mensagem inline.

**Rádio em cards (porta de seguidor).** 5 opções, uma por card; o card inteiro é o alvo; descrição em 13 `text.tertiary`; seleção com borda `border.strong` + `accent.soft` + check. Máximo 7 controles visíveis no grupo; campos condicionais aparecem por divulgação progressiva.

**Segmentado.** 2–3 opções, trilho de vidro, thumb `surface.active`, texto lime no selecionado; semântica de radiogroup; setas.

**Select de publicação.** Busca com miniatura 40×40, nome e tipo; estado vazio "Nenhuma publicação encontrada"; erro de carregamento com "Tentar novamente"; skeleton de 5 linhas.

### 6.6 Feedback

**Chip de status.** Dot 6 px + label 11/600 uppercase (ou 13/500 em tabela), fundo tintado a 12%. `success`, `warning`, `danger`, `neutral`, `info`, `loading`. Texto sempre presente.

**Alerta (R3).** Faixa de vidro com borda esquerda 3 px na cor do estado, ícone em tile 32 px, linha forte, linha secundária e ação inline. `role="status"` para info/warning; `role="alert"` só para erro que exige ação imediata. Máximo 2 empilhados.

**Toast.** Rodapé central, 12 px acima da ilha, 1 por vez, 8 s, ação "Desfazer". `aria-live="polite"`, pausa no hover/foco.

**Empty state.** Ícone 48 px em `accent.soft`, linha 15/600, linha 13 `text.tertiary`, uma ação secundária. Variantes: sem dados, sem resultados (com "Limpar filtros"), erro (com "Tentar novamente"), permissão.

**Ilha de status (R6).** Pill inferior com dot, `@handle` em mono, texto de saúde e ação. Estados: conectado, fila saudável, atenção, erro. Some após 8 s; reabre pelo indicador da nav.

### 6.7 Tabelas

Cabeçalho `bg.sunken` com labels 11 uppercase `text.tertiary`; linhas 56 px; divisores `border.subtle`; hover `surface.hover`; linha inteira clicável quando há detalhe; ações no fim da linha. Cabeçalho sticky após 10 linhas.

Estados: default, hover, selected (borda esquerda lime 2 px + `surface.active`), loading (5 linhas skeleton), empty (empty state, não `tbody` vazio), error (linha de retry), partial (rodapé "Mostrando 10 de 1.284" + "Carregar mais").

A11y: `<caption>` visualmente oculto, `scope="col"`, `aria-sort` em ordenável, linha focável, erros com texto.

### 6.8 Overlays

- **Dialog de confirmação:** até 480 px, título, resumo do efeito, ação destrutiva à direita, cancelar à esquerda com foco inicial. Esc fecha. Foco preso e devolvido.
- **Drawer:** mobile nav e detalhe; 320–380 px, fundo `canvas`, borda esquerda, foco preso, Esc, swipe seguro.
- **Command palette:** 560 px, busca, até 8 ações, atalhos, `aria-activedescendant`, Esc. Ações destrutivas aparecem com cor danger e confirmação separada.

### 6.9 Componentes de domínio

- **Palavra-chave:** input mono com prefixo `#` opcional, helper "Ignora maiúsculas, acentos e pontuação. A palavra precisa aparecer inteira." Prévia de match ao lado.
- **Porta de seguidor:** 5 modos, cards com título + descrição; o modo "Opcional" é o padrão visual; "Travado" mostra aviso âmbar quando selecionado. Campos condicionais: mensagem, botão seguir, botão confirmar.
- **Publicação:** select com miniatura, "Qualquer publicação" no topo; skeleton e erro.
- **Diagnóstico:** lista de checks com ícone success/danger + texto; último teste; botão "Testar conexão"; falha mostra problemas em lista e link de correção.
- **Endpoint de webhook:** bloco mono com URL, botão copiar, campos assinados, token de verificação e link para o painel da Meta/Zernio.
- **Checklist de ambiente:** 6 variáveis, chip ok/faltando, texto "o container não sobe sem esta variável" quando aplicável.

### 6.10 Kokonut UI: adotar, adaptar, rejeitar

Auditoria feita sobre a documentação atual do Kokonut UI (100+ componentes, MIT, instalados via shadcn registry). O Kokonut é **fonte de padrões**, não um pacote de estilo a ser aplicado inteiro.

**Adotar (com adaptação)**

| Padrão Kokonut | Vira | Por que | Restrição |
| :-- | :-- | :-- | :-- |
| `status-island` | Ilha R6 | Status visível, Doherty >10 s | 1 por tela, sem foco automático |
| `action-search-bar` | Command palette `Ctrl K` | Hick: um ponto de entrada | Máx. 8 ações, busca fuzzy, Esc |
| `ai-prompt` | Prompt-slot | Agentic UX contextual | Colapsado, opt-in, sem chat lateral |
| `ai-loading` | Activity-slot | Passos + log em vez de spinner | `aria-live`, sem auto-scroll agressivo |
| `ai-tool-approval` | Approval-slot | Humano no loop | Destrutivo exige hold + teclado |
| `ai-diff-review` | Artifact-slot | Revisão antes de aplicar | Aplicar/Descartar, nunca auto-apply |
| `metric-card` | Metric tile | Um número por tile | Sem count-up >400 ms, sem tilt |
| `uptime-card` | Saúde da conexão | Evidência de 30 dias | Não é gráfico decorativo |
| `undo-button` | Ação reversível | Nielsen #3 | 8 s, pausa no hover |
| `hold-button` / `slide-to-confirm` | Confirmação destrutiva | Prevenção de erro | Só para irreversível; alternativa por teclado |
| `smooth-drawer` | Drawer mobile | Fitts/mobile | Foco preso, Esc |
| `profile-dropdown` | Menu de conta | Consistência | Sem seletor de tema |
| `file-upload` | Upload de mídia | Recuperação de erro | Progresso, retry, cancelar |

**Rejeitar**

| Família | Exemplos | Motivo |
| :-- | :-- | :-- |
| Botões-espetáculo | particle, magnet, pull cord, tear, bell | Hick/Fitts: efeito imprevisível e ruído |
| Cards 3D / física | card-flip, card-stack, throw deck, tilt | Vestibular/motor; não é operação |
| Texto animado | glitch, split-flap, typing, dynamic text | Distração e leitura instável |
| Fundos decorativos | caustics, rain glass, ink, topo, halftone | Performance, contraste e ruído |
| Navegação gestual | marking menu, wheel picker, swipe-only | Descoberta fraca; não funciona no teclado |
| Chat como layout | chat full-screen em toda tela | Hick: a IA é contextual, não o produto |

---

## 7. Formulários e prevenção de erros

1. **Validação no blur**, não a cada tecla. Mensagem específica: o que está errado + como corrigir.
2. **Obrigatório vs opcional explícito.** Campos opcionais levam "(opcional)"; sem asteriscos.
3. **Resumo de erro no topo** quando o submit falha; links para cada campo; foco no resumo e, depois, no primeiro inválido.
4. **Erro inline** no campo, com `aria-describedby` e `aria-invalid`.
5. **Confirmação ao ativar** uma automação: dialog com palavra-chave, publicação, porta de seguidor e prévia da primeira DM. "Salvar" mantém rascunho; "Ativar" confirma.
6. **Desfazer antes de confirmar** para ações reversíveis: pausar automação mostra toast de 8 s com "Desfazer".
7. **Destrutivo** (desconectar conta, excluir automação) é coral, com cancelar como foco inicial; desconectar exige digitar `@handle`; excluir exige o nome da automação.
8. **Saída sempre disponível:** todo dialog/drawer tem Cancelar (Esc) e fechar visível; formulários longos têm "Cancelar" e "Salvar rascunho".
9. **Nunca perder entrada:** rascunho local a cada 5 s, banner "Rascunho restaurado" e aviso em `beforeunload`.
10. **Contadores** em bytes (limites da Meta) e caracteres (títulos de botão) com estado warning a 90% e danger no limite.

---

## 8. Acessibilidade (WCAG 2.2 AA)

**Contraste e cor**

- Todos os textos passam AA no fundo em que aparecem (§5.2). Steel não é texto normal.
- Estado nunca é só cor. Chip = dot + texto; erro = ícone + texto; gráfico = rótulo.
- `forced-colors` e alto contraste: bordas e foco continuam visíveis.

**Teclado e foco**

- Toda ação é alcançável por Tab; overlays prendem o foco e devolvem ao gatilho.
- `Esc` fecha; setas navegam rádio/segmentado/menu; `Enter`/`Espaço` ativam.
- Foco não fica obscurecido por header sticky, toast ou ilha (2.4.11).
- Skip link e landmarks (`nav`, `main`, `aside`).

**Alvos e ponteiro**

- Alvo mínimo 24×24 (2.5.8); primário mobile ≥44×44.
- Nenhuma ação depende de arrastar (2.5.7): todo drag tem alternativa por clique/teclado.
- Espaçamento mínimo entre alvos: 8 px.

**Formulários e autenticação**

- Labels reais (`<label for>`), sem placeholder como label.
- Erros identificados em texto, com sugestão de correção.
- Preenchimento redundante evitado (3.3.7): não pedir duas vezes o mesmo dado.
- Login é Basic Auth do navegador; não criamos autenticação própria (3.3.8).
- Autocomplete adequado (`url`, `text`, `off` quando necessário).

**Leitores de tela**

- Um `h1` por página; hierarquia de headings sem saltos.
- Tabelas com `<caption>` oculto, `scope="col"`, `aria-sort`.
- Fila e conexão em `aria-live="polite"`; erros em `role="alert"` quando urgentes.
- Ícones decorativos `aria-hidden="true"`; ícones com ação têm `aria-label`.

**Zoom, texto e movimento**

- 200% de zoom e 320 px sem scroll horizontal.
- `prefers-reduced-motion`: sem transforms/pulsos; opacidade apenas.
- Texto nunca em contêiner de altura fixa; `line-clamp` só em conteúdo gerado.

---

## 9. Agentic UX

**Princípio:** a IA é uma camada de assistência contextual. Ela não substitui a navegação, não abre sozinha e não muta nada sem aprovação.

### 9.1 Escada de autonomia

| Nível | O que a IA faz | Padrão |
| :-- | :-- | :-- |
| 1. Observar | Resume estado, aponta anomalias | Sempre permitido |
| 2. Sugerir | Propõe texto, diagnóstico ou ação | **Padrão** |
| 3. Rascunhar | Preenche um artefato editável | Requer clique |
| 4. Aprovar | Mostra diff e pede aprovação | Requer confirmação |
| 5. Executar | Aplica uma mutação | Só após aprovação explícita |

### 9.2 Slots

| Slot | Onde | Comportamento | Estados |
| :-- | :-- | :-- | :-- |
| `prompt-slot` | Fim do R2 ou topo do R5 | Pill de 40 px → composer | idle, composing, streaming, disabled |
| `activity-slot` | Topo do R4 (faixa fina) | Passos do agente, cada um expansível | running, done, failed |
| `approval-slot` | Acima do CTA primário | Aprovar/Recusar com resumo e diff | pending, approved, rejected, timeout |
| `artifact-slot` | Topo do R4 | Card gerado com proveniência e Aplicar/Descartar | draft, applied, discarded, error |
| `context-slot` | R3 | Chips do que a IA sabe (conta, automação, período) | collapsed, expanded |

Regras: slots são **opt-in** (nunca mostrar chrome vazio), colapsam em <1024 px, não roubam foco, toda ação é reversível, e o conteúdo gerado sempre tem proveniência ("Gerado · 24/10 14:32" + fonte).

### 9.3 Latência (Doherty)

| Faixa | Resposta |
| :-- | :-- |
| 0–100 ms | Atualização otimista, sem spinner |
| 100–400 ms | Skeleton com o layout final (mesmo tamanho) |
| 400 ms–10 s | Skeleton + rótulo do passo ("Analisando falhas…") + botão Parar |
| >10 s | Job em background + ilha de status + notificação |
| Falha | Erro inline no bloco afetado + "Tentar novamente"; preservar o rascunho |

### 9.4 Conteúdo gerado e confiança

- Toda sugestão mostra o que será alterado e o diff antes de aplicar.
- Nada é aplicado automaticamente; "Aplicar" é primário, "Descartar" é secundário.
- Números e afirmações geradas carregam fonte e horário.
- A IA não recebe tokens, segredos, URLs assinadas ou dados de terceiros; o contexto é o mínimo necessário.
- Se a IA falhar, a tela continua utilizável manualmente.

---

## 10. Especificação das 5 telas

### 10.1 Visão geral (`/admin`)

**Objetivo:** responder "o fluxo está saudável?" e "o que exige ação agora?".

- **R2:** `h1` "Visão geral"; subtítulo "Comentário com a palavra-chave → DM pedindo resposta → link."; CTA "Nova automação"; prompt-slot colapsado "Pedir uma alteração ao agente" + `Ctrl K`.
- **R3:** no máximo 2 sinais. Exemplo: "2 DMs falharam e serão tentadas de novo" com "Revisar"; token expirando em ≤10 dias.
- **R4:**
  - 4 metric tiles: **Automações ativas** 12 (14 no total); **Aguardando resposta** 38 (DM 1 aceita, link ainda não enviado); **Links enviados** 1.284 (últimos 30 dias); **Precisam de atenção** 3 (falhas, incertezas ou expirações) em estado alert.
  - Painel **Conta conectada**: avatar, `@marichat.studio`, chip "Conectada", token expira 24/11 14:32, "Gerenciar".
  - Painel **Operação**: 4 mensagens na fila; última tarefa 24/10 14:32; último webhook 14:31; nota "Aceita significa que a Meta recebeu a solicitação. Não há confirmação de entrega nem de leitura."
  - Faixa fina **Atividade do agente** (opcional): "Lendo eventos" (done), "Analisando falhas" (running), "Aguardando aprovação" (pending) + "Revisar".
  - Tabela **Últimos comentários atendidos**: 5 linhas; colunas Quando, Automação, Quem comentou, Situação; rodapé "Mostrando 5 de 1.284" + "Ver todas".
- **R6:** ilha "● @marichat.studio · Conectado há 2 h · Fila saudável".
- **Estados:** sem conta (empty com CTA "Conectar Instagram"); webhook/token com erro (R3 danger + link Conexão); carregando (skeletons dos tiles e tabela, sem shift); parcial (tabela com "Carregar mais").
- **A11y:** um `h1`; métricas em `dl`; status com texto; tabela com `caption` e `scope`; ilha em `aria-live`.

### 10.2 Automações (`/admin/automacoes`)

**Objetivo:** encontrar a automação certa e agir sem abrir uma por uma.

- **R2:** `h1` "Automações"; subtítulo "Cada automação escuta uma palavra-chave e responde com uma DM."; CTA "Nova automação".
- **R3:** alerta "Conecte uma conta do Instagram antes de criar automações" quando não houver conta.
- **R4:**
  - Toolbar: busca "Buscar por nome ou palavra-chave" (ícone, atalho `/`); segmented "Todas 14 · Ativas 12 · Pausadas 2" (3 opções).
  - Grid de 2 colunas, 6 cards + 1 card tracejado "Nova automação". Cada card: chip `ATIVA`/`PAUSADA` + switch; nome 15/600; palavra-chave mono; publicação com miniatura 40 px; porta de seguidor; host do link; "1.284 links enviados · 98,2% de aceite"; ação "Editar".
  - Rodapé "Mostrando 6 de 14" + "Carregar mais".
- **Estados:** vazio (ícone, "Nenhuma automação ainda", CTA), sem resultados ("Limpar filtros"), pausando (switch com loading e toast "Automação pausada · Desfazer"), erro de carregamento (bloco com retry).
- **A11y:** busca com label visível ou `aria-label`; segmented com radiogroup; switch com `aria-checked`; cards com título-link; foco visível.

### 10.3 Editor de automação (`/admin/automacoes/nova` e `/[id]`)

**Objetivo:** editar com prévia fiel e sem perder texto.

- **R2:** voltar "Automações"; `h1` "Guia do ebook"; chip "ATIVA"; CTA "Salvar automação"; secundário "Cancelar"; prompt-slot "Sugerir texto" (opcional).
- **R4 (8 col):** 5 grupos, cada um em card com título e helper:
  1. **Identificação:** nome; palavra-chave com helper de normalização; toggle "Ativa (responde a novos comentários)".
  2. **Publicação:** select "Qualquer publicação" com busca e miniaturas; helper "Vale para comentários novos; editar não altera conversas em andamento."
  3. **Primeira mensagem:** textarea; contador "155/1.000 bytes"; helper "Texto puro; peça uma resposta para abrir a janela de 24 h."
  4. **Porta de seguidor:** 5 cards (Sem porta, Tolerante, Travado, Opcional, Direto); "Opcional" selecionado; campos condicionais "Mensagem do convite" e "Botão para seguir"; aviso âmbar quando Travado está selecionado. O grupo tem no máximo 7 controles: 5 cards + mensagem + botão.
  5. **Segunda mensagem:** texto; texto do botão; URL https com **erro inline de exemplo** ("Use um endereço https:// válido.") e anel de foco visível.
  - Barra de ações: "Rascunho salvo automaticamente" à esquerda; "Salvar automação" primário; "Cancelar" ghost. No mobile, barra inferior fixa.
- **R5:** prévia de DM em moldura de 380 px, cabeçalho `@marichat.studio` + "AO VIVO"; bolha 1 com quick reply "Quero o link"; bolha 2 com botão "Abrir o guia" e o host do campo URL; nota de aproximação.
- **Estados:** novo (campos vazios, CTA "Criar automação"), edição (preenchido), salvando (botão loading, largura travada), salvo (toast "Automação salva · Desfazer"), erro de submit (resumo no topo + inline), rascunho restaurado (banner).
- **A11y:** labels reais; contador ligado por `aria-describedby`; erro com `aria-invalid`; prévia `aria-hidden` ou com resumo textual; foco no resumo de erro.

### 10.4 Atividade (`/admin/atividade`)

**Objetivo:** diagnosticar o primeiro teste em produção sem abrir o banco.

- **R2:** `h1` "Atividade"; subtítulo "Últimos 20 registros de interações, envios e webhooks."; secundário "Atualizar" com ícone.
- **R3:** tarefa agendada parada há >10 min; erro de inscrição de webhook; sem conta.
- **R4:**
  - 4 stats: última tarefa agendada 14:32; último dreno 14:32; resultado do dreno "3 enviados · 1 falhou"; último envio aceito 14:31.
  - Segmented "Tudo · Com problema" (2).
  - **Interações** (tabela 5 linhas): Quando, Automação, Comentário, Situação, Checagens, Resposta, Link; um chip `FALHOU` coral com código de erro; um `INCERTA` âmbar.
  - **Envios e tarefas** (4 linhas): Atualizado, Tipo, Quem, Situação, Tentativas 2/3, Próxima, Erro.
  - **Webhooks** (4 linhas): Quando, Evento, Campo, Situação, Erro.
  - Cada tabela tem rodapé "Mostrando N de 20" + "Carregar mais" (5 linhas em Interações; 4 nas demais); vazio próprio.
- **R6:** ilha "Fila saudável · 4 na fila · último tick 14:32".
- **Estados:** vazio por seção; erro de carregamento com retry; linha de erro com detalhe expansível; parcial.
- **A11y:** tabelas com caption; status text+dot; erro não só vermelho; `aria-live` na ilha.

### 10.5 Conexão (`/admin/conexao`)

**Objetivo:** conectar, testar e corrigir a integração.

- **R2:** `h1` "Conexão com o Instagram"; subtítulo "A conexão usa o login oficial da Meta. O MARICHAT nunca vê sua senha."; chip "Transporte ativo: Meta (direto)"; CTA "Testar conexão".
- **R3:** erro de webhook (âmbar) com "Reassinar webhooks"; falha de token (danger) com "Reconectar".
- **R4:**
  - **Conta atual:** avatar 40 px, `@marichat.studio`, chip "Conectada", grid com ID, status, token expira 24/11 14:32 (24 dias), webhook inscrito em 24/10 14:32; ações "Reconectar / trocar de conta", "Reassinar webhooks" e "Desconectar" (destrutivo, confirma digitando `@handle`).
  - **Diagnóstico:** dois checks com ícone success — "Token aceito — @marichat.studio" e "Webhooks: comments, messages, messaging_postbacks"; último teste 14:32; faixa "Tudo certo: token válido e webhooks completos."
  - **Configuração do webhook:** URL `https://app.marichat.com.br/api/webhook` em bloco mono com "Copiar"; campos `comments`, `messages`, `messaging_postbacks`; token de verificação `META_WEBHOOK_VERIFY_TOKEN`; link "Abrir painel da Meta".
  - **Checklist de ambiente:** 8 linhas (APP_URL, DATABASE_URL, ADMIN_PASSWORD, INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, META_WEBHOOK_VERIFY_TOKEN, TOKEN_ENCRYPTION_KEY, CRON_SECRET) com chip "OK"; CRON_SECRET ausente em warning, com ação "Configurar".
  - **Últimos webhooks:** 4 linhas, com "Ver todos" no cabeçalho; sem rodapé de paginação.
- **R5:** nenhum; a própria página é o diagnóstico. (Opcional: checklist de primeiros passos em rail.)
- **R6:** ilha "● @marichat.studio · Token válido por 24 dias".
- **Estados:** sem conta (card vazio com "Conectar Instagram" primário e "Conectar Zernio" secundário, passos 1-2-3); conectando (loading); erro (R3 + retry); recém-conectado (banner success).
- **A11y:** ações destrutivas com confirmação; copiar com feedback `aria-live`; endpoints em mono com quebra; checklist com status textual.

---

## 11. Governança

### 11.1 Definição de "componente pronto"

- [ ] Usa apenas tokens da §5; nenhum hex ou espaçamento arbitrário.
- [ ] Entrega os estados da §6.2 aplicáveis.
- [ ] Tem anatomia documentada (label, ajuda, erro, contador).
- [ ] Passa teclado, foco visível e leitor de tela.
- [ ] Tem teste de contraste no fundo real.
- [ ] Tem estado vazio/loading/erro quando busca dados.
- [ ] Respeita `prefers-reduced-motion`.
- [ ] Está mapeado para um componente Kokonut/shadcn ou implementação própria justificada.

### 11.2 Gate de tela

- [ ] Cabe nas 6 regiões; nav com 4 itens.
- [ ] Uma ação primária; ações destrutivas com confirmação.
- [ ] Contraste AA; foco visível; alvos ≥24×24 (44×44 no mobile).
- [ ] 200% de zoom e 320 px sem scroll horizontal.
- [ ] Empty, loading (≤400 ms) e error existem.
- [ ] Copy pt-BR, sem emoji/exclamação.
- [ ] Nenhum dado inventado sem fonte; "aceita ≠ entregue" onde couber.
- [ ] Nenhuma mutação por IA sem aprovação.
- [ ] Passa por leitor de tela (nome, papel, estado, erro).

### 11.3 Regras para geração no Stitch

- Com design system vinculado, **não repetir hex, fontes, paletas ou raios** no prompt; o projeto governa o estilo.
- Sempre declarar: desktop 1440 px, dark operational dashboard, 4 itens de nav, 6 regiões, 24 px de gutter.
- Sempre pedir: foco visível, erro inline, skeleton, empty state, alvos de 44 px, status com dot + texto.
- Sempre limitar: 5–7 cards/linhas visíveis; no máximo 2 alertas; uma ação primária.
- Nunca pedir: hero de marketing, ilustração, emoji, 3D, partículas, carrossel automático, chat lateral permanente, mais de um acento, sidebar + topbar.
- Copy sempre em pt-BR; dados de exemplo realistas (`@marichat.studio`, `#quero-o-guia`, `1.284`, `98,2%`, `24/10 14:32`).

### 11.4 Entregáveis Stitch

As 5 telas finais vivem no projeto Stitch `17812874480478287594`. Estes são os IDs canônicos; gerações anteriores no mesmo projeto são rascunhos e não devem ser usadas como referência.

| Tela | Rota | Screen ID | Canvas |
| :-- | :-- | :-- | :-- |
| Visão geral | `/admin` | `2f66609ff93949bb87ed998accea5482` | https://stitch.google.com/projects/17812874480478287594?node-id=2f66609ff93949bb87ed998accea5482 |
| Automações | `/admin/automacoes` | `48898a6f1ad54789b45dba6408a6442a` | https://stitch.google.com/projects/17812874480478287594?node-id=48898a6f1ad54789b45dba6408a6442a |
| Editor | `/admin/automacoes/nova` e `/admin/automacoes/[id]` | `cca8193216204f298cd26eeaf1f9bd92` | https://stitch.google.com/projects/17812874480478287594?node-id=cca8193216204f298cd26eeaf1f9bd92 |
| Atividade | `/admin/atividade` | `b8261db7f28d4ac3858595cb00da9c71` | https://stitch.google.com/projects/17812874480478287594?node-id=b8261db7f28d4ac3858595cb00da9c71 |
| Conexão | `/admin/conexao` | `bc61d6be266b45b09fdc929e79f4c7de` | https://stitch.google.com/projects/17812874480478287594?node-id=bc61d6be266b45b09fdc929e79f4c7de |

### 11.5 Implementação (Kokonut + shadcn/ui)

- **Stack:** Next.js App Router, Tailwind v4, shadcn/ui, Kokonut UI via registry, `motion/react` apenas nos componentes aprovados, `lucide-react`.
- **Estrutura sugerida:** `src/components/ui/*` (shadcn), `src/components/kokonut/*` (código copiado e adaptado), `src/components/marichat/*` (domínio), `src/styles/tokens.css` (variáveis semânticas).
- **Tema:** classe `dark` fixa no `<html>`; um único conjunto de variáveis; sem `prefers-color-scheme` invertendo o produto.
- **Fontes:** Inter e JetBrains Mono via `next/font`, com `display: swap`.
- **Kokonut:** instalar só os 12 padrões adotados; cada um passa pelo gate de componente antes de entrar. O código é nosso; não atualizar cegamente.
- **Testes:** `axe` nas 5 rotas, varredura de teclado, contraste automatizado dos tokens, snapshot visual em 1440/1024/390/320.
- **Não instalar:** componentes decorativos da lista de rejeição; se um padrão novo for necessário, ele entra com justificativa e teste.

---

## 12. Resumo executivo

MARICHAT v3 é um painel operacional escuro, de vidro contido, um acento lime e dados em mono. A interface usa **4 itens de navegação**, **5 telas**, **6 regiões** e **um inventário fechado de componentes**. As leis de Miller, Hick, Fitts, Jakob, região comum e proximidade estão traduzidas em números testáveis. A acessibilidade é medida, não presumida: nenhum texto normal abaixo de 4,5:1, foco sempre visível, alvos de 44 px, teclado completo. A camada de IA é contextual e reversível: sugere, mostra proveniência, pede aprovação e nunca aplica sozinha. O Kokonut entra pelo que ele tem de melhor — ilha de status, command palette, prompt, aprovação, diff, métricas e undo — e fica de fora pelo que ele tem de excessivo — partículas, 3D, texto animado e fundos decorativos.

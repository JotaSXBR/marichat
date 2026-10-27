# Kokonut UI (OSS): catálogo e regras de uso

Levantamento feito em 2026-10-27 a partir do sitemap oficial
(<https://kokonutui.com/sitemap.xml>) e da documentação de instalação
(<https://kokonutui.com/docs>). Cobre **somente a versão open source**; os
componentes Pro (<https://kokonutui.com/docs/pro>) não estão incluídos e não
devem ser usados.

Total de componentes OSS catalogados: **112**.

## Como o Kokonut se instala

O Kokonut é um **registry do shadcn CLI**, não um pacote npm. Ele escreve o
código em `components/kokonutui/` e instala as dependências do componente
(`motion`, `lucide-react`, primitivas do shadcn/ui).

```bash
# 1. shadcn/ui no projeto (gera components.json) — só uma vez
npx shadcn@latest init

# 2. utilitário cn usado por todos os componentes
npx shadcn@latest add https://kokonutui.com/r/utils.json

# 3. namespace no components.json
#    "registries": { "@kokonutui": "https://kokonutui.com/r/{name}.json" }

# 4. componente por nome
npx shadcn@latest add @kokonutui/status-island
```

Consequências práticas para o MARICHAT:

1. **A base é shadcn/ui.** Onde o Kokonut não tem componente (tabela, campo de
   formulário, diálogo, alerta, toast, badge, abas com foco preso), vale o que o
   próprio Kokonut recomenda: a primitiva do shadcn/ui.
2. **O código passa a ser nosso.** O registry entrega uma cópia; atualizar o
   Kokonut não atualiza o projeto. A cópia entra em `src/components/kokonut/`
   e é adaptada aos tokens do `DESIGN.md`.
3. **Nada de estilo cru.** Os componentes vêm com `zinc`, `emerald`,
   `orange`, `white/12` e texto em inglês fixos no arquivo. Cada um passa pela
   adaptação: tokens de cor, cópia em pt-BR, orçamento de movimento e revisão de
   acessibilidade.

## O que o Kokonut não tem (usar shadcn/ui)

| Necessidade | Componente | Origem |
| :-- | :-- | :-- |
| Tabela de dados, densidade única | `table` | shadcn/ui |
| Campos de formulário (texto, área, select, label, ajuda, erro) | `input`, `textarea`, `select`, `label` | shadcn/ui |
| Diálogo de confirmação, alerta, toast | `alert-dialog`, `alert`, `sonner` | shadcn/ui |
| Badge/chip de status | `badge` adaptado | shadcn/ui |
| Abas/segmentado com teclado | `tabs` / `radio-group` | shadcn/ui |
| Tooltip, popover, menu de contexto | `tooltip`, `popover`, `dropdown-menu` | shadcn/ui |
| Skeleton | `skeleton` | shadcn/ui |
| Avatar com fallback | `avatar` | shadcn/ui |
| Ícones | `lucide-react` | já é dependência do Kokonut |

## Catálogo OSS completo

### Navegação (10)

- [Action Search Bar](https://kokonutui.com/docs/navigation/action-search-bar) — `@kokonutui/action-search-bar`
- [Marking Menu](https://kokonutui.com/docs/navigation/marking-menu) — `@kokonutui/marking-menu`
- [Morphic Navbar](https://kokonutui.com/docs/navigation/morphic-navbar) — `@kokonutui/morphic-navbar`
- [Profile Dropdown](https://kokonutui.com/docs/navigation/profile-dropdown) — `@kokonutui/profile-dropdown`
- [Scroll Index](https://kokonutui.com/docs/navigation/scroll-index) — `@kokonutui/scroll-index`
- [Smooth Drawer](https://kokonutui.com/docs/navigation/smooth-drawer) — `@kokonutui/smooth-drawer`
- [Smooth Tab](https://kokonutui.com/docs/navigation/smooth-tab) — `@kokonutui/smooth-tab`
- [Stack Panel](https://kokonutui.com/docs/navigation/stack-panel) — `@kokonutui/stack-panel`
- [Status Island](https://kokonutui.com/docs/navigation/status-island) — `@kokonutui/status-island`
- [Toolbar](https://kokonutui.com/docs/navigation/toolbar) — `@kokonutui/toolbar`

### Cards (18)

- [Activity Terrain](https://kokonutui.com/docs/cards/activity-terrain) — `@kokonutui/activity-terrain`
- [Apple Activity Card](https://kokonutui.com/docs/cards/apple-activity-card) — `@kokonutui/apple-activity-card`
- [Bento Grid](https://kokonutui.com/docs/cards/bento-grid) — `@kokonutui/bento-grid`
- [Boarding Pass](https://kokonutui.com/docs/cards/boarding-pass) — `@kokonutui/boarding-pass`
- [Card Flip](https://kokonutui.com/docs/cards/card-flip) — `@kokonutui/card-flip`
- [Card Stack](https://kokonutui.com/docs/cards/card-stack) — `@kokonutui/card-stack`
- [Carousel Cards](https://kokonutui.com/docs/cards/carousel-cards) — `@kokonutui/carousel-cards`
- [Currency Transfer](https://kokonutui.com/docs/cards/currency-transfer) — `@kokonutui/currency-transfer`
- [Lightbox Grid](https://kokonutui.com/docs/cards/lightbox-grid) — `@kokonutui/lightbox-grid`
- [Liquid Gauge](https://kokonutui.com/docs/cards/liquid-gauge) — `@kokonutui/liquid-gauge`
- [Liquid Glass Card](https://kokonutui.com/docs/cards/liquid-glass-card) — `@kokonutui/liquid-glass-card`
- [Metric Card](https://kokonutui.com/docs/cards/metric-card) — `@kokonutui/metric-card`
- [Notification Stack](https://kokonutui.com/docs/cards/notification-stack) — `@kokonutui/notification-stack`
- [Onboarding Checklist](https://kokonutui.com/docs/cards/onboarding-checklist) — `@kokonutui/onboarding-checklist`
- [Page Flip](https://kokonutui.com/docs/cards/page-flip) — `@kokonutui/page-flip`
- [Receipt Printer](https://kokonutui.com/docs/cards/receipt-printer) — `@kokonutui/receipt-printer`
- [Spending Ring](https://kokonutui.com/docs/cards/spending-ring) — `@kokonutui/spending-ring`
- [Uptime Card](https://kokonutui.com/docs/cards/uptime-card) — `@kokonutui/uptime-card`

### Botões (17)

- [Attract Button](https://kokonutui.com/docs/buttons/attract-button) — `@kokonutui/attract-button`
- [Bell Button](https://kokonutui.com/docs/buttons/bell-button) — `@kokonutui/bell-button`
- [Cart Button](https://kokonutui.com/docs/buttons/cart-button) — `@kokonutui/cart-button`
- [Command Button](https://kokonutui.com/docs/buttons/command-button) — `@kokonutui/command-button`
- [Gradient Button](https://kokonutui.com/docs/buttons/gradient-button) — `@kokonutui/gradient-button`
- [Hold Button](https://kokonutui.com/docs/buttons/hold-button) — `@kokonutui/hold-button`
- [Morph Popover](https://kokonutui.com/docs/buttons/morph-popover) — `@kokonutui/morph-popover`
- [Particle Button](https://kokonutui.com/docs/buttons/particle-button) — `@kokonutui/particle-button`
- [Pay Button](https://kokonutui.com/docs/buttons/pay-button) — `@kokonutui/pay-button`
- [Pull Cord](https://kokonutui.com/docs/buttons/pull-cord) — `@kokonutui/pull-cord`
- [Save Button](https://kokonutui.com/docs/buttons/save-button) — `@kokonutui/save-button`
- [Slide Text Button](https://kokonutui.com/docs/buttons/slide-text-button) — `@kokonutui/slide-text-button`
- [Slide To Confirm](https://kokonutui.com/docs/buttons/slide-to-confirm) — `@kokonutui/slide-to-confirm`
- [Switch Button](https://kokonutui.com/docs/buttons/switch-button) — `@kokonutui/switch-button`
- [Tear Button](https://kokonutui.com/docs/buttons/tear-button) — `@kokonutui/tear-button`
- [Undo Button](https://kokonutui.com/docs/buttons/undo-button) — `@kokonutui/undo-button`
- [V0 Button](https://kokonutui.com/docs/buttons/v0-button) — `@kokonutui/v0-button`

### Inputs (18)

- [Amount Pad](https://kokonutui.com/docs/inputs/amount-pad) — `@kokonutui/amount-pad`
- [Avatar Picker](https://kokonutui.com/docs/inputs/avatar-picker) — `@kokonutui/avatar-picker`
- [Card Field](https://kokonutui.com/docs/inputs/card-field) — `@kokonutui/card-field`
- [Detent Dial](https://kokonutui.com/docs/inputs/detent-dial) — `@kokonutui/detent-dial`
- [File Upload](https://kokonutui.com/docs/inputs/file-upload) — `@kokonutui/file-upload`
- [Liquid Slider](https://kokonutui.com/docs/inputs/liquid-slider) — `@kokonutui/liquid-slider`
- [Loader](https://kokonutui.com/docs/inputs/loader) — `@kokonutui/loader`
- [Location Picker](https://kokonutui.com/docs/inputs/location-picker) — `@kokonutui/location-picker`
- [Price Range](https://kokonutui.com/docs/inputs/price-range) — `@kokonutui/price-range`
- [Seat Map](https://kokonutui.com/docs/inputs/seat-map) — `@kokonutui/seat-map`
- [Signature Pad](https://kokonutui.com/docs/inputs/signature-pad) — `@kokonutui/signature-pad`
- [Slot Picker](https://kokonutui.com/docs/inputs/slot-picker) — `@kokonutui/slot-picker`
- [Stay Picker](https://kokonutui.com/docs/inputs/stay-picker) — `@kokonutui/stay-picker`
- [Swatch Fan](https://kokonutui.com/docs/inputs/swatch-fan) — `@kokonutui/swatch-fan`
- [Team Selector](https://kokonutui.com/docs/inputs/team-selector) — `@kokonutui/team-selector`
- [Timezone Planner](https://kokonutui.com/docs/inputs/timezone-planner) — `@kokonutui/timezone-planner`
- [Tip Selector](https://kokonutui.com/docs/inputs/tip-selector) — `@kokonutui/tip-selector`
- [Wheel Picker](https://kokonutui.com/docs/inputs/wheel-picker) — `@kokonutui/wheel-picker`

### IA e agentes (20)

- [Ai Agent Lanes](https://kokonutui.com/docs/ai/ai-agent-lanes) — `@kokonutui/ai-agent-lanes`
- [Ai Autocomplete](https://kokonutui.com/docs/ai/ai-autocomplete) — `@kokonutui/ai-autocomplete`
- [Ai Branches](https://kokonutui.com/docs/ai/ai-branches) — `@kokonutui/ai-branches`
- [Ai Citations](https://kokonutui.com/docs/ai/ai-citations) — `@kokonutui/ai-citations`
- [Ai Context Meter](https://kokonutui.com/docs/ai/ai-context-meter) — `@kokonutui/ai-context-meter`
- [Ai Diff Review](https://kokonutui.com/docs/ai/ai-diff-review) — `@kokonutui/ai-diff-review`
- [Ai Inline Edit](https://kokonutui.com/docs/ai/ai-inline-edit) — `@kokonutui/ai-inline-edit`
- [Ai Input Search](https://kokonutui.com/docs/ai/ai-input-search) — `@kokonutui/ai-input-search`
- [Ai Loading](https://kokonutui.com/docs/ai/ai-loading) — `@kokonutui/ai-loading`
- [Ai Memory](https://kokonutui.com/docs/ai/ai-memory) — `@kokonutui/ai-memory`
- [Ai Message Queue](https://kokonutui.com/docs/ai/ai-message-queue) — `@kokonutui/ai-message-queue`
- [Ai Model Selector](https://kokonutui.com/docs/ai/ai-model-selector) — `@kokonutui/ai-model-selector`
- [Ai Prompt](https://kokonutui.com/docs/ai/ai-prompt) — `@kokonutui/ai-prompt`
- [Ai Redact](https://kokonutui.com/docs/ai/ai-redact) — `@kokonutui/ai-redact`
- [Ai Text Loading](https://kokonutui.com/docs/ai/ai-text-loading) — `@kokonutui/ai-text-loading`
- [Ai Token Alternatives](https://kokonutui.com/docs/ai/ai-token-alternatives) — `@kokonutui/ai-token-alternatives`
- [Ai Tool Approval](https://kokonutui.com/docs/ai/ai-tool-approval) — `@kokonutui/ai-tool-approval`
- [Ai Voice](https://kokonutui.com/docs/ai/ai-voice) — `@kokonutui/ai-voice`
- [Image Generation Card](https://kokonutui.com/docs/ai/image-generation-card) — `@kokonutui/image-generation-card`
- [Slash Command Menu](https://kokonutui.com/docs/ai/slash-command-menu) — `@kokonutui/slash-command-menu`

### Mídia (6)

- [Audio Player Card](https://kokonutui.com/docs/media/audio-player-card) — `@kokonutui/audio-player-card`
- [Clip Trimmer](https://kokonutui.com/docs/media/clip-trimmer) — `@kokonutui/clip-trimmer`
- [Contact Sheet](https://kokonutui.com/docs/media/contact-sheet) — `@kokonutui/contact-sheet`
- [Focal Point Picker](https://kokonutui.com/docs/media/focal-point-picker) — `@kokonutui/focal-point-picker`
- [Photo Straighten](https://kokonutui.com/docs/media/photo-straighten) — `@kokonutui/photo-straighten`
- [Synced Transcript](https://kokonutui.com/docs/media/synced-transcript) — `@kokonutui/synced-transcript`

### Texto (11)

- [Cradle Text](https://kokonutui.com/docs/texts/cradle-text) — `@kokonutui/cradle-text`
- [Dynamic Text](https://kokonutui.com/docs/texts/dynamic-text) — `@kokonutui/dynamic-text`
- [Glitch Text](https://kokonutui.com/docs/texts/glitch-text) — `@kokonutui/glitch-text`
- [Kinetic Type Hero](https://kokonutui.com/docs/texts/kinetic-type-hero) — `@kokonutui/kinetic-type-hero`
- [Marker Text](https://kokonutui.com/docs/texts/marker-text) — `@kokonutui/marker-text`
- [Plucked Text](https://kokonutui.com/docs/texts/plucked-text) — `@kokonutui/plucked-text`
- [Shadow Text](https://kokonutui.com/docs/texts/shadow-text) — `@kokonutui/shadow-text`
- [Split Flap Text](https://kokonutui.com/docs/texts/split-flap-text) — `@kokonutui/split-flap-text`
- [Spoiler Text](https://kokonutui.com/docs/texts/spoiler-text) — `@kokonutui/spoiler-text`
- [Swoosh Text](https://kokonutui.com/docs/texts/swoosh-text) — `@kokonutui/swoosh-text`
- [Type Writer](https://kokonutui.com/docs/texts/type-writer) — `@kokonutui/type-writer`

### Fundos (12)

- [Background Paths](https://kokonutui.com/docs/backgrounds/background-paths) — `@kokonutui/background-paths`
- [Caustics Background](https://kokonutui.com/docs/backgrounds/caustics-background) — `@kokonutui/caustics-background`
- [Dither Reveal Hero](https://kokonutui.com/docs/backgrounds/dither-reveal-hero) — `@kokonutui/dither-reveal-hero`
- [Dot Field](https://kokonutui.com/docs/backgrounds/dot-field) — `@kokonutui/dot-field`
- [Drape Background](https://kokonutui.com/docs/backgrounds/drape-background) — `@kokonutui/drape-background`
- [Flow Field](https://kokonutui.com/docs/backgrounds/flow-field) — `@kokonutui/flow-field`
- [Halftone Background](https://kokonutui.com/docs/backgrounds/halftone-background) — `@kokonutui/halftone-background`
- [Ink Background](https://kokonutui.com/docs/backgrounds/ink-background) — `@kokonutui/ink-background`
- [Rain Glass Background](https://kokonutui.com/docs/backgrounds/rain-glass-background) — `@kokonutui/rain-glass-background`
- [Rhythm Hero](https://kokonutui.com/docs/backgrounds/rhythm-hero) — `@kokonutui/rhythm-hero`
- [Shape Hero](https://kokonutui.com/docs/backgrounds/shape-hero) — `@kokonutui/shape-hero`
- [Topo Background](https://kokonutui.com/docs/backgrounds/topo-background) — `@kokonutui/topo-background`

## Componentes avaliados e descartados

| Componente | Por que ficou de fora |
| :-- | :-- |
| `smooth-drawer` | é um sheet de checkout (itens, velocidade de entrega, total). O menu mobile do painel é navegação simples, feita com `drawer` (vaul) do shadcn. |
| `profile-dropdown` | assume troca de tema (claro/escuro/sistema) e multi-conta com cartão e cobrança. O MARICHAT é escuro fixo e tem uma conta só; o menu de conta usa `dropdown-menu` do shadcn. |

Os dois arquivos foram apagados de `src/components/kokonutui/` para não ficarem
como código morto.

## Componentes fora do catálogo

O sitemap inclui `/docs/pro`, `/docs/templates` e `/docs/agents`, que não são
componentes e ficam de fora. Também não entram `utils`, que é apenas o `cn`.

## Regras de adaptação (resumo)

1. Cor: nenhum `zinc-*`, `emerald-*`, `orange-*` ou `white/12` sobrevive. O
   componente usa os tokens do `DESIGN.md` (superfícies, bordas, texto, acento
   único e estados).
2. Cópia: todo texto visível em pt-BR; nenhum placeholder de demonstração
   (nomes de pessoas, valores em dólar, "Upload photos").
3. Movimento: só o que o `DESIGN.md` permite; nada de partículas, tilt, 3D,
   texto animado ou scroll-jacking. `prefers-reduced-motion` sempre respeitado.
4. Acessibilidade: foco visível, `Esc` devolvendo foco, `aria-live` onde há
   atualização assíncrona, alvos de 44 px no mobile.
5. Dados: nenhum componente recebe dado inventado; sem dado, estado vazio com
   uma ação.

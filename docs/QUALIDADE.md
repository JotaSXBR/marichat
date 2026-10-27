# Qualidade de código: pesquisa, regras e revisão do MARICHAT

Revisão feita em 2026-10-26, seguindo a regra do `AGENTS.md` de pesquisar
referências antes de propor mudanças.

## Resumo

O projeto está em boa forma para o tamanho: **7.214 linhas** em `src` (47
arquivos), **2.250 linhas** em `tests` (13 arquivos), `strict` ligado no
TypeScript, zero `any` explícito e zero asserções `!` no código de produção.
Os testes cobrem o motor, o webhook, a fila, as rotas, o cliente da Meta e o
tradutor da Zernio.

O lint com tipos foi **aplicado na Fase 1**, os orçamentos de tamanho,
complexidade e duplicação na **Fase 2**, a verificação automática na **Fase 3**
e a formatação na **Fase 4** (ver plano no fim). O que resta é a refatoração
guiada dos arquivos grandes.

| Métrica | Hoje | Limite sugerido |
| --- | --- | --- |
| Regras efetivas no lint | 113 + preset tipado + SonarJS | ~150, com tipos |
| Arquivos `src` acima de 400 linhas | 3 (inclui `scripts`) | 0 (avisos) |
| Funções acima de 60 linhas | 16 | 0 (avisos) |
| Funções com complexidade > 12 | 15 | 0 (avisos) |
| Avisos de orçamento no lint | 42 (baseline do CI) | 0 |
| Erros de lint | 0 | 0 |
| Formatação | Prettier verificado no CI | manter |
| CI / GitHub Actions | lint + tipos + testes + build | manter |

## O que já está bom

- `strict: true` no TypeScript e `noEmit` no `typecheck`.
- `eslint-config-next` nos presets `core-web-vitals` e `typescript`.
- Nenhum `any` explícito, nenhum `@ts-ignore`/`@ts-expect-error`.
- Nenhuma asserção `!` em `src` (as 57 existentes estão só em testes).
- Erros de domínio (`InstagramApiError`, `ZernioApiError`) em vez de strings
  soltas no caminho crítico.
- Comentários explicam decisões (prazos, modo travado, idempotência), não o
  óbvio.
- `npm audit --omit=dev`: 0 vulnerabilidades conhecidas.

## Referências consultadas

- typescript-eslint — configurações e lint com tipos:
  <https://typescript-eslint.io/users/configs> e
  <https://typescript-eslint.io/getting-started/typed-linting>
- ESLint — `max-lines` (recomendação típica de 100–500 linhas):
  <https://eslint.org/docs/latest/rules/max-lines>
- ESLint — `max-lines-per-function`, `complexity`, `max-depth`,
  `max-params`, `max-nested-callbacks`:
  <https://eslint.org/docs/latest/rules/max-lines-per-function>,
  <https://eslint.org/docs/latest/rules/complexity>
- SonarJS — complexidade cognitiva (limiar padrão 15) e regras de duplicação:
  <https://github.com/SonarSource/SonarJS>
- eslint-plugin-import — `no-cycle`:
  <https://github.com/import-js/eslint-plugin-import/blob/main/docs/rules/no-cycle.md>
- Práticas de orçamento de complexidade calibradas pela distribuição real do
  projeto (avisos primeiro, erro depois):
  <https://ttoss.dev/docs/engineering/pillars/complexity-reduction> e
  <https://github.com/unraid/js-standards>
- ESLint x TypeScript (usar os dois, não um no lugar do outro):
  <https://eslint.org/blog/2025/01/differences-between-eslint-and-typescript/>

## Regras propostas

### 1. Lint com tipos (aplicado)

O preset antigo era o `recommended` sem tipos. Agora o `recommendedTypeChecked`
com `parserOptions.projectService: true` roda em `src/**/*.{ts,tsx}` e
`tests/**/*.ts`, mais as regras:

```js
"@typescript-eslint/no-floating-promises": "error",
"@typescript-eslint/no-misused-promises": "error",
"@typescript-eslint/consistent-type-imports": "warn",
"@typescript-eslint/switch-exhaustiveness-check": "error",
```

A medição inicial encontrou **22 problemas reais** em `src`:

- 19 × `no-base-to-string` em `src/app/admin/actions.ts`: `String(formData.get(...))`
  podia transformar um `File` em `"[object File]"`. É um bug de entrada, não só
  estilo. Corrigido com o helper `readText(formData, name)` em
  `src/lib/form-data.ts` (só aceita `string`) e com teste próprio.
- 1 × `require-await` em `src/app/api/webhook/route.ts` (GET `async` sem
  `await`). O GET virou síncrono.
- 2 × `no-unnecessary-type-assertion` (`matching.ts` e `outbound.ts`).
  Removidas; de quebra, `toZernioMessage` ganhou tipos nomeados
  (`RawButton`, `TemplatePayload`) em vez de uma asserção inline.

Nos testes, três regras ficam desligadas de propósito: os mocks de `fetch` são
`async` para imitar a API real, as fixtures passam por asserções para virar
linhas do banco e `String(input)` é usado para inspecionar a URL chamada.

O comando `npm run lint:ci` roda `eslint . --max-warnings=0` e é o que o CI
deve usar. O `npm run lint` continua permissivo para o dia a dia.

`strict-boolean-expressions` e `no-unnecessary-condition` ficam para uma
segunda fase: são úteis, mas geram muito ruído em código que já funciona.

### 2. Tamanho e complexidade (aplicado como aviso)

```js
"max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
"max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
"max-depth": ["warn", 3],
"max-params": ["warn", 4],
"max-nested-callbacks": ["warn", 3],
"complexity": ["warn", 12],
```

Por que aviso e não erro: o projeto já tem arquivos grandes e dezenas de
funções complexas. Transformar tudo em erro hoje obrigaria uma refatoração
ampla e arriscada de uma vez, além de incentivar `eslint-disable` em massa. O
caminho é **ratchet**: o código novo não pode piorar, e cada arquivo tocado
reduz a dívida.

**Como o portão funciona:** o `npm run lint:ci` roda
`eslint . --max-warnings=42`. Esse 42 é o baseline medido depois das três
primeiras partes da Fase 5 (divisão de `admin/actions.ts`, de
`webhook/process.ts` e de `admin/conexao/page.tsx`). Um aviso novo faz o CI
falhar; corrigir avisos nunca quebra o CI. Quando o número cair, baixe o valor
em `package.json` (e aqui). Quando chegar a zero, os limites podem virar
`error`.

Baseline por regra (2026-10-26, após a Fase 5 parte 3):

| Regra | Avisos |
| --- | --- |
| `complexity` (limite 12) | 15 |
| `max-lines-per-function` (60) | 16 |
| `max-lines` (400) | 3 |
| `sonarjs/cognitive-complexity` (15) | 7 |
| `max-depth` (3) | 1 |
| **Total** | **42** |

Testes e scripts têm exceções conscientes:

```js
// tests/**
"max-lines": ["warn", 800],
"max-lines-per-function": "off", // um describe inteiro conta como uma função
"complexity": "off",

// scripts/**
"max-lines-per-function": "off", // a API falsa do demo é um bloco só
```

### 3. Duplicação e cheiros (SonarJS, aplicado)

`eslint-plugin-sonarjs` 4.x (compatível com ESLint 9) foi instalado com um
subconjunto, tudo como aviso:

```js
"sonarjs/cognitive-complexity": ["warn", 15],
"sonarjs/no-identical-functions": "warn",
"sonarjs/no-duplicate-string": ["warn", { threshold: 5 }],
"sonarjs/no-duplicated-branches": "warn",
"sonarjs/no-all-duplicated-branches": "warn",
"sonarjs/no-collapsible-if": "warn",
"sonarjs/no-useless-catch": "warn",
"sonarjs/prefer-immediate-return": "warn",
"sonarjs/prefer-single-boolean-return": "warn",
```

O `no-duplicate-string` já apontou `"/admin"` e `"/admin/conexao"`, repetidos
8 vezes cada em `actions.ts`; viraram as constantes `ADMIN_PATH` e
`CONNECTION_PATH`. As regras de SonarJS rodam só em `src` (testes e scripts
ficam de fora para não gerar ruído).

Duplicação já visível sem a ferramenta:

- Os textos padrão da porta de seguidor estão em `actions.ts` **e** repetidos
  em `automation-form.tsx` (duas vezes no mesmo arquivo). Se um mudar, o outro
  fica para trás. Extrair para `src/lib/automation-defaults.ts`.
- `formatDateTime` existe em `src/app/admin/labels.ts` e foi reimplementado em
  `src/app/admin/conexao/page.tsx`.
- `requestJson` existe em `instagram/client.ts` e `zernio/client.ts` com a mesma
  mecânica (timeout, parse, erro). Dá para extrair só o transporte e manter os
  erros específicos.

### 4. Imports

`eslint-plugin-import` já vem como dependência transitiva do Next, mas deve ser
declarado no `package.json` se for usado direto. Ligar apenas o que pega bug:

```js
"import/no-cycle": ["error", { maxDepth: 3 }],
"import/no-duplicates": "error",
"import/no-self-import": "error",
```

`import/order` é opinião. Se for adotado, que seja junto com Prettier e em um
commit separado, sem misturar com mudança de lógica.

### 5. Regras gerais que faltam

O preset atual **não** liga o `eslint:recommended` do núcleo. Vale ligar
`js.configs.recommended` e complementar:

```js
"eqeqeq": ["error", "smart"],
"curly": ["error", "all"],
"no-console": ["warn", { allow: ["warn", "error"] }], // src; off em scripts
"no-implicit-coercion": "warn",
"no-throw-literal": "error",
"prefer-const": "error",
```

`no-console` com `allow: ["warn", "error"]` mantém os logs de servidor atuais e
evita `console.log` esquecido.

### 6. Formatação (aplicada) e comentários de lint

- **Prettier** (`printWidth: 80`, aspas duplas, `semi: true`,
  `trailingComma: "all"`, `endOfLine: "lf"`) + `eslint-config-prettier`, que
  desliga as regras de estilo do ESLint. A formatação foi aplicada em 40
  arquivos num commit só de estilo, e o CI roda `npm run format:check`.
- `.editorconfig` com UTF-8, LF, 2 espaços e linha final.
- Ainda pendente: `@eslint-community/eslint-plugin-eslint-comments` com
  `no-unlimited-disable`, para proibir `eslint-disable` sem justificativa
  (hoje existe um único `eslint-disable` no projeto).

### 7. O que **não** adotar agora

- **`eslint-plugin-unicorn`**: a versão atual (79) exige ESLint ≥ 10.4 e o
  projeto está no 9.39. Além disso, é altamente opinativo (renomeia
  identificadores, proíbe `null`), o que gera ruído sem pegar os bugs que
  importam aqui. Reavaliar só depois de subir o ESLint.
- **Ligar todos os limites como `error` de uma vez**: bloqueia o deploy por
  dívida antiga e incentiva `eslint-disable` em massa.
- **`strict-type-checked` completo**: o `recommendedTypeChecked` já pega o que
  interessa; o `strict` adiciona regras que exigem refatoração de estilo antes
  de dar valor.

## Revisão do código: o que refatorar

Ordenado por retorno, não por tamanho.

### Prioridade 1 — arquivos que misturam responsabilidades

| Arquivo | Linhas | Problema | Divisão sugerida |
| --- | --- | --- | --- |
| `src/lib/queue/drain.ts` | 941 | claim, envio Meta/Zernio, follow-check, rate limit, token e limpeza no mesmo módulo | `queue/claim.ts`, `queue/send.ts`, `queue/follow-check.ts`, `queue/token.ts`, `queue/cleanup.ts` |
| `src/app/admin/automacoes/automation-form.tsx` | 514 | complexidade 62; campos repetidos e condicionais de modo | `MessageFields`, `FollowGateFields`, `LinkFields` |
| `scripts/local-demo.mjs` | 468 | API falsa + orquestração no mesmo `main` (complexidade 43) | `scripts/demo/mock-api.mjs` + `scripts/demo/run.mjs` |

**Já dividido na Fase 5:**

- `src/app/admin/actions.ts` (524 → ~120 linhas) virou `admin/actions.ts` (só
  `saveAutomation` e `toggleAutomation`), `admin/conexao/actions.ts` (conexão
  Meta/Zernio), `lib/automation-input.ts` (leitura e schema do formulário,
  testado) e `lib/zernio/select-account.ts` (escolha da conta, testada).
- `src/lib/webhook/process.ts` (642 → ~200 linhas) virou
  `webhook/comment.ts` (comentário e primeira DM), `webhook/message.ts`
  (mensagem, modos e porta de seguidor), `webhook/automation.ts` (busca da
  automação), `webhook/outbox.ts` (fila de saída), `webhook/events.ts`
  (dedupe) e `webhook/types.ts`. `process.ts` continua sendo a porta de
  entrada usada pela rota e pela Zernio.
- `src/app/admin/conexao/page.tsx` (512 → ~95 linhas) virou componentes:
  `account-card.tsx`, `empty-account-card.tsx`, `zernio-account-picker.tsx`,
  `diagnostics-card.tsx`, `webhook-setup-card.tsx`, `env-checklist.tsx`,
  `recent-webhooks.tsx` e `connection-header.tsx`, com os dados carregados em
  `load-connection.ts` e os textos em `connection-utils.ts`.

### Prioridade 2 — funções grandes

- `processJob` (123 linhas, complexidade 29): separar envio Meta e Zernio em
  funções próprias (a Zernio já tem `sendWithZernio`; falta o caminho Meta).
- `processFollowCheck` (184 linhas): extrair `fetchFollowStatus(account,
  interaction)` (o bloco Meta/Zernio) e `applyFollowResult(...)`.
- `toZernioMessage` (complexidade 27): separar extração de texto e de botões
  em funções pequenas e testáveis.
- `runConnectionTest` / `runZernioConnectionTest`: separar coleta de fatos de
  montagem da lista de problemas.

### Prioridade 3 — robustez e testes

- `runZernioConnectionTest` diz “Webhook: segredo configurado” só checando a
  variável de ambiente; não confirma que o endpoint existe na Zernio. Buscar os
  webhooks cadastrados e comparar URL/eventos.
- Erros genéricos (`throw new Error`) em caminhos de configuração poderiam ter
  códigos, como já acontece na fila (`errorCode`).
- 31 `console.*` em `src`: aceitáveis como log de servidor, mas vale um helper
  `logError(context, error)` para padronizar e nunca vazar token/PII.

## Correções feitas durante esta revisão

Três bugs encontrados ao revisar o código recém-integrado da Zernio:

1. **`connectZernio` desconectava a conta recém-criada.** Depois do `INSERT`,
   `existingId` continuava vazio e o passo “desconectar as outras contas”
   desligava todas as contas Zernio. Agora o `INSERT` usa `RETURNING id` e só
   desliga as demais quando há um id ativo.
2. **URL duplicada no status de seguidor.** `getFollowStatus` montava a URL
   absoluta e `requestJson` prefixava a base de novo
   (`https://zernio.com/apihttps://zernio.com/api/...`). Agora o caminho é
   relativo, com `?refresh=true` quando necessário. Coberto por teste.
3. **Dedupe dependia do `id` do corpo.** A Zernio envia `X-Zernio-Event-Id`;
   quando o corpo não traz `id`, o evento ganhava um UUID novo e podia ser
   processado duas vezes. O cabeçalho agora é o fallback. Coberto por teste.

## Plano de adoção (em commits separados)

1. **Fase 1 — lint tipado + correções** ✅ **concluída**: `recommendedTypeChecked`
   ativo em `src` e `tests`, 22 achados corrigidos e `npm run lint:ci` sem erros
   nem avisos (antes dos orçamentos da Fase 2).
2. **Fase 2 — orçamentos como aviso** ✅ **concluída**: `max-lines`,
   `max-lines-per-function`, `complexity`, `max-depth`, `max-params`,
   `max-nested-callbacks` e SonarJS selecionado. Baseline de 58 avisos no
   `lint:ci` (56 antes do Prettier), sem refatoração grande ainda.
3. **Fase 3 — CI** ✅ **concluída**: `.github/workflows/ci.yml` roda em push
   para `master` e em Pull Request, com PostgreSQL 18 na porta 5433, migrations,
   `lint:ci`, `typecheck`, testes e build. O build não recebe segredos, igual ao
   Dockerfile.
4. **Fase 4 — formatação** ✅ **concluída**: Prettier + `.editorconfig` num
   commit só de formatação; `format:check` entrou no CI.
5. **Fase 5 — refatoração guiada** 🔄 **em andamento**: atacar Prioridade 1,
   arquivo por arquivo, com testes antes/depois. Parte 1: `admin/actions.ts`
   dividido (baseline 58 → 54). Parte 2: `webhook/process.ts` dividido em seis
   módulos (54 → 46). Parte 3: `admin/conexao/page.tsx` dividido em componentes
   (46 → 42). 111 testes.
6. **Fase 6 — ratchet**: converter avisos em erro quando o baseline estiver
   limpo.

## Comandos usados na medição

Com o lint tipado já no projeto, a medição é direta:

```powershell
npm run lint:ci                     # eslint . --max-warnings=0
npx eslint src --format json -o eslint-typed.json   # inventário por regra
```

As configurações temporárias usadas para medir `max-lines`/`complexity`
(`eslint.metrics.mjs`) e o lint tipado antes de adotá-lo (`eslint.typed.mjs`)
foram removidas; elas não fazem parte do projeto.

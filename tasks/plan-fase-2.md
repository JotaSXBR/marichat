# Plano: Seção 2 do BACKLOG (CI e confiança)

## Visão geral

Levar para o CI os dois itens da Seção 2: a auditoria de acessibilidade (hoje
`scripts/a11y.mjs`, que depende de `npm run dev` + `.env.local`) e os primeiros
testes de navegador. O CI já tem Postgres de serviço na 5433 e aplica
migrations, então o que falta é um harness Playwright que suba o app de
produção contra esse banco.

## Decisões

- **Um harness só: Playwright, não script.** `scripts/a11y.mjs` vira um spec.
  Motivo: mesma capacidade, com `webServer`, retries, trace e relatório
  nativos; e um único lugar para manter (o script é uma segunda implementação
  de navegador). O `npm run a11y` passa a apontar para o spec.
- **`playwright.config.ts` com `webServer`**, comando `npm run start` (o CI
  roda `npm run build` antes; local exige o build feito). `reuseExistingServer`
  ligado fora do CI.
- **Seed por SQL direto** (`scripts/seed-e2e.mjs`, driver `postgres`), não pelos
  helpers do Vitest: eles importam `@/…` e um cliente Drizzle pensado para o
  runner de unidade. SQL puro evita acoplar dois runners.
- **Banco de teste é o mesmo da suíte de integração** (5433, `marichat_test`).
  O seed limpa e repovoa; não roda em produção porque a porta 5433 é o portão
  de `tests/helpers/db.ts` — o seed repete a mesma checagem.
- **Escopo dos testes de navegador desta leva:** a11y + overflow (7 rotas × 3
  larguras, tema claro e escuro) e quatro comportamentos: toggle de automação,
  filtro que aplica ao trocar de aba, tema persistido e erro ao salvar. Nada de
  fluxo de webhook — isso já é coberto por integração.
- **Credenciais:** HTTP Basic (`admin` + `ADMIN_PASSWORD`) via
  `httpCredentials`; nenhum login manual.

## Tasks

### Fase 1: harness

- [x] Task 1: `playwright.config.ts` + `npm run test:e2e` + um spec mínimo
      (health) que passa localmente contra o banco de 5433.
- [x] Task 2: `scripts/seed-e2e.mjs` com conta conectada, 3 automações e
      interações suficientes para as telas não ficarem vazias; roda antes do
      spec.

### Fase 2: specs

- [x] Task 3: a11y — portar `scripts/a11y.mjs` para spec (7 rotas × 3 larguras,
      claro e escuro, axe AA + overflow), apagar o script e ajustar
      `package.json`.
- [x] Task 4: comportamentos — toggle de automação, filtro preservado na troca
      de aba, tema persistido, erro ao salvar.
- [x] Task 5: rodar a suíte inteira (Vitest + e2e) e conferir que nada regrediu.

### Fase 3: CI

- [x] Task 6: job `navegador` no `ci.yml`: Postgres 5433, build, `playwright
      install --with-deps chromium`, seed, e2e; trace e capturas como artifact
      quando falhar.
- [x] Task 7: verificação final (`format:check`, `lint:ci`, `typecheck`,
      `test`, `build`) e atualização do `docs/BACKLOG.md`.

## Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Playwright não resolver o alias `@/` nos specs | Médio | Specs importam só `@playwright/test`; seed e dados vêm do banco |
| Seed divergir do schema e quebrar sem aviso | Médio | Seed usa as mesmas migrations do CI; roda sempre depois de `db:migrate` |
| Job de navegador somar muito tempo ao CI | Baixo | `chromium` só, `timeout-minutes` no job, e o job já existente continua independente |
| Portar o script perder alguma checagem | Baixo | O spec replica ROUTES, VIEWPORTS e os dois temas do script atual |

## Fora do escopo

- Subir o app em produção para os testes (roda contra build local no CI).
- Rodar a auditoria em conta real (Seção 3).

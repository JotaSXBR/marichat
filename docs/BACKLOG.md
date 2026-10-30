# MARICHAT — o que falta

Levantamento feito em 2026-10-28, depois da v7 do painel. Cada item diz onde
está a evidência; nada aqui é suposição de roadmap.

Estado em 2026-10-29: motor (webhook → fila → DM → link), Zernio, porta de
seguidor, resposta pública, privacidade/exclusão e as 5 telas do painel estão
prontos. A **Seção 1** foi executada (estados de tela, paginação, componentes
mortos, logs e o stub do DESIGN). O que segue é o que **não** está. As ideias
novas da pesquisa de mercado estão em
[`BACKLOG-FUTURO.md`](BACKLOG-FUTURO.md), para a segunda leva.

## 1. Painel: o que o DESIGN.md promete e o código não tem

Concluída em 2026-10-29.

- [x] **Estados de carga e erro.** `src/app/admin/loading.tsx`, `error.tsx`,
      `not-found.tsx` e `src/app/not-found.tsx`. O erro usa `retry()` e mostra
      o `digest`; o loading é um skeleton único de R2 + 5 linhas.
- [x] **Paginação.** Atividade (`?limite=`, padrão 30, teto 300) e Automações
      (`?limite=`, padrão 200, teto 1.000) mostram "Mostrando X de N" e
      "Carregar mais" preservando aba, busca e filtro.
- [x] **Componentes sem uso.** `card`, `drawer`, `radio-group`, `select` e
      `status-island` foram apagados; `skeleton` ficou e agora sustenta o
      `loading.tsx`. O `DESIGN.md` §6.2 foi atualizado.
- [x] **`dev.log` na raiz.** `*.log` entrou no `.gitignore`; o arquivo só
      continua no disco enquanto o `npm run dev` o mantém aberto.
- [x] **`docs/DESIGN.md` era um stub da v4.** Arquivo apagado; a raiz é a
      única fonte.

## 2. CI e confiança

Concluída em 2026-10-30.

- [x] **Acessibilidade no CI.** `e2e/a11y.spec.ts` cobre 7 rotas × 3 larguras × 2
      temas (42 casos) com axe WCAG A/AA e medição de `scrollWidth`. Roda no CI,
      no mesmo build do job de verificação, com Postgres de teste e Chromium.
- [x] **Testes de navegador.** `e2e/comportamentos.spec.ts` cobre toggle de
      automação, filtro da Atividade, tema persistido e erro ao salvar. O
      `scripts/a11y.mjs` foi apagado: o Playwright é o único harness.
      Trace e capturas sobem como artifact quando o job falha.

## 3. Produção: validar em conta real

Do "Pendências antes de produção" do `README.md`:

- [ ] A Meta devolve `is_user_follow_business` no perfil de quem conversa? No
      modo travado, a ausência mantém a conversa retida (por definição).
- [ ] Com a Zernio: `comment.received` chega para posts antigos e o status de
      seguidor vem preenchido?
- [ ] App Meta Live, permissões com Advanced Access e revisão — **somente se**
      usar `MESSAGING_PROVIDER=meta`.
- [ ] `PRIVACY_CONTACT_EMAIL` definido e política revisada com quem responde
      pelo perfil.
- [ ] Cron de 1 minuto (`/api/cron/tick`) e backups do PostgreSQL ligados no
      Coolify.

## 4. Produto: extras que o brief deixou para depois

- [ ] **Lembrete** para quem não respondeu à primeira DM.
- [ ] **Gatilho por DM ou story** (hoje só comentário com palavra-chave).
- [ ] **Mais de uma conta** (o schema prevê, nenhum fluxo implementa).
- [ ] **Relatórios por período** (hoje só as leituras de Operação e Atividade).
- [ ] **Excluir automação** — opcional; a v1 pausa em vez de excluir.

## 5. Ordem sugerida

1. ~~Publicar a v7 (este commit).~~ Feito.
2. ~~`loading.tsx` + `error.tsx` do painel.~~ Feito.
3. ~~Paginação em Atividade e Automações.~~ Feito.
4. ~~Limpeza dos componentes mortos, stub do DESIGN e logs.~~ Feito.
5. ~~Job de a11y no CI e testes de navegador.~~ Feito.
6. Validação em conta real.
7. Extras de produto — ver [`BACKLOG-FUTURO.md`](BACKLOG-FUTURO.md).

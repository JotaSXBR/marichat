# MARICHAT — o que falta

Levantamento feito em 2026-10-28, depois da v7 do painel. Cada item diz onde
está a evidência; nada aqui é suposição de roadmap.

Estado: motor (webhook → fila → DM → link), Zernio, porta de seguidor,
resposta pública, privacidade/exclusão e as 5 telas do painel estão prontos.
O que segue é o que **não** está.

## 1. Painel: o que o DESIGN.md promete e o código não tem

- [ ] **Estados de carga e erro.** Não existe nenhum `loading.tsx`,
      `error.tsx` ou `not-found.tsx` em `src/app/`. Hoje, banco lento não mostra
      skeleton e erro de banco cai na tela padrão do Next, sem "Tentar
      novamente". O `DESIGN.md` §7 e §9 descrevem esses estados.
- [ ] **Paginação.** `atividade/data.ts` corta em 30 e
      `automacoes/page.tsx` em 200 sem avisar; falta "Mostrando 30 de 1.284" +
      "Carregar mais" (§7).
- [ ] **Componentes sem uso** (~600 linhas): `ui/card.tsx`, `ui/drawer.tsx`,
      `ui/radio-group.tsx`, `ui/select.tsx`, `ui/skeleton.tsx` e
      `kokonutui/status-island.tsx` não têm nenhum import. Decidir: usar ou
      apagar.
- [ ] **`dev.log` na raiz** aparece como untracked. Adicionar `*.log` ao
      `.gitignore`.
- [ ] **`docs/DESIGN.md` é um stub da v4** (8 linhas apontando para a raiz).
      Apagar ou atualizar.

## 2. CI e confiança

- [ ] **Acessibilidade e captura fora do CI.** `scripts/a11y.mjs` depende de
      dev + Postgres + Chromium; roda só na máquina. O portão existe, mas não
      impede merge que reprova contraste. Um job com Playwright + banco de
      teste fecharia isso.
- [ ] **Nenhum teste de navegador.** Toggle de automação, filtro que aplica ao
      trocar, troca de tema, salvar com erro e layout em 320 px foram conferidos
      por captura manual. Os 196 testes são unitários/integração.

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

1. Publicar a v7 (este commit).
2. `loading.tsx` + `error.tsx` do painel.
3. Job de a11y no CI.
4. Paginação em Atividade.
5. Limpeza dos componentes mortos e dos logs.
6. Validação em conta real.
7. Extras de produto na ordem de quem opera o perfil.

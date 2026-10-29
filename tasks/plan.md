# Plano: fechar a Seção 1 do BACKLOG (pós-v7)

## Visão geral

A v7 do painel já está publicada. Esta leva fecha o que o `DESIGN.md` promete e
o código ainda não entrega: estados de tela, paginação, limpeza de componentes
mortos, logs fora do Git e o stub `docs/DESIGN.md`. CI de acessibilidade,
testes de navegador e extras de produto ficam para a segunda leva, junto com a
pesquisa de mercado em `docs/BACKLOG-FUTURO.md`.

## Decisões

- **`loading.tsx` único em `/admin`**: cada tela repete a mesma gramática
  (R2 + tabela/leitura); um skeleton compartilhado evita cinco cópias. O
  `AdminLayout` consulta o banco, então o fallback pode demorar em navegações;
  ainda assim cobre a espera da página, que é a consulta pesada.
- **`error.tsx` em `/admin`**: boundary de cliente com `retry()` (novo nome
  estável no Next 16.3+, conforme `node_modules/next/dist/docs`). Mostra
  `digest` quando existir, sem vazar a mensagem de produção.
- **Dois `not-found.tsx`**: um em `/admin` (mantém a navegação e o caso
  "automação não existe") e um na raiz (URL pública desconhecida).
- **Paginação cumulativa por `?limite=`**, não por página: "Carregar mais"
  mantém a leitura atual e casa com "Mostrando X de N" do §7. Sem offset, sem
  estado cliente.
- **Tetos**: Atividade 300, Automações 1.000. São proteções de consulta, não
  regra de produto; comentário `shortcut:` registra o limite.
- **Skeleton fica** (é usado pelo loading). `card`, `drawer`, `radio-group`,
  `select` e `status-island` são apagados: zero imports, e o DESIGN v7 já diz
  que a ilha saiu.
- **`docs/DESIGN.md` é apagado**: é um stub da v4 apontando para a raiz; manter
  um arquivo que só diz "não use" é ruído.

## Tasks

### Fase 1: limpeza (independente)

- [x] Task 1: `*.log` no `.gitignore` e remover `dev.log` do worktree.
- [x] Task 2: apagar componentes sem uso e atualizar o `DESIGN.md` §6.2.
- [x] Task 3: apagar `docs/DESIGN.md` e o item correspondente do backlog.

### Fase 2: estados de tela

- [x] Task 4: `src/app/admin/loading.tsx` com skeleton de R2 + 5 linhas.
- [x] Task 5: `src/app/admin/error.tsx` com "Tentar novamente" e digest.
- [x] Task 6: `src/app/admin/not-found.tsx` + `src/app/not-found.tsx`.

### Fase 3: paginação

- [x] Task 7: Atividade — `?limite=`, contagens reais, "Mostrando X de N" e
      "Carregar mais" nas três abas, com o filtro preservado.
- [x] Task 8: Automações — `?limite=`, corte honesto e "Carregar mais"
      preservando busca e situação.
- [x] Task 9: testes unitários de leitura da URL e montagem dos links.

### Fase 4: verificação

- [x] `npm run format:check`
- [x] `npm run lint:ci`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`

### Fase 5: segunda leva

- [x] `docs/BACKLOG-FUTURO.md` com pesquisa de mercado, referência ao app,
  valor, esforço e ordem sugerida. Nada implementado nesta leva.

## Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| `loading.tsx` não aparecer por causa da consulta no layout | Baixo | Documentado acima; a página continua coberta pelo Suspense |
| Link "Carregar mais" perder filtro/aba | Médio | Helpers testados em `navigation.ts` e `query.ts` |
| Contagem divergir da lista por corrida entre queries | Baixo | `Promise.all` no mesmo instante; diferença só afeta o texto "de N" |
| Tetos de `?limite=` esconderem registros | Baixo | Link continua avançando até o teto; comentário `shortcut:` explica |

## Fora do escopo

- Validação em conta real (Seção 3).
- Job de a11y e testes de navegador (Seção 2).
- Extras de produto: lembrete, DM/story, multi-conta, relatórios, excluir.

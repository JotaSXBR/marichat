/** Leitura da URL e filtro da lista de automações (sem JSX). */

import type { automations } from "@/lib/db/schema";

export type AutomationFilter = "ativa" | "pausada";

type Automation = Pick<
  typeof automations.$inferSelect,
  "name" | "keyword" | "isActive"
>;

export function matchesAutomation(
  automation: Automation,
  q: string,
  situacao?: AutomationFilter,
): boolean {
  if (situacao && automation.isActive !== (situacao === "ativa")) return false;
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    automation.name.toLowerCase().includes(needle) ||
    automation.keyword.toLowerCase().includes(needle)
  );
}

/** Contagem do cabeçalho: filtro ativo mostra o recorte, senão o total. */
export function automationsMeta({
  account,
  total,
  visible,
  active,
  filtering,
}: {
  account: boolean;
  total: number;
  visible: number;
  active: number;
  filtering: boolean;
}): string | undefined {
  if (!account) return undefined;
  if (filtering) return `${visible} de ${total} automações`;
  return `${total} ${total === 1 ? "automação" : "automações"} · ${active} ${active === 1 ? "ativa" : "ativas"}`;
}

/** Busca e situação vivem na URL; valor inválido cai no padrão. */
export function readAutomationsQuery(
  params: Record<string, string | string[] | undefined>,
) {
  const situacao: AutomationFilter | undefined =
    params.situacao === "ativa" || params.situacao === "pausada"
      ? params.situacao
      : undefined;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  return {
    saved: params.ok === "1",
    q,
    situacao,
    filtering: Boolean(q || situacao),
  };
}

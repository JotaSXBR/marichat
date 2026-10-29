/** Abas e filtro da Atividade vivem na URL (sem JSX). */

import {
  isActivityFilter,
  type ActivityFilter,
} from "@/app/admin/atividade/data";

export const ACTIVITY_TABS = ["interacoes", "envios", "webhooks"] as const;
export type ActivityTab = (typeof ACTIVITY_TABS)[number];

export function isActivityTab(value: string | undefined): value is ActivityTab {
  return ACTIVITY_TABS.includes(value as ActivityTab);
}

export function activityTabHref(
  tab: ActivityTab,
  situation?: ActivityFilter,
): string {
  const params = new URLSearchParams();
  if (tab !== "interacoes") params.set("aba", tab);
  if (tab === "interacoes" && situation) params.set("situacao", situation);
  const query = params.toString();
  return query ? `/admin/atividade?${query}` : "/admin/atividade";
}

/** Aba e situação vivem na URL; valor inválido cai no padrão. */
export function readActivityQuery(
  params: Record<string, string | string[] | undefined>,
) {
  const rawTab = typeof params.aba === "string" ? params.aba : undefined;
  const rawSituation =
    typeof params.situacao === "string" ? params.situacao : undefined;
  const tab: ActivityTab = isActivityTab(rawTab) ? rawTab : "interacoes";
  const situation: ActivityFilter | undefined = isActivityFilter(rawSituation)
    ? rawSituation
    : undefined;

  return { tab, situation, refreshHref: activityTabHref(tab, situation) };
}

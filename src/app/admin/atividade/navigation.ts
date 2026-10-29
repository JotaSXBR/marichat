/** Abas e filtro da Atividade vivem na URL (sem JSX). */

import {
  ACTIVITY_LIMIT,
  ACTIVITY_MAX_LIMIT,
  isActivityFilter,
  type ActivityFilter,
} from "@/app/admin/atividade/data";
import { readLimit } from "@/lib/pagination";

export const ACTIVITY_TABS = ["interacoes", "envios", "webhooks"] as const;
export type ActivityTab = (typeof ACTIVITY_TABS)[number];

export function isActivityTab(value: string | undefined): value is ActivityTab {
  return ACTIVITY_TABS.includes(value as ActivityTab);
}

export function activityTabHref(
  tab: ActivityTab,
  situation?: ActivityFilter,
  limit?: number,
): string {
  const params = new URLSearchParams();
  if (tab !== "interacoes") params.set("aba", tab);
  if (tab === "interacoes" && situation) params.set("situacao", situation);
  if (limit && limit > ACTIVITY_LIMIT) params.set("limite", String(limit));
  const query = params.toString();
  return query ? `/admin/atividade?${query}` : "/admin/atividade";
}

/** Links de "Carregar mais"; vazio quando o teto de leitura foi atingido. */
export function activityMoreHrefs({
  situation,
  limit,
}: {
  situation?: ActivityFilter;
  limit: number;
}) {
  if (limit >= ACTIVITY_MAX_LIMIT) return {};
  const next = Math.min(limit + ACTIVITY_LIMIT, ACTIVITY_MAX_LIMIT);
  return {
    interactions: activityTabHref("interacoes", situation, next),
    jobs: activityTabHref("envios", undefined, next),
    events: activityTabHref("webhooks", undefined, next),
  };
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
  const limit = readLimit(params.limite, ACTIVITY_LIMIT, ACTIVITY_MAX_LIMIT);

  return {
    tab,
    situation,
    limit,
    refreshHref: activityTabHref(tab, situation, limit),
  };
}

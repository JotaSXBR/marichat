import { describe, expect, it } from "vitest";

import {
  activityMoreHrefs,
  activityTabHref,
  isActivityTab,
  readActivityQuery,
} from "@/app/admin/atividade/navigation";

describe("navegação da Atividade", () => {
  it("reconhece apenas as abas conhecidas", () => {
    expect(isActivityTab("envios")).toBe(true);
    expect(isActivityTab("webhooks")).toBe(true);
    expect(isActivityTab("outra")).toBe(false);
    expect(isActivityTab(undefined)).toBe(false);
  });

  it("monta o link da aba mantendo o filtro só em interações", () => {
    expect(activityTabHref("interacoes")).toBe("/admin/atividade");
    expect(activityTabHref("interacoes", "failed")).toBe(
      "/admin/atividade?situacao=failed",
    );
    expect(activityTabHref("envios", "failed")).toBe(
      "/admin/atividade?aba=envios",
    );
    expect(activityTabHref("webhooks")).toBe("/admin/atividade?aba=webhooks");
  });

  it("só grava o limite quando ele passa do padrão", () => {
    expect(activityTabHref("interacoes", "failed", 30)).toBe(
      "/admin/atividade?situacao=failed",
    );
    expect(activityTabHref("interacoes", "failed", 90)).toBe(
      "/admin/atividade?situacao=failed&limite=90",
    );
    expect(activityTabHref("envios", undefined, 90)).toBe(
      "/admin/atividade?aba=envios&limite=90",
    );
  });

  it("cai no padrão quando a URL traz valor inválido", () => {
    expect(readActivityQuery({})).toEqual({
      tab: "interacoes",
      situation: undefined,
      limit: 30,
      refreshHref: "/admin/atividade",
    });
    expect(readActivityQuery({ aba: "envios", situacao: "failed" })).toEqual({
      tab: "envios",
      situation: "failed",
      limit: 30,
      refreshHref: "/admin/atividade?aba=envios",
    });
    expect(readActivityQuery({ aba: "outra", situacao: "failed" })).toEqual({
      tab: "interacoes",
      situation: "failed",
      limit: 30,
      refreshHref: "/admin/atividade?situacao=failed",
    });
  });

  it("lê o limite cumulativo e respeita o teto", () => {
    expect(readActivityQuery({ limite: "90" })).toMatchObject({
      limit: 90,
      refreshHref: "/admin/atividade?limite=90",
    });
    expect(readActivityQuery({ limite: "10" }).limit).toBe(30);
    expect(readActivityQuery({ limite: "9999" }).limit).toBe(300);
  });

  it("monta os três links de carregar mais e para no teto", () => {
    expect(activityMoreHrefs({ situation: "failed", limit: 30 })).toEqual({
      interactions: "/admin/atividade?situacao=failed&limite=60",
      jobs: "/admin/atividade?aba=envios&limite=60",
      events: "/admin/atividade?aba=webhooks&limite=60",
    });
    expect(activityMoreHrefs({ limit: 300 })).toEqual({});
  });
});

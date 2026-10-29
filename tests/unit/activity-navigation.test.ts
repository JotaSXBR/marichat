import { describe, expect, it } from "vitest";

import {
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

  it("cai no padrão quando a URL traz valor inválido", () => {
    expect(readActivityQuery({})).toEqual({
      tab: "interacoes",
      situation: undefined,
      refreshHref: "/admin/atividade",
    });
    expect(readActivityQuery({ aba: "envios", situacao: "failed" })).toEqual({
      tab: "envios",
      situation: "failed",
      refreshHref: "/admin/atividade?aba=envios",
    });
    expect(readActivityQuery({ aba: "outra", situacao: "failed" })).toEqual({
      tab: "interacoes",
      situation: "failed",
      refreshHref: "/admin/atividade?situacao=failed",
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  automationsMeta,
  matchesAutomation,
  readAutomationsQuery,
} from "@/app/admin/automacoes/query";

const base = {
  name: "Comentário no post",
  keyword: "quero",
  isActive: true,
};

describe("lista de automações", () => {
  it("lê busca, situação e o aviso de salvo da URL", () => {
    expect(
      readAutomationsQuery({
        q: "  promo ",
        situacao: "pausada",
        ok: "1",
      }),
    ).toEqual({
      saved: true,
      q: "promo",
      situacao: "pausada",
      filtering: true,
    });

    expect(readAutomationsQuery({ situacao: "outra", q: ["a"] })).toEqual({
      saved: false,
      q: "",
      situacao: undefined,
      filtering: false,
    });
  });

  it("filtra por situação e por nome ou palavra-chave sem diferenciar caixa", () => {
    expect(matchesAutomation(base, "", undefined)).toBe(true);
    expect(matchesAutomation(base, "COMENTÁRIO")).toBe(true);
    expect(matchesAutomation(base, "quero")).toBe(true);
    expect(matchesAutomation(base, "outra")).toBe(false);
    expect(matchesAutomation(base, "", "ativa")).toBe(true);
    expect(matchesAutomation(base, "", "pausada")).toBe(false);
    expect(matchesAutomation({ ...base, isActive: false }, "", "pausada")).toBe(
      true,
    );
  });

  it("resume o cabeçalho com total ou recorte", () => {
    expect(
      automationsMeta({
        account: false,
        total: 0,
        visible: 0,
        active: 0,
        filtering: false,
      }),
    ).toBeUndefined();
    expect(
      automationsMeta({
        account: true,
        total: 1,
        visible: 1,
        active: 1,
        filtering: false,
      }),
    ).toBe("1 automação · 1 ativa");
    expect(
      automationsMeta({
        account: true,
        total: 3,
        visible: 2,
        active: 2,
        filtering: true,
      }),
    ).toBe("2 de 3 automações");
  });
});

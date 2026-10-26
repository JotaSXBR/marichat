import { describe, expect, it } from "vitest";

import {
  commentMatchesKeyword,
  normalizeKeyword,
  normalizeText,
  pickAutomation,
} from "@/lib/matching";

describe("normalização", () => {
  it("remove acentos e caixa", () => {
    expect(normalizeText("AÇÃO Çedilha")).toBe("acao cedilha");
    expect(normalizeKeyword("  Quero   O LINK! ")).toBe("quero o link");
  });
});

describe("correspondência de palavra-chave", () => {
  it("encontra a palavra inteira ignorando caixa, acento e pontuação", () => {
    expect(commentMatchesKeyword("Eu QUERO isso!", "quero")).toBe(true);
    expect(commentMatchesKeyword("quero, por favor", "Quero")).toBe(true);
    expect(commentMatchesKeyword("ação", "acao")).toBe(true);
  });

  it("não encontra dentro de outra palavra", () => {
    expect(commentMatchesKeyword("linktree", "link")).toBe(false);
    expect(commentMatchesKeyword("queroo", "quero")).toBe(false);
  });

  it("ignora menções no comentário", () => {
    expect(commentMatchesKeyword("@maria quero sim", "quero")).toBe(true);
  });

  it("funciona com frases", () => {
    expect(commentMatchesKeyword("Oi! Quero o link, pfv", "quero o link")).toBe(
      true,
    );
    expect(commentMatchesKeyword("Quero o linktree", "quero o link")).toBe(
      false,
    );
  });

  it("rejeita texto vazio", () => {
    expect(commentMatchesKeyword(null, "quero")).toBe(false);
    expect(commentMatchesKeyword("   ", "quero")).toBe(false);
    expect(commentMatchesKeyword("quero", "  ")).toBe(false);
  });
});

describe("escolha da automação", () => {
  const older = new Date("2026-01-01T00:00:00Z");
  const newer = new Date("2026-02-01T00:00:00Z");

  it("prefere a publicação específica", () => {
    const chosen = pickAutomation(
      [
        { id: "any", mediaId: null, createdAt: older },
        { id: "specific", mediaId: "media-9", createdAt: newer },
      ],
      "media-9",
    );
    expect(chosen?.id).toBe("specific");
  });

  it("em empate, escolhe a mais antiga", () => {
    const chosen = pickAutomation(
      [
        { id: "newer", mediaId: null, createdAt: newer },
        { id: "older", mediaId: null, createdAt: older },
      ],
      "media-9",
    );
    expect(chosen?.id).toBe("older");
  });

  it("devolve null sem candidatos", () => {
    expect(pickAutomation([], "media-1")).toBeNull();
  });
});

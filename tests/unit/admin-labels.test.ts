import { describe, expect, it } from "vitest";

import { handleOf, linkLabel, short } from "@/app/admin/labels";

describe("rótulos do painel", () => {
  it("prefere o @ do comentarista e recorre ao id", () => {
    expect(
      handleOf({ commenterUsername: "jotasx", commenter: "178414000" }),
    ).toBe("@jotasx");
    expect(handleOf({ commenterUsername: null, commenter: "178414000" })).toBe(
      "178414000",
    );
    expect(handleOf({ commenterUsername: null, commenter: null })).toBe("—");
  });

  it("junta espaços e corta o texto com reticências", () => {
    expect(short("  duas\n\nlinhas   aqui ")).toBe("duas linhas aqui");
    expect(short("abcdefghij", 5)).toBe("abcd…");
    expect(short("abc", 5)).toBe("abc");
    expect(short(null)).toBe("—");
  });

  it("mostra o link sem protocolo nem barra final", () => {
    expect(linkLabel("https://exemplo.com/promo/")).toBe("exemplo.com/promo");
    expect(linkLabel("http://exemplo.com")).toBe("exemplo.com");
  });
});

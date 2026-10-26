import { describe, expect, it } from "vitest";

import { decryptToken, encryptToken, safeEqual } from "@/lib/crypto";

const key = Buffer.alloc(32, 3).toString("base64");
const otherKey = Buffer.alloc(32, 9).toString("base64");

describe("AES-256-GCM do token", () => {
  it("cifra e decifra preservando o valor", () => {
    const token = "IGQVJabc123|com símbolos & acentos";
    const encrypted = encryptToken(token, key);
    expect(encrypted.startsWith("v1.")).toBe(true);
    expect(encrypted).not.toContain(token);
    expect(decryptToken(encrypted, key)).toBe(token);
  });

  it("gera saídas diferentes para o mesmo texto (IV aleatório)", () => {
    expect(encryptToken("abc", key)).not.toBe(encryptToken("abc", key));
  });

  it("falha com a chave errada", () => {
    const encrypted = encryptToken("abc", key);
    expect(() => decryptToken(encrypted, otherKey)).toThrow();
  });

  it("detecta adulteração", () => {
    const encrypted = encryptToken("abc", key);
    const parts = encrypted.split(".");
    const tampered = [parts[0], parts[1], parts[2], "AAAA"].join(".");
    expect(() => decryptToken(tampered, key)).toThrow();
  });

  it("rejeita chave de tamanho inválido", () => {
    expect(() =>
      encryptToken("abc", Buffer.alloc(16).toString("base64")),
    ).toThrow(/32 bytes/);
  });
});

describe("comparação de segredos", () => {
  it("compara sem vazar tempo", () => {
    expect(safeEqual("segredo", "segredo")).toBe(true);
    expect(safeEqual("segredo", "segreda")).toBe(false);
    expect(safeEqual("curto", "bem-mais-longo")).toBe(false);
  });
});

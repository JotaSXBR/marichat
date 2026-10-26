import { describe, expect, it } from "vitest";

import {
  isAdminAuthValid,
  parseBasicAuthHeader,
  safeEqualStrings,
} from "@/lib/http-auth";

function basic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`, "utf8").toString("base64")}`;
}

describe("HTTP Basic do painel", () => {
  it("aceita usuário admin e a senha configurada", () => {
    expect(isAdminAuthValid(basic("admin", "senha-forte"), "senha-forte")).toBe(
      true,
    );
  });

  it("recusa usuário diferente, senha errada ou cabeçalho ausente", () => {
    expect(isAdminAuthValid(basic("maria", "senha-forte"), "senha-forte")).toBe(
      false,
    );
    expect(isAdminAuthValid(basic("admin", "outra"), "senha-forte")).toBe(
      false,
    );
    expect(isAdminAuthValid(null, "senha-forte")).toBe(false);
    expect(isAdminAuthValid("Bearer abc", "senha-forte")).toBe(false);
  });

  it("bloqueia quando a senha não está configurada", () => {
    expect(isAdminAuthValid(basic("admin", ""), "")).toBe(false);
    expect(isAdminAuthValid(basic("admin", "x"), undefined)).toBe(false);
  });

  it("aceita dois-pontos dentro da senha", () => {
    expect(parseBasicAuthHeader(basic("admin", "a:b:c"))).toEqual({
      username: "admin",
      password: "a:b:c",
    });
  });

  it("compara strings com segurança", () => {
    expect(safeEqualStrings("abc", "abc")).toBe(true);
    expect(safeEqualStrings("abc", "abd")).toBe(false);
  });
});

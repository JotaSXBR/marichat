import { describe, expect, it } from "vitest";

import { readText } from "@/lib/form-data";

describe("readText", () => {
  it("devolve o texto do campo", () => {
    const form = new FormData();
    form.set("name", "Promoção");
    expect(readText(form, "name")).toBe("Promoção");
  });

  it("devolve vazio quando o campo não existe", () => {
    expect(readText(new FormData(), "name")).toBe("");
  });

  it("ignora arquivo enviado no lugar do texto", () => {
    const form = new FormData();
    form.set("name", new File(["conteúdo"], "foto.png"));
    expect(readText(form, "name")).toBe("");
  });
});

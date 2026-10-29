import { describe, expect, it } from "vitest";

import { hiddenFollowModeFields } from "@/app/admin/automacoes/follow-gate-fields";
import type { AutomationInitialValues } from "@/app/admin/automacoes/form-types";
import {
  previewFromForm,
  previewOf,
  secondText,
} from "@/app/admin/automacoes/preview";

const initial: AutomationInitialValues = {
  name: "Promo",
  keyword: "quero",
  mediaId: "",
  firstDmText: "Oi",
  firstDmButtonLabel: "Quero",
  publicReplies: "",
  secondDmText: "Segunda",
  linkButtonTitle: "Abrir",
  linkUrl: "https://exemplo.com",
  followMode: "soft",
  followGateText: "Segue",
  followGateFollowLabel: "Seguir",
  followGateConfirmLabel: "Já segui",
  followOptionalText: "Opcional",
  followDirectText: "Direto",
  isActive: true,
};

describe("prévia da DM", () => {
  it("parte dos padrões e aceita os valores salvos", () => {
    expect(previewOf()).toMatchObject({
      firstDmText: "",
      firstDmButtonLabel: "",
      secondDmText: "",
      linkButtonTitle: "Abrir link",
      followMode: "off",
    });
    expect(previewOf(initial).firstDmText).toBe("Oi");
    expect(previewOf(initial).followMode).toBe("soft");
  });

  it("lê o formulário e ignora modo desconhecido", () => {
    const data = new FormData();
    data.set("firstDmText", "Nova");
    data.set("followMode", "inventado");

    expect(previewFromForm(data)).toMatchObject({
      firstDmText: "Nova",
      secondDmText: "",
      followMode: "off",
    });
  });

  it("usa o texto do modo escolhido na segunda mensagem", () => {
    const values = previewOf(initial);
    expect(secondText(values)).toBe("Segunda");
    expect(secondText({ ...values, followMode: "optional" })).toBe("Opcional");
    expect(secondText({ ...values, followMode: "direct" })).toBe("Direto");
  });
});

describe("campos ocultos do modo de seguidor", () => {
  const names = (
    followMode: "off" | "optional" | "direct",
    needsCheck: boolean,
    needsFollowButton: boolean,
  ) =>
    hiddenFollowModeFields(
      initial,
      followMode,
      needsCheck,
      needsFollowButton,
    ).map((field) => field.name);

  it("envia os campos dos outros modos com os textos salvos", () => {
    expect(names("off", false, false)).toEqual([
      "followGateText",
      "followGateConfirmLabel",
      "followOptionalText",
      "followDirectText",
      "followGateFollowLabel",
    ]);
    expect(hiddenFollowModeFields(initial, "off", false, false)[0]?.value).toBe(
      "Segue",
    );
  });

  it("não envia o campo do modo que está em uso", () => {
    expect(names("optional", true, true)).toEqual(["followDirectText"]);
    expect(names("direct", true, true)).toEqual(["followOptionalText"]);
  });
});

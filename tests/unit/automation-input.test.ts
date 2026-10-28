import { describe, expect, it } from "vitest";

import {
  DEFAULT_CONFIRM_LABEL,
  DEFAULT_FOLLOW_DIRECT_TEXT,
  DEFAULT_FOLLOW_GATE_TEXT,
  DEFAULT_FOLLOW_LABEL,
  DEFAULT_FOLLOW_OPTIONAL_TEXT,
} from "@/lib/automation-defaults";
import {
  automationColumns,
  automationSchema,
  readAutomationForm,
} from "@/lib/automation-input";

function validForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const fields: Record<string, string> = {
    name: "Promoção de outubro",
    keyword: "Quero",
    mediaId: "",
    firstDmText: "Responda esta mensagem para receber o link.",
    secondDmText: "Aqui está o seu link",
    linkButtonTitle: "Abrir link",
    linkUrl: "https://www.exemplo.com/material",
    followMode: "off",
    followGateText: "",
    followGateFollowLabel: "",
    followGateConfirmLabel: "",
    followOptionalText: "",
    followDirectText: "",
    isActive: "on",
  };
  for (const [key, value] of Object.entries({ ...fields, ...overrides })) {
    form.set(key, value);
  }
  return form;
}

describe("readAutomationForm", () => {
  it("preenche os textos padrão quando os campos vêm vazios", () => {
    const raw = readAutomationForm(validForm());

    expect(raw.followGateText).toBe(DEFAULT_FOLLOW_GATE_TEXT);
    expect(raw.followOptionalText).toBe(DEFAULT_FOLLOW_OPTIONAL_TEXT);
    expect(raw.followDirectText).toBe(DEFAULT_FOLLOW_DIRECT_TEXT);
    expect(raw.followGateFollowLabel).toBe(DEFAULT_FOLLOW_LABEL);
    expect(raw.followGateConfirmLabel).toBe(DEFAULT_CONFIRM_LABEL);
    expect(raw.isActive).toBe(true);
  });

  it("ignora arquivo enviado no lugar de texto", () => {
    const form = validForm();
    form.set("keyword", new File(["x"], "palavra.txt"));

    expect(readAutomationForm(form).keyword).toBe("");
  });

  it("usa 'off' quando o modo não vem no formulário", () => {
    const form = validForm();
    form.delete("followMode");

    expect(readAutomationForm(form).followMode).toBe("off");
  });
});

describe("automationSchema", () => {
  it("aceita um formulário válido", () => {
    const parsed = automationSchema.safeParse(readAutomationForm(validForm()));

    expect(parsed.success).toBe(true);
  });

  it("recusa link que não começa com https", () => {
    const parsed = automationSchema.safeParse(
      readAutomationForm(validForm({ linkUrl: "http://exemplo.com" })),
    );

    expect(parsed.success).toBe(false);
  });

  it("recusa segunda mensagem acima de 80 caracteres", () => {
    const parsed = automationSchema.safeParse(
      readAutomationForm(validForm({ secondDmText: "a".repeat(81) })),
    );

    expect(parsed.success).toBe(false);
  });

  it("recusa botão da primeira DM acima de 20 caracteres", () => {
    const parsed = automationSchema.safeParse(
      readAutomationForm(validForm({ firstDmButtonLabel: "a".repeat(21) })),
    );

    expect(parsed.success).toBe(false);
  });

  it("aceita resposta pública vazia (desligada)", () => {
    const parsed = automationSchema.safeParse(
      readAutomationForm(validForm({ publicReplies: "  " })),
    );

    expect(parsed.success).toBe(true);
    expect(automationColumns(parsed.data!).publicReplies).toBe("");
  });

  it("recusa lista de respostas públicas com menos de 3", () => {
    const parsed = automationSchema.safeParse(
      readAutomationForm(validForm({ publicReplies: "uma\nduas" })),
    );

    expect(parsed.success).toBe(false);
  });

  it("guarda as respostas públicas com uma por linha", () => {
    const parsed = automationSchema.safeParse(
      readAutomationForm(
        validForm({ publicReplies: "  uma \n\n duas \n três " }),
      ),
    );

    expect(parsed.success).toBe(true);
    expect(automationColumns(parsed.data!).publicReplies).toBe(
      "uma\nduas\ntrês",
    );
  });
});

describe("automationColumns", () => {
  it("zera o mediaId vazio", () => {
    const parsed = automationSchema.parse(
      readAutomationForm(
        validForm({ keyword: "Quero o LINK!", mediaId: "  " }),
      ),
    );

    const columns = automationColumns(parsed);
    expect(columns.mediaId).toBeNull();
    expect(columns.followMode).toBe("off");
  });

  it("zera o botão da primeira DM quando vem vazio", () => {
    const parsed = automationSchema.parse(readAutomationForm(validForm()));

    expect(automationColumns(parsed).firstDmButtonLabel).toBeNull();
  });

  it("mantém o botão da primeira DM quando informado", () => {
    const parsed = automationSchema.parse(
      readAutomationForm(validForm({ firstDmButtonLabel: "Quero o link" })),
    );

    expect(automationColumns(parsed).firstDmButtonLabel).toBe("Quero o link");
  });
});

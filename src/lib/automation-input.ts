/**
 * Leitura e validação do formulário de automação.
 *
 * Separado das server actions para poder ser testado sem banco e para manter
 * `actions.ts` só com o que precisa de "use server".
 */
import { z } from "zod";

import {
  DEFAULT_CONFIRM_LABEL,
  DEFAULT_FOLLOW_DIRECT_TEXT,
  DEFAULT_FOLLOW_GATE_TEXT,
  DEFAULT_FOLLOW_LABEL,
  DEFAULT_FOLLOW_OPTIONAL_TEXT,
} from "@/lib/automation-defaults";
import { readText } from "@/lib/form-data";
import { FOLLOW_MODES } from "@/lib/follow-mode";
import { normalizeKeyword } from "@/lib/matching";

export type AutomationFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function countChars(value: string): number {
  return [...value].length;
}

const httpsUrl = z
  .string()
  .trim()
  .min(1, "Informe a URL do link.")
  .max(2000, "URL muito longa.")
  .refine(
    (value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "A URL precisa começar com https:// e ser válida." },
  );

export const automationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Dê um nome para identificar a automação.")
    .max(80, "Use no máximo 80 caracteres."),
  keyword: z
    .string()
    .trim()
    .min(1, "Informe a palavra-chave.")
    .max(80, "Use no máximo 80 caracteres.")
    .refine((value) => normalizeKeyword(value).length > 0, {
      message: "A palavra-chave precisa ter letras ou números.",
    }),
  mediaId: z
    .string()
    .trim()
    .max(120, "Identificador de publicação inválido.")
    .optional(),
  firstDmText: z
    .string()
    .trim()
    .min(1, "Escreva a primeira mensagem.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 1000, {
      message: "A primeira mensagem pode ter no máximo 1.000 bytes.",
    }),
  secondDmText: z
    .string()
    .trim()
    .min(1, "Escreva o texto da segunda mensagem.")
    .refine((value) => countChars(value) <= 80, {
      message: "O texto da segunda mensagem pode ter no máximo 80 caracteres.",
    }),
  linkButtonTitle: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botão do link.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botão do link pode ter no máximo 20 caracteres.",
    }),
  linkUrl: httpsUrl,
  followMode: z.enum(FOLLOW_MODES),
  followGateText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem da porta de seguidor.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem da porta de seguidor pode ter no máximo 640 bytes.",
    }),
  followGateFollowLabel: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botão de seguir.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botão pode ter no máximo 20 caracteres.",
    }),
  followGateConfirmLabel: z
    .string()
    .trim()
    .min(1, "Escreva o texto do botão de confirmação.")
    .refine((value) => countChars(value) <= 20, {
      message: "O texto do botão pode ter no máximo 20 caracteres.",
    }),
  followOptionalText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem do modo opcional.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem do modo opcional pode ter no máximo 640 bytes.",
    }),
  followDirectText: z
    .string()
    .trim()
    .min(1, "Escreva a mensagem do modo direto.")
    .refine((value) => Buffer.byteLength(value, "utf8") <= 640, {
      message: "A mensagem do modo direto pode ter no máximo 640 bytes.",
    }),
  isActive: z.boolean(),
});

export type AutomationInput = z.infer<typeof automationSchema>;

/** Lê o formulário aplicando os textos padrão dos campos opcionais. */
export function readAutomationForm(formData: FormData) {
  return {
    name: readText(formData, "name"),
    keyword: readText(formData, "keyword"),
    mediaId: readText(formData, "mediaId"),
    firstDmText: readText(formData, "firstDmText"),
    secondDmText: readText(formData, "secondDmText"),
    linkButtonTitle: readText(formData, "linkButtonTitle"),
    linkUrl: readText(formData, "linkUrl"),
    followMode: readText(formData, "followMode") || "off",
    followGateText:
      readText(formData, "followGateText").trim() || DEFAULT_FOLLOW_GATE_TEXT,
    followGateFollowLabel:
      readText(formData, "followGateFollowLabel").trim() ||
      DEFAULT_FOLLOW_LABEL,
    followGateConfirmLabel:
      readText(formData, "followGateConfirmLabel").trim() ||
      DEFAULT_CONFIRM_LABEL,
    followOptionalText:
      readText(formData, "followOptionalText").trim() ||
      DEFAULT_FOLLOW_OPTIONAL_TEXT,
    followDirectText:
      readText(formData, "followDirectText").trim() ||
      DEFAULT_FOLLOW_DIRECT_TEXT,
    isActive: formData.get("isActive") === "on",
  };
}

/** Colunas prontas para INSERT/UPDATE, com palavra-chave normalizada. */
export function automationColumns(values: AutomationInput) {
  return {
    name: values.name,
    keyword: values.keyword,
    keywordNormalized: normalizeKeyword(values.keyword),
    mediaId:
      values.mediaId && values.mediaId.length > 0 ? values.mediaId : null,
    firstDmText: values.firstDmText,
    secondDmText: values.secondDmText,
    linkButtonTitle: values.linkButtonTitle,
    linkUrl: values.linkUrl,
    followMode: values.followMode,
    followGateText: values.followGateText,
    followGateFollowLabel: values.followGateFollowLabel,
    followGateConfirmLabel: values.followGateConfirmLabel,
    followOptionalText: values.followOptionalText,
    followDirectText: values.followDirectText,
    isActive: values.isActive,
  };
}

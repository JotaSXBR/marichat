/** Estado inicial e leitura do formulário para a prévia da DM (sem JSX). */

import type { AutomationInitialValues } from "@/app/admin/automacoes/form-types";
import {
  DEFAULT_FOLLOW_DIRECT_TEXT,
  DEFAULT_FOLLOW_OPTIONAL_TEXT,
} from "@/lib/automation-defaults";
import { isFollowMode, type FollowMode } from "@/lib/follow-mode";

export type PreviewValues = {
  firstDmText: string;
  firstDmButtonLabel: string;
  secondDmText: string;
  linkButtonTitle: string;
  followMode: FollowMode;
  followDirectText: string;
  followOptionalText: string;
};

const PREVIEW_DEFAULTS: PreviewValues = {
  firstDmText: "",
  firstDmButtonLabel: "",
  secondDmText: "",
  linkButtonTitle: "Abrir link",
  followMode: "off",
  followDirectText: DEFAULT_FOLLOW_DIRECT_TEXT,
  followOptionalText: DEFAULT_FOLLOW_OPTIONAL_TEXT,
};

export function previewOf(initial?: AutomationInitialValues): PreviewValues {
  return { ...PREVIEW_DEFAULTS, ...initial };
}

function fieldText(data: FormData, field: string): string {
  const value = data.get(field);
  return typeof value === "string" ? value : "";
}

export function previewFromForm(data: FormData): PreviewValues {
  const mode = fieldText(data, "followMode");
  return {
    ...PREVIEW_DEFAULTS,
    firstDmText: fieldText(data, "firstDmText"),
    firstDmButtonLabel: fieldText(data, "firstDmButtonLabel"),
    secondDmText: fieldText(data, "secondDmText"),
    linkButtonTitle: fieldText(data, "linkButtonTitle"),
    followMode: isFollowMode(mode) ? mode : "off",
    followDirectText: fieldText(data, "followDirectText"),
    followOptionalText: fieldText(data, "followOptionalText"),
  };
}

/** Texto que a segunda DM realmente usa em cada modo. */
export function secondText(values: PreviewValues): string {
  if (values.followMode === "direct") return values.followDirectText;
  if (values.followMode === "optional") return values.followOptionalText;
  return values.secondDmText;
}

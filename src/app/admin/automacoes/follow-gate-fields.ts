/** Campos ocultos que preservam o texto dos modos não escolhidos (sem JSX). */

import type { AutomationInitialValues } from "@/app/admin/automacoes/form-types";
import {
  DEFAULT_CONFIRM_LABEL,
  DEFAULT_FOLLOW_DIRECT_TEXT,
  DEFAULT_FOLLOW_GATE_TEXT,
  DEFAULT_FOLLOW_LABEL,
  DEFAULT_FOLLOW_OPTIONAL_TEXT,
} from "@/lib/automation-defaults";
import type { FollowMode } from "@/lib/follow-mode";

export type HiddenField = { name: string; value: string };

function pick(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

/**
 * Campos dos outros modos continuam sendo enviados para não perder o texto já
 * personalizado ao trocar de modo.
 */
export function hiddenFollowModeFields(
  initial: AutomationInitialValues | undefined,
  followMode: FollowMode,
  needsCheck: boolean,
  needsFollowButton: boolean,
): HiddenField[] {
  const gateFields: HiddenField[] = needsCheck
    ? []
    : [
        {
          name: "followGateText",
          value: pick(initial?.followGateText, DEFAULT_FOLLOW_GATE_TEXT),
        },
        {
          name: "followGateConfirmLabel",
          value: pick(initial?.followGateConfirmLabel, DEFAULT_CONFIRM_LABEL),
        },
      ];

  return [
    ...gateFields,
    ...(followMode === "optional"
      ? []
      : [
          {
            name: "followOptionalText",
            value: pick(
              initial?.followOptionalText,
              DEFAULT_FOLLOW_OPTIONAL_TEXT,
            ),
          },
        ]),
    ...(followMode === "direct"
      ? []
      : [
          {
            name: "followDirectText",
            value: pick(initial?.followDirectText, DEFAULT_FOLLOW_DIRECT_TEXT),
          },
        ]),
    ...(needsFollowButton
      ? []
      : [
          {
            name: "followGateFollowLabel",
            value: pick(initial?.followGateFollowLabel, DEFAULT_FOLLOW_LABEL),
          },
        ]),
  ];
}

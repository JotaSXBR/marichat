"use client";

import { useActionState, useState } from "react";

import { saveAutomation } from "@/app/admin/actions";
import { FollowGateSection } from "@/app/admin/automacoes/follow-gate-section";
import { FormActions } from "@/app/admin/automacoes/form-actions";
import type {
  AutomationInitialValues,
  MediaOption,
} from "@/app/admin/automacoes/form-types";
import { IdentificationSection } from "@/app/admin/automacoes/identification-section";
import {
  FirstMessageSection,
  LinkMessageSection,
} from "@/app/admin/automacoes/message-sections";
import { MediaSection } from "@/app/admin/automacoes/media-section";
import type { AutomationFormState } from "@/lib/automation-input";
import type { FollowMode } from "@/lib/follow-mode";

export type { AutomationInitialValues, MediaOption };

export function AutomationForm({
  initial,
  mediaOptions,
  mediaError,
}: {
  initial?: AutomationInitialValues;
  mediaOptions: MediaOption[];
  mediaError?: string;
}) {
  const [state, formAction, pending] = useActionState<
    AutomationFormState | undefined,
    FormData
  >(saveAutomation, undefined);

  const errors = state?.fieldErrors ?? {};
  const [followMode, setFollowMode] = useState<FollowMode>(
    initial?.followMode ?? "off",
  );
  const needsCheck = followMode === "soft" || followMode === "locked";
  const needsFollowButton = needsCheck || followMode === "optional";

  return (
    <form action={formAction} className="space-y-8">
      {initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      {state?.error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {state.error}
        </div>
      ) : null}

      <IdentificationSection initial={initial} errors={errors} />
      <MediaSection
        initial={initial}
        errors={errors}
        mediaOptions={mediaOptions}
        mediaError={mediaError}
      />
      <FirstMessageSection initial={initial} errors={errors} />
      <FollowGateSection
        initial={initial}
        errors={errors}
        followMode={followMode}
        onFollowModeChange={setFollowMode}
        needsCheck={needsCheck}
        needsFollowButton={needsFollowButton}
      />
      <LinkMessageSection initial={initial} errors={errors} />

      <FormActions pending={pending} />
    </form>
  );
}

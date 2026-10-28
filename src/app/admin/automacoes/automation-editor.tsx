"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";

import { saveAutomation } from "@/app/admin/actions";
import {
  DmPreview,
  type PreviewValues,
} from "@/app/admin/automacoes/dm-preview";
import { FollowGateSection } from "@/app/admin/automacoes/follow-gate-section";
import type {
  AutomationInitialValues,
  FieldErrors,
  MediaOption,
} from "@/app/admin/automacoes/form-types";
import { IdentificationSection } from "@/app/admin/automacoes/identification-section";
import { MediaSection } from "@/app/admin/automacoes/media-section";
import {
  FirstMessageSection,
  LinkMessageSection,
  PublicReplySection,
} from "@/app/admin/automacoes/message-sections";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import {
  DEFAULT_FOLLOW_DIRECT_TEXT,
  DEFAULT_FOLLOW_OPTIONAL_TEXT,
} from "@/lib/automation-defaults";
import type { AutomationFormState } from "@/lib/automation-input";
import { isFollowMode, type FollowMode } from "@/lib/follow-mode";

const AUTOMATIONS_PATH = "/admin/automacoes";
const FORM_ID = "automation-form";

type Props = {
  initial?: AutomationInitialValues;
  mediaOptions: MediaOption[];
  mediaError?: string;
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

function previewOf(initial?: AutomationInitialValues): PreviewValues {
  return { ...PREVIEW_DEFAULTS, ...initial };
}

function fieldText(data: FormData, field: string): string {
  const value = data.get(field);
  return typeof value === "string" ? value : "";
}

function previewFromForm(data: FormData): PreviewValues {
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

/** R2: voltar, situação e a ação primária. */
function EditorHeader({
  isEditing,
  isActive,
  pending,
  onBack,
}: {
  isEditing: boolean;
  isActive: boolean;
  pending: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-display text-foreground text-balance">
            {isEditing ? "Editar automação" : "Nova automação"}
          </h1>
          <StatusChip tone={isActive ? "success" : "neutral"}>
            {isActive ? "Ativa" : "Desativada"}
          </StatusChip>
        </div>
        <p className="max-w-2xl text-body text-muted-foreground">
          {isEditing
            ? "O texto da primeira DM fica congelado no comentário; a porta de seguidor e os textos do link valem para os próximos envios."
            : "Defina o comentário que dispara a conversa e as duas mensagens."}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          className="h-12 md:h-10"
          type="button"
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeftIcon aria-hidden />
          Voltar
        </Button>
        <Button
          type="submit"
          className="hidden md:inline-flex"
          form={FORM_ID}
          loading={pending}
        >
          Salvar automação
        </Button>
      </div>
    </div>
  );
}

type FieldsProps = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
  formAction: (formData: FormData) => void;
  onInput: (event: FormEvent<HTMLFormElement>) => void;
  followMode: FollowMode;
  onFollowModeChange: (mode: FollowMode) => void;
  isActive: boolean;
  onIsActiveChange: (checked: boolean) => void;
  mediaOptions: MediaOption[];
  mediaError?: string;
  error?: string;
};

/** R4: os blocos do formulário. */
function EditorFields({ error, ...props }: FieldsProps) {
  const needsCheck =
    props.followMode === "soft" || props.followMode === "locked";
  const needsFollowButton = needsCheck || props.followMode === "optional";

  return (
    <form
      id={FORM_ID}
      action={props.formAction}
      onInput={props.onInput}
      className="space-y-4"
    >
      {props.initial?.id ? (
        <input type="hidden" name="id" value={props.initial.id} />
      ) : null}

      {error ? (
        <Alert variant="danger">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Não foi possível salvar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <IdentificationSection
        initial={props.initial}
        errors={props.errors}
        isActive={props.isActive}
        onIsActiveChange={props.onIsActiveChange}
      />
      <MediaSection
        initial={props.initial}
        errors={props.errors}
        mediaOptions={props.mediaOptions}
        mediaError={props.mediaError}
      />
      <PublicReplySection initial={props.initial} errors={props.errors} />
      <FirstMessageSection initial={props.initial} errors={props.errors} />
      <FollowGateSection
        initial={props.initial}
        errors={props.errors}
        followMode={props.followMode}
        onFollowModeChange={props.onFollowModeChange}
        needsCheck={needsCheck}
        needsFollowButton={needsFollowButton}
      />
      <LinkMessageSection initial={props.initial} errors={props.errors} />
    </form>
  );
}

function DiscardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
          <AlertDialogDescription>
            O que você digitou desde o último salvamento será perdido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuar editando</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => router.push(AUTOMATIONS_PATH)}
          >
            Descartar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Avisa o navegador ao fechar a aba com alterações não salvas. */
function useUnsavedWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

export function AutomationEditor({ initial, mediaOptions, mediaError }: Props) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<
    AutomationFormState | undefined,
    FormData
  >(saveAutomation, undefined);

  const [followMode, setFollowMode] = useState<FollowMode>(
    initial?.followMode ?? "off",
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [preview, setPreview] = useState<PreviewValues>(previewOf(initial));
  const [dirty, setDirty] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useUnsavedWarning(dirty);

  // A prévia é leve: atualiza a cada tecla em vez de esperar 300 ms.
  function handleInput(event: FormEvent<HTMLFormElement>) {
    setDirty(true);
    setPreview(previewFromForm(new FormData(event.currentTarget)));
  }

  function goBack() {
    if (dirty) setConfirming(true);
    else router.push(AUTOMATIONS_PATH);
  }

  return (
    <div className="space-y-6">
      <EditorHeader
        isEditing={Boolean(initial?.id)}
        isActive={isActive}
        pending={pending}
        onBack={goBack}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <EditorFields
          initial={initial}
          errors={state?.fieldErrors ?? {}}
          formAction={formAction}
          onInput={handleInput}
          followMode={followMode}
          onFollowModeChange={setFollowMode}
          isActive={isActive}
          onIsActiveChange={(checked) => {
            setIsActive(checked);
            setDirty(true);
          }}
          mediaOptions={mediaOptions}
          mediaError={mediaError}
          error={state?.error}
        />

        <aside className="xl:sticky xl:top-24">
          <DmPreview values={preview} />
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background p-3 md:hidden">
        <Button
          className="w-full"
          form={FORM_ID}
          loading={pending}
          size="lg"
          type="submit"
        >
          Salvar automação
        </Button>
      </div>

      <DiscardDialog open={confirming} onOpenChange={setConfirming} />
    </div>
  );
}

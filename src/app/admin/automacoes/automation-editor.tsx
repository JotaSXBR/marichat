"use client";

import { useActionState, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, TriangleAlertIcon } from "lucide-react";

import { saveAutomation } from "@/app/admin/actions";
import { DmPreview } from "@/app/admin/automacoes/dm-preview";
import { FollowGateSection } from "@/app/admin/automacoes/follow-gate-section";
import type {
  AutomationInitialValues,
  FieldErrors,
  MediaOption,
} from "@/app/admin/automacoes/form-types";
import {
  previewFromForm,
  previewOf,
  type PreviewValues,
} from "@/app/admin/automacoes/preview";
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
import type { AutomationFormState } from "@/lib/automation-input";
import type { FollowMode } from "@/lib/follow-mode";

const AUTOMATIONS_PATH = "/admin/automacoes";
const FORM_ID = "automation-form";

type Props = {
  initial?: AutomationInitialValues;
  mediaOptions: MediaOption[];
  mediaError?: string;
};

/** R2: voltar, situação e a ação primária. */
function EditorHeader({
  isEditing,
  dirty,
  pending,
  onBack,
}: {
  isEditing: boolean;
  dirty: boolean;
  pending: boolean;
  onBack: () => void;
}) {
  return (
    <div>
      <button
        className="flex min-h-11 items-center gap-2 text-label text-muted-foreground hover:text-foreground"
        onClick={onBack}
        type="button"
      >
        <ArrowLeftIcon aria-hidden className="size-3.5" />
        Automações
      </button>

      <div className="mt-1 flex items-start gap-6 border-b border-border pb-5">
        <div className="min-w-0">
          <h1 className="text-display text-foreground text-balance">
            {isEditing ? "Editar automação" : "Nova automação"}
          </h1>
          <p className="mt-2 font-mono text-mono text-muted-foreground">
            {isEditing
              ? dirty
                ? "alterações não salvas"
                : "salva"
              : "rascunho · nada foi salvo ainda"}
          </p>
        </div>

        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex">
          <Button
            className="h-10"
            type="button"
            variant="secondary"
            onClick={onBack}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="h-10"
            form={FORM_ID}
            loading={pending}
          >
            Salvar automação
          </Button>
        </div>
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
    <form id={FORM_ID} action={props.formAction} onInput={props.onInput}>
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

/** Ação de salvar na zona do polegar, acima das abas (§4). */
function EditorSaveBar({ pending }: { pending: boolean }) {
  return (
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
  );
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
        dirty={dirty}
        isEditing={Boolean(initial?.id)}
        pending={pending}
        onBack={goBack}
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start xl:gap-12">
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

        <aside className="min-w-0 xl:sticky xl:top-20">
          <DmPreview values={preview} />
        </aside>
      </div>

      <EditorSaveBar pending={pending} />

      <DiscardDialog open={confirming} onOpenChange={setConfirming} />
    </div>
  );
}

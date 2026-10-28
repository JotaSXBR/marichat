import {
  FieldError,
  FormSection,
  Label,
} from "@/app/admin/automacoes/form-controls";
import type {
  AutomationInitialValues,
  FieldErrors,
} from "@/app/admin/automacoes/form-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_CONFIRM_LABEL,
  DEFAULT_FOLLOW_DIRECT_TEXT,
  DEFAULT_FOLLOW_GATE_TEXT,
  DEFAULT_FOLLOW_LABEL,
  DEFAULT_FOLLOW_OPTIONAL_TEXT,
} from "@/lib/automation-defaults";
import {
  FOLLOW_MODES,
  FOLLOW_MODE_LABELS,
  type FollowMode,
} from "@/lib/follow-mode";
import { cn } from "@/lib/utils";
import { ShieldAlertIcon } from "lucide-react";

type Props = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
  followMode: FollowMode;
  onFollowModeChange: (mode: FollowMode) => void;
  needsCheck: boolean;
  needsFollowButton: boolean;
};

function FollowModeOptions({
  followMode,
  onFollowModeChange,
}: Pick<Props, "followMode" | "onFollowModeChange">) {
  return (
    <div>
      {FOLLOW_MODES.map((mode) => {
        const option = FOLLOW_MODE_LABELS[mode];
        const selected = followMode === mode;
        return (
          <label
            key={mode}
            className={cn(
              "flex cursor-pointer items-start gap-3 border-b border-line-subtle py-3 transition-colors duration-150 ease-out last:border-b-0 hover:bg-surface-hover",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <input
              type="radio"
              name="followMode"
              value={mode}
              checked={selected}
              onChange={() => onFollowModeChange(mode)}
              className="mt-1 size-3.5 shrink-0 accent-foreground"
            />
            <span>
              <span className="block text-[0.875rem] font-medium text-foreground">
                {option.title}
              </span>
              <span className="block text-[0.8125rem] leading-5 text-muted-soft">
                {option.description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

type HiddenField = { name: string; value: string };

function pick(value: string | undefined, fallback: string): string {
  return value ?? fallback;
}

/**
 * Campos dos outros modos continuam sendo enviados para não perder o texto já
 * personalizado ao trocar de modo.
 */
function hiddenFields(
  initial: Props["initial"],
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

function HiddenModeValues({
  initial,
  followMode,
  needsCheck,
  needsFollowButton,
}: Props) {
  return (
    <>
      {hiddenFields(initial, followMode, needsCheck, needsFollowButton).map(
        (field) => (
          <input
            key={field.name}
            type="hidden"
            name={field.name}
            defaultValue={field.value}
          />
        ),
      )}
    </>
  );
}

function GateTextField({
  initial,
  errors,
  locked,
}: Pick<Props, "initial" | "errors"> & { locked: boolean }) {
  return (
    <div>
      <Label
        htmlFor="followGateText"
        hint={
          locked
            ? "Até 640 bytes. A mensagem continua sendo reenviada enquanto a Meta não confirmar o follow."
            : "Até 640 bytes. Mensagem com os botões “Seguir agora” e “Já segui”."
        }
      >
        Mensagem do pedido para seguir
      </Label>
      <Textarea
        id="followGateText"
        name="followGateText"
        rows={3}
        defaultValue={initial?.followGateText ?? DEFAULT_FOLLOW_GATE_TEXT}
        aria-invalid={errors.followGateText ? true : undefined}
      />
      <FieldError message={errors.followGateText} />
    </div>
  );
}

function OptionalTextField({
  initial,
  errors,
}: Pick<Props, "initial" | "errors">) {
  return (
    <div>
      <Label
        htmlFor="followOptionalText"
        hint="Até 640 bytes. A mensagem tem dois botões: seguir o perfil e abrir o link."
      >
        Mensagem do convite (com o link)
      </Label>
      <Textarea
        id="followOptionalText"
        name="followOptionalText"
        rows={3}
        defaultValue={
          initial?.followOptionalText ?? DEFAULT_FOLLOW_OPTIONAL_TEXT
        }
        aria-invalid={errors.followOptionalText ? true : undefined}
      />
      <FieldError message={errors.followOptionalText} />
    </div>
  );
}

function DirectTextField({
  initial,
  errors,
}: Pick<Props, "initial" | "errors">) {
  return (
    <div>
      <Label
        htmlFor="followDirectText"
        hint="Até 640 bytes. O texto acompanha o único botão do link."
      >
        Mensagem com o link e o aviso
      </Label>
      <Textarea
        id="followDirectText"
        name="followDirectText"
        rows={3}
        defaultValue={initial?.followDirectText ?? DEFAULT_FOLLOW_DIRECT_TEXT}
        aria-invalid={errors.followDirectText ? true : undefined}
      />
      <FieldError message={errors.followDirectText} />
    </div>
  );
}

function FollowLabelsFields({
  initial,
  errors,
  needsCheck,
}: Pick<Props, "initial" | "errors" | "needsCheck">) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="followGateFollowLabel" hint="Até 20 caracteres.">
          Botão para seguir
        </Label>
        <Input
          id="followGateFollowLabel"
          name="followGateFollowLabel"
          maxLength={20}
          defaultValue={initial?.followGateFollowLabel ?? DEFAULT_FOLLOW_LABEL}
          aria-invalid={errors.followGateFollowLabel ? true : undefined}
        />
        <FieldError message={errors.followGateFollowLabel} />
      </div>
      {needsCheck ? (
        <div>
          <Label htmlFor="followGateConfirmLabel" hint="Até 20 caracteres.">
            Botão de confirmação
          </Label>
          <Input
            id="followGateConfirmLabel"
            name="followGateConfirmLabel"
            maxLength={20}
            defaultValue={
              initial?.followGateConfirmLabel ?? DEFAULT_CONFIRM_LABEL
            }
            aria-invalid={errors.followGateConfirmLabel ? true : undefined}
          />
          <FieldError message={errors.followGateConfirmLabel} />
        </div>
      ) : null}
    </div>
  );
}

/** Modos da porta de seguidor e campos dependentes do modo escolhido. */
export function FollowGateSection(props: Props) {
  const { initial, errors, followMode, needsCheck, needsFollowButton } = props;

  return (
    <FormSection
      title="Porta de seguidor"
      description="Como o link é entregue depois que a pessoa responde à primeira mensagem. A consulta ao perfil só acontece depois que ela envia uma mensagem, como a Meta exige."
    >
      <FollowModeOptions
        followMode={followMode}
        onFollowModeChange={props.onFollowModeChange}
      />

      <HiddenModeValues {...props} />

      {needsCheck ? (
        <GateTextField
          initial={initial}
          errors={errors}
          locked={followMode === "locked"}
        />
      ) : null}

      {followMode === "optional" ? (
        <OptionalTextField initial={initial} errors={errors} />
      ) : null}

      {followMode === "direct" ? (
        <DirectTextField initial={initial} errors={errors} />
      ) : null}

      {needsFollowButton ? (
        <FollowLabelsFields
          initial={initial}
          errors={errors}
          needsCheck={needsCheck}
        />
      ) : null}

      {followMode === "locked" ? (
        <Alert variant="warning">
          <ShieldAlertIcon aria-hidden />
          <AlertTitle>Modo travado</AlertTitle>
          <AlertDescription>
            Quem não for confirmado como seguidor não recebe o link. Se a Meta
            não informar o status (por exemplo, por falta de consentimento), a
            conversa permanece retida até a janela de 24h expirar.
          </AlertDescription>
        </Alert>
      ) : null}
    </FormSection>
  );
}

import { FieldError, Label } from "@/app/admin/automacoes/form-controls";
import type {
  AutomationInitialValues,
  FieldErrors,
} from "@/app/admin/automacoes/form-types";
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
    <div className="space-y-2">
      {FOLLOW_MODES.map((mode) => {
        const option = FOLLOW_MODE_LABELS[mode];
        const selected = followMode === mode;
        return (
          <label
            key={mode}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
              selected
                ? "border-zinc-900 bg-zinc-50"
                : "border-zinc-200 hover:bg-zinc-50"
            }`}
          >
            <input
              type="radio"
              name="followMode"
              value={mode}
              checked={selected}
              onChange={() => onFollowModeChange(mode)}
              className="mt-1"
            />
            <span>
              <span className="block font-medium">{option.title}</span>
              <span className="block text-xs text-zinc-500">
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
      <textarea
        id="followGateText"
        name="followGateText"
        rows={3}
        defaultValue={initial?.followGateText ?? DEFAULT_FOLLOW_GATE_TEXT}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
      <textarea
        id="followOptionalText"
        name="followOptionalText"
        rows={3}
        defaultValue={
          initial?.followOptionalText ?? DEFAULT_FOLLOW_OPTIONAL_TEXT
        }
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
      <textarea
        id="followDirectText"
        name="followDirectText"
        rows={3}
        defaultValue={initial?.followDirectText ?? DEFAULT_FOLLOW_DIRECT_TEXT}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
        <input
          id="followGateFollowLabel"
          name="followGateFollowLabel"
          maxLength={20}
          defaultValue={initial?.followGateFollowLabel ?? DEFAULT_FOLLOW_LABEL}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <FieldError message={errors.followGateFollowLabel} />
      </div>
      {needsCheck ? (
        <div>
          <Label htmlFor="followGateConfirmLabel" hint="Até 20 caracteres.">
            Botão de confirmação
          </Label>
          <input
            id="followGateConfirmLabel"
            name="followGateConfirmLabel"
            maxLength={20}
            defaultValue={
              initial?.followGateConfirmLabel ?? DEFAULT_CONFIRM_LABEL
            }
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
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
    <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold">Porta de seguidor</h2>
        <p className="text-xs text-zinc-500">
          Escolha como o link é entregue depois que a pessoa responde à primeira
          mensagem. A consulta ao perfil só acontece depois que ela envia uma
          mensagem, como a Meta exige.
        </p>
      </div>

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
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          No modo travado, quem não for confirmado como seguidor não recebe o
          link. Se a Meta não informar o status (por exemplo, por falta de
          consentimento), a conversa permanece retida até a janela de 24h
          expirar. As checagens são limitadas para não insistir com a Meta.
        </p>
      ) : null}
    </section>
  );
}

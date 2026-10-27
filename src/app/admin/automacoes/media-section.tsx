import {
  FieldError,
  FormSection,
  Label,
} from "@/app/admin/automacoes/form-controls";
import type {
  AutomationInitialValues,
  FieldErrors,
  MediaOption,
} from "@/app/admin/automacoes/form-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { TriangleAlertIcon } from "lucide-react";

type Props = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
  mediaOptions: MediaOption[];
  mediaError?: string;
};

const OPTION_CLASS =
  "flex cursor-pointer items-start gap-3 rounded-md border border-line-subtle p-3 transition-colors duration-150 ease-out hover:bg-surface-hover has-checked:border-line-strong has-checked:bg-surface-hover";

function MediaThumbnail({ option }: { option: MediaOption }) {
  if (!option.thumbnailUrl) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-micro text-muted-soft">
        sem foto
      </span>
    );
  }

  return (
    // Imagem hospedada pela Meta; usamos <img> para não precisar liberar
    // domínios dinâmicos no otimizador.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={option.thumbnailUrl}
      alt=""
      loading="lazy"
      className="size-10 shrink-0 rounded-md object-cover"
    />
  );
}

function MediaOptionList({
  initial,
  mediaOptions,
}: Pick<Props, "initial" | "mediaOptions">) {
  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      <label className={OPTION_CLASS}>
        <input
          type="radio"
          name="mediaId"
          value=""
          defaultChecked={!initial?.mediaId}
          className="mt-1"
        />
        <span>
          <span className="block text-label font-medium text-foreground">
            Qualquer publicação
          </span>
          <span className="block text-label text-muted-foreground">
            Responde a comentários em qualquer post ou reel.
          </span>
        </span>
      </label>

      {mediaOptions.map((option) => (
        <label key={option.id} className={OPTION_CLASS}>
          <input
            type="radio"
            name="mediaId"
            value={option.id}
            defaultChecked={initial?.mediaId === option.id}
            className="mt-1"
          />
          <MediaThumbnail option={option} />
          <span className="min-w-0">
            <span className="block truncate text-label text-foreground">
              {option.label}
            </span>
            <span className="block font-mono text-mono text-muted-soft">
              {option.id}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

function MediaIdField({ initial, errors }: Pick<Props, "initial" | "errors">) {
  return (
    <div>
      <Label htmlFor="mediaId" hint="Deixe em branco para qualquer publicação.">
        ID da publicação (opcional)
      </Label>
      <Input
        id="mediaId"
        name="mediaId"
        defaultValue={initial?.mediaId ?? ""}
        className="font-mono"
        placeholder="Ex.: 17895695668004550"
        aria-invalid={errors.mediaId ? true : undefined}
      />
      <FieldError message={errors.mediaId} />
    </div>
  );
}

/** Escolha do post (lista da API ou ID manual). */
export function MediaSection({
  initial,
  errors,
  mediaOptions,
  mediaError,
}: Props) {
  return (
    <FormSection
      title="Publicação"
      description="Escolha uma publicação específica ou responda a comentários em qualquer uma."
    >
      {mediaError ? (
        <Alert variant="warning">
          <TriangleAlertIcon aria-hidden />
          <AlertTitle>Lista de publicações indisponível</AlertTitle>
          <AlertDescription>
            {mediaError} Você ainda pode salvar usando o ID da publicação
            abaixo.
          </AlertDescription>
        </Alert>
      ) : null}

      {mediaOptions.length > 0 ? (
        <MediaOptionList initial={initial} mediaOptions={mediaOptions} />
      ) : (
        <MediaIdField initial={initial} errors={errors} />
      )}
    </FormSection>
  );
}

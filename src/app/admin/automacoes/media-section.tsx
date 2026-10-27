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
import { ImageIcon, LayoutGridIcon, TriangleAlertIcon } from "lucide-react";

type Props = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
  mediaOptions: MediaOption[];
  mediaError?: string;
};

const CARD_CLASS =
  "group relative block cursor-pointer overflow-hidden rounded-md border border-line-subtle transition-colors duration-150 ease-out hover:border-line-strong focus-within:ring-2 focus-within:ring-ring has-checked:border-ring has-checked:ring-2 has-checked:ring-ring";

function Thumbnail({ option }: { option: MediaOption }) {
  if (!option.thumbnailUrl) {
    return (
      <span className="flex aspect-[4/5] w-full items-center justify-center bg-muted text-muted-soft">
        <ImageIcon aria-hidden className="size-5" />
        <span className="sr-only">Sem foto de capa</span>
      </span>
    );
  }

  return (
    // Imagem hospedada pela Meta ou pela Zernio; usamos <img> para não
    // precisar liberar domínios dinâmicos no otimizador.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={option.thumbnailUrl}
      alt=""
      loading="lazy"
      className="aspect-[4/5] w-full bg-muted object-cover"
    />
  );
}

function AnyPostOption({ initial }: Pick<Props, "initial">) {
  return (
    <label className={`${CARD_CLASS} flex items-start gap-3 p-3`}>
      <input
        type="radio"
        name="mediaId"
        value=""
        defaultChecked={!initial?.mediaId}
        className="mt-1"
      />
      <LayoutGridIcon aria-hidden className="mt-0.5 size-5 text-muted-soft" />
      <span className="min-w-0">
        <span className="block text-label font-medium text-foreground">
          Qualquer publicação
        </span>
        <span className="block text-label text-muted-foreground">
          Responde a comentários em qualquer post ou reel, inclusive nos que
          forem publicados depois.
        </span>
      </span>
    </label>
  );
}

function MediaOptionCard({
  option,
  checked,
}: {
  option: MediaOption;
  checked: boolean;
}) {
  return (
    <label className={CARD_CLASS}>
      <input
        type="radio"
        name="mediaId"
        value={option.id}
        defaultChecked={checked}
        className="sr-only"
      />
      <Thumbnail option={option} />
      <span className="block space-y-1 p-2">
        <span className="line-clamp-2 block text-label text-foreground">
          {option.label}
        </span>
        <span className="block truncate font-mono text-micro text-muted-soft">
          {option.id}
        </span>
      </span>
    </label>
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

/** Escolha do post (grade da API ou ID manual). */
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
        <div className="space-y-3">
          <AnyPostOption initial={initial} />
          <div className="max-h-[30rem] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {mediaOptions.map((option) => (
                <MediaOptionCard
                  key={option.id}
                  option={option}
                  checked={initial?.mediaId === option.id}
                />
              ))}
            </div>
          </div>
          <p className="text-label text-muted-foreground">
            Publicação que não aparece na lista? Salve com o ID abaixo.
          </p>
          <details className="rounded-md border border-line-subtle p-3">
            <summary className="cursor-pointer text-label text-muted-foreground">
              Informar o ID manualmente
            </summary>
            <div className="pt-3">
              <MediaIdField initial={initial} errors={errors} />
            </div>
          </details>
        </div>
      ) : (
        <MediaIdField initial={initial} errors={errors} />
      )}
    </FormSection>
  );
}

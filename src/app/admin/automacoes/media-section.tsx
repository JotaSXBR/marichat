import { FieldError, Label } from "@/app/admin/automacoes/form-controls";
import type {
  AutomationInitialValues,
  FieldErrors,
  MediaOption,
} from "@/app/admin/automacoes/form-types";

type Props = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
  mediaOptions: MediaOption[];
  mediaError?: string;
};

function MediaThumbnail({ option }: { option: MediaOption }) {
  if (!option.thumbnailUrl) {
    return (
      <span className="flex h-12 w-12 items-center justify-center rounded bg-zinc-100 text-[10px] text-zinc-500">
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
      className="h-12 w-12 rounded object-cover"
    />
  );
}

function MediaOptionList({
  initial,
  mediaOptions,
}: Pick<Props, "initial" | "mediaOptions">) {
  return (
    <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
        <input
          type="radio"
          name="mediaId"
          value=""
          defaultChecked={!initial?.mediaId}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-medium">Qualquer publicação</span>
          <span className="block text-xs text-zinc-500">
            Responde a comentários em qualquer post ou reel.
          </span>
        </span>
      </label>

      {mediaOptions.map((option) => (
        <label
          key={option.id}
          className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50"
        >
          <input
            type="radio"
            name="mediaId"
            value={option.id}
            defaultChecked={initial?.mediaId === option.id}
            className="mt-1"
          />
          <MediaThumbnail option={option} />
          <span className="min-w-0">
            <span className="block truncate text-sm">{option.label}</span>
            <span className="block font-mono text-[11px] text-zinc-500">
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
      <input
        id="mediaId"
        name="mediaId"
        defaultValue={initial?.mediaId ?? ""}
        className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
        placeholder="Ex.: 17895695668004550"
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
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold">Publicação</h2>
        <p className="text-xs text-zinc-500">
          Escolha uma publicação específica ou responda a qualquer publicação.
          Vídeos usam a miniatura fornecida pela API.
        </p>
      </div>

      {mediaError ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Não foi possível carregar a lista de publicações agora: {mediaError}
          <span className="mt-1 block">
            Você ainda pode salvar usando o ID da publicação abaixo.
          </span>
        </div>
      ) : null}

      {mediaOptions.length > 0 ? (
        <MediaOptionList initial={initial} mediaOptions={mediaOptions} />
      ) : (
        <MediaIdField initial={initial} errors={errors} />
      )}
    </section>
  );
}

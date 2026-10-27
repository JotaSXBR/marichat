import { FieldError, Label } from "@/app/admin/automacoes/form-controls";
import type {
  AutomationInitialValues,
  FieldErrors,
} from "@/app/admin/automacoes/form-types";

type Props = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
};

/** Nome, palavra-chave e situação da automação. */
export function IdentificationSection({ initial, errors }: Props) {
  return (
    <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-semibold">Identificação</h2>

      <div>
        <Label htmlFor="name" hint="Uso interno; não aparece para o seguidor.">
          Nome da automação
        </Label>
        <input
          id="name"
          name="name"
          defaultValue={initial?.name ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Ex.: Link do ebook — post de outubro"
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <Label
          htmlFor="keyword"
          hint="A comparação ignora maiúsculas, acentos e pontuação. A palavra precisa aparecer inteira."
        >
          Palavra-chave no comentário
        </Label>
        <input
          id="keyword"
          name="keyword"
          defaultValue={initial?.keyword ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Ex.: Quero"
        />
        <FieldError message={errors.keyword} />
      </div>

      <div>
        <Label htmlFor="isActive">Situação</Label>
        <label className="flex items-center gap-2 text-sm">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            defaultChecked={initial?.isActive ?? true}
            className="h-4 w-4"
          />
          Ativa (responde a novos comentários)
        </label>
      </div>
    </section>
  );
}

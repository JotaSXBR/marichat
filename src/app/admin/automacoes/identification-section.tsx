import {
  FieldError,
  FormSection,
  Label,
} from "@/app/admin/automacoes/form-controls";
import type {
  AutomationInitialValues,
  FieldErrors,
} from "@/app/admin/automacoes/form-types";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Props = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
  isActive: boolean;
  onIsActiveChange: (checked: boolean) => void;
};

/** Chave liga/desliga da automação; o estado também aparece no chip do topo. */
function ActiveToggle({
  isActive,
  onIsActiveChange,
}: Pick<Props, "isActive" | "onIsActiveChange">) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-line-subtle px-3 py-3">
      <div>
        <p className="text-label font-medium text-foreground">Ativa</p>
        <p className="text-label text-muted-foreground">
          Responde a novos comentários agora.
        </p>
      </div>
      <Switch
        name="isActive"
        value="on"
        checked={isActive}
        onCheckedChange={onIsActiveChange}
        aria-label="Automação ativa"
      />
    </div>
  );
}

/** Nome, palavra-chave e situação da automação. */
export function IdentificationSection({
  initial,
  errors,
  isActive,
  onIsActiveChange,
}: Props) {
  return (
    <FormSection
      title="Identificação"
      description="O nome é interno; a palavra-chave é o que a pessoa precisa comentar."
    >
      <div>
        <Label htmlFor="name" hint="Uso interno; não aparece para o seguidor.">
          Nome da automação
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name ?? ""}
          placeholder="Ex.: Link do ebook no post de outubro"
          aria-invalid={errors.name ? true : undefined}
        />
        <FieldError message={errors.name} />
      </div>

      <div>
        <Label
          htmlFor="keyword"
          hint="Ignora maiúsculas, acentos e pontuação. A palavra precisa aparecer inteira."
        >
          Palavra-chave no comentário
        </Label>
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-mono text-muted-soft">
            #
          </span>
          <Input
            id="keyword"
            name="keyword"
            defaultValue={initial?.keyword ?? ""}
            className="font-mono"
            placeholder="Ex.: quero"
            aria-invalid={errors.keyword ? true : undefined}
          />
        </div>
        <FieldError message={errors.keyword} />
      </div>

      <ActiveToggle isActive={isActive} onIsActiveChange={onIsActiveChange} />
    </FormSection>
  );
}

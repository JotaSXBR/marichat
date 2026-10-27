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
import { TriangleAlertIcon } from "lucide-react";

type Props = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
};

/** Primeira DM, enviada como resposta privada ao comentário. */
export function FirstMessageSection({ initial, errors }: Props) {
  return (
    <FormSection
      title="Primeira mensagem (privada)"
      description="Sai como resposta privada ao comentário. A Meta permite uma resposta por comentário, em até 7 dias."
    >
      <div>
        <Label
          htmlFor="firstDmText"
          hint="Até 1.000 bytes. Peça uma resposta, por exemplo: “Responda esta mensagem para eu enviar o link”."
        >
          Texto da DM
        </Label>
        <Textarea
          id="firstDmText"
          name="firstDmText"
          rows={4}
          defaultValue={initial?.firstDmText ?? ""}
          placeholder="Ex.: Que bom que você se interessou! Toque no botão abaixo que eu envio o link."
          aria-invalid={errors.firstDmText ? true : undefined}
        />
        <FieldError message={errors.firstDmText} />
      </div>

      <div>
        <Label
          htmlFor="firstDmButtonLabel"
          hint="Até 20 caracteres. Em branco = mensagem sem botão."
        >
          Botão da primeira mensagem (opcional)
        </Label>
        <Input
          id="firstDmButtonLabel"
          name="firstDmButtonLabel"
          maxLength={20}
          defaultValue={initial?.firstDmButtonLabel ?? ""}
          placeholder="Ex.: Quero o link"
          aria-invalid={errors.firstDmButtonLabel ? true : undefined}
        />
        <FieldError message={errors.firstDmButtonLabel} />
      </div>

      <Alert variant="warning">
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>O botão não é garantido para quem não segue</AlertTitle>
        <AlertDescription>
          Um toque no botão já dispara a segunda mensagem, sem a pessoa digitar.
          Mas a Meta pode recusar botões para quem não segue o perfil, e a
          recusa gasta a única resposta privada daquele comentário — a pessoa
          não recebe nada. Só use se a maioria de quem comenta já segue a conta.
        </AlertDescription>
      </Alert>
    </FormSection>
  );
}

/** Segunda mensagem: o link com botão. */
export function LinkMessageSection({ initial, errors }: Props) {
  return (
    <FormSection
      title="Segunda mensagem (o link)"
      description="Enviada quando a pessoa responde à primeira mensagem (e confirma que segue o perfil, se a porta de seguidor estiver ligada), dentro da janela de 24 horas."
    >
      <div>
        <Label
          htmlFor="secondDmText"
          hint="Até 80 caracteres; aparece como título."
        >
          Texto da mensagem com o link
        </Label>
        <Input
          id="secondDmText"
          name="secondDmText"
          maxLength={80}
          defaultValue={initial?.secondDmText ?? ""}
          placeholder="Ex.: Aqui está o link que você pediu"
          aria-invalid={errors.secondDmText ? true : undefined}
        />
        <FieldError message={errors.secondDmText} />
      </div>

      <div>
        <Label htmlFor="linkButtonTitle" hint="Até 20 caracteres.">
          Texto do botão do link
        </Label>
        <Input
          id="linkButtonTitle"
          name="linkButtonTitle"
          maxLength={20}
          defaultValue={initial?.linkButtonTitle ?? "Abrir link"}
          aria-invalid={errors.linkButtonTitle ? true : undefined}
        />
        <FieldError message={errors.linkButtonTitle} />
      </div>

      <div>
        <Label htmlFor="linkUrl" hint="Somente endereços https://.">
          URL do link
        </Label>
        <Input
          id="linkUrl"
          name="linkUrl"
          type="url"
          defaultValue={initial?.linkUrl ?? ""}
          className="font-mono"
          placeholder="https://www.exemplo.com"
          aria-invalid={errors.linkUrl ? true : undefined}
        />
        <FieldError message={errors.linkUrl} />
      </div>
    </FormSection>
  );
}

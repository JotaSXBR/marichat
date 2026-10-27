import { FieldError, Label } from "@/app/admin/automacoes/form-controls";
import type {
  AutomationInitialValues,
  FieldErrors,
} from "@/app/admin/automacoes/form-types";

type Props = {
  initial?: AutomationInitialValues;
  errors: FieldErrors;
};

/** Primeira DM, enviada como resposta privada ao comentário. */
export function FirstMessageSection({ initial, errors }: Props) {
  return (
    <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold">Primeira mensagem (privada)</h2>
        <p className="text-xs text-zinc-500">
          Enviada como resposta privada ao comentário. A Meta permite uma
          resposta por comentário, em até 7 dias. Ela sai como texto puro: peça
          que a pessoa responda para abrir a conversa.
        </p>
      </div>

      <div>
        <Label
          htmlFor="firstDmText"
          hint="Até 1.000 bytes. Termine pedindo uma resposta, por exemplo: “Responda esta mensagem para eu enviar o link”."
        >
          Texto da DM
        </Label>
        <textarea
          id="firstDmText"
          name="firstDmText"
          rows={4}
          defaultValue={initial?.firstDmText ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Ex.: Que bom que você se interessou! Responda esta mensagem que eu envio o link."
        />
        <FieldError message={errors.firstDmText} />
      </div>
    </section>
  );
}

/** Segunda mensagem: o link com botão. */
export function LinkMessageSection({ initial, errors }: Props) {
  return (
    <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold">Segunda mensagem (o link)</h2>
        <p className="text-xs text-zinc-500">
          Enviada quando a pessoa responde à primeira mensagem (e confirma que
          segue o perfil, se a porta de seguidor estiver ligada), dentro da
          janela de 24 horas.
        </p>
      </div>

      <div>
        <Label
          htmlFor="secondDmText"
          hint="Até 80 caracteres; aparece como título."
        >
          Texto da mensagem com o link
        </Label>
        <input
          id="secondDmText"
          name="secondDmText"
          maxLength={80}
          defaultValue={initial?.secondDmText ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Ex.: Aqui está o link que você pediu"
        />
        <FieldError message={errors.secondDmText} />
      </div>

      <div>
        <Label htmlFor="linkButtonTitle" hint="Até 20 caracteres.">
          Texto do botão do link
        </Label>
        <input
          id="linkButtonTitle"
          name="linkButtonTitle"
          maxLength={20}
          defaultValue={initial?.linkButtonTitle ?? "Abrir link"}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
        <FieldError message={errors.linkButtonTitle} />
      </div>

      <div>
        <Label htmlFor="linkUrl" hint="Somente endereços https://.">
          URL do link
        </Label>
        <input
          id="linkUrl"
          name="linkUrl"
          type="url"
          defaultValue={initial?.linkUrl ?? ""}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm"
          placeholder="https://www.exemplo.com"
        />
        <FieldError message={errors.linkUrl} />
      </div>
    </section>
  );
}

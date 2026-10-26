"use client";

import Link from "next/link";
import { useActionState } from "react";

import { saveAutomation, type AutomationFormState } from "@/app/admin/actions";

export type MediaOption = {
  id: string;
  label: string;
  thumbnailUrl?: string;
  permalink?: string;
};

export type AutomationInitialValues = {
  id?: string;
  name: string;
  keyword: string;
  mediaId: string;
  firstDmText: string;
  quickReplyTitle: string;
  secondDmText: string;
  linkButtonTitle: string;
  linkUrl: string;
  isActive: boolean;
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-red-700">{message}</p>;
}

function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {children}
      </label>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function AutomationForm({
  initial,
  mediaOptions,
  mediaError,
}: {
  initial?: AutomationInitialValues;
  mediaOptions: MediaOption[];
  mediaError?: string;
}) {
  const [state, formAction, pending] = useActionState<
    AutomationFormState | undefined,
    FormData
  >(saveAutomation, undefined);

  const errors = state?.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-8">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      {state?.error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {state.error}
        </div>
      ) : null}

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
                <span className="block text-sm font-medium">
                  Qualquer publicação
                </span>
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
                {option.thumbnailUrl ? (
                  // Imagem hospedada pela Meta; usamos <img> para não
                  // precisar liberar domínios dinâmicos no otimizador.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={option.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded bg-zinc-100 text-[10px] text-zinc-500">
                    sem foto
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm">{option.label}</span>
                  <span className="block font-mono text-[11px] text-zinc-500">
                    {option.id}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : (
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
        )}
      </section>

      <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold">Primeira mensagem (privada)</h2>
          <p className="text-xs text-zinc-500">
            Enviada como resposta privada ao comentário. A Meta permite uma
            resposta por comentário, em até 7 dias.
          </p>
        </div>

        <div>
          <Label
            htmlFor="firstDmText"
            hint="Até 1.000 bytes (aproximadamente 1.000 letras sem acento)."
          >
            Texto da DM
          </Label>
          <textarea
            id="firstDmText"
            name="firstDmText"
            rows={4}
            defaultValue={initial?.firstDmText ?? ""}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Ex.: Que bom que você se interessou! Toque no botão abaixo para receber o link."
          />
          <FieldError message={errors.firstDmText} />
        </div>

        <div>
          <Label htmlFor="quickReplyTitle" hint="Até 20 caracteres.">
            Texto do botão
          </Label>
          <input
            id="quickReplyTitle"
            name="quickReplyTitle"
            maxLength={20}
            defaultValue={initial?.quickReplyTitle ?? "Quero o link"}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <FieldError message={errors.quickReplyTitle} />
        </div>
      </section>

      <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold">Segunda mensagem (o link)</h2>
          <p className="text-xs text-zinc-500">
            Enviada somente quando a pessoa toca no botão, dentro da janela de 24
            horas.
          </p>
        </div>

        <div>
          <Label htmlFor="secondDmText" hint="Até 80 caracteres; aparece como título.">
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar automação"}
        </button>
        <Link
          href="/admin/automacoes"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

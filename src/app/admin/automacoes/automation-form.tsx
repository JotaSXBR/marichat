"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { saveAutomation } from "@/app/admin/actions";
import {
  DEFAULT_CONFIRM_LABEL,
  DEFAULT_FOLLOW_DIRECT_TEXT,
  DEFAULT_FOLLOW_GATE_TEXT,
  DEFAULT_FOLLOW_LABEL,
  DEFAULT_FOLLOW_OPTIONAL_TEXT,
} from "@/lib/automation-defaults";
import type { AutomationFormState } from "@/lib/automation-input";
import {
  FOLLOW_MODES,
  FOLLOW_MODE_LABELS,
  type FollowMode,
} from "@/lib/follow-mode";

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
  secondDmText: string;
  linkButtonTitle: string;
  linkUrl: string;
  followMode: FollowMode;
  followGateText: string;
  followGateFollowLabel: string;
  followGateConfirmLabel: string;
  followOptionalText: string;
  followDirectText: string;
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
  const [followMode, setFollowMode] = useState<FollowMode>(
    initial?.followMode ?? "off",
  );
  const needsCheck = followMode === "soft" || followMode === "locked";
  const needsFollowButton = needsCheck || followMode === "optional";

  return (
    <form action={formAction} className="space-y-8">
      {initial?.id ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      {state?.error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          {state.error}
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold">Identificação</h2>

        <div>
          <Label
            htmlFor="name"
            hint="Uso interno; não aparece para o seguidor."
          >
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
            <Label
              htmlFor="mediaId"
              hint="Deixe em branco para qualquer publicação."
            >
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
            resposta por comentário, em até 7 dias. Ela sai como texto puro:
            peça que a pessoa responda para abrir a conversa.
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

      <section className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
        <div>
          <h2 className="text-sm font-semibold">Porta de seguidor</h2>
          <p className="text-xs text-zinc-500">
            Escolha como o link é entregue depois que a pessoa responde à
            primeira mensagem. A consulta ao perfil só acontece depois que ela
            envia uma mensagem, como a Meta exige.
          </p>
        </div>

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
                  onChange={() => setFollowMode(mode)}
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

        {/* Campos dos outros modos continuam sendo enviados para não perder
            o texto já personalizado ao trocar de modo. */}
        {!needsCheck ? (
          <>
            <input
              type="hidden"
              name="followGateText"
              defaultValue={initial?.followGateText ?? DEFAULT_FOLLOW_GATE_TEXT}
            />
            <input
              type="hidden"
              name="followGateConfirmLabel"
              defaultValue={
                initial?.followGateConfirmLabel ?? DEFAULT_CONFIRM_LABEL
              }
            />
          </>
        ) : null}
        {followMode !== "optional" ? (
          <input
            type="hidden"
            name="followOptionalText"
            defaultValue={
              initial?.followOptionalText ?? DEFAULT_FOLLOW_OPTIONAL_TEXT
            }
          />
        ) : null}
        {followMode !== "direct" ? (
          <input
            type="hidden"
            name="followDirectText"
            defaultValue={
              initial?.followDirectText ?? DEFAULT_FOLLOW_DIRECT_TEXT
            }
          />
        ) : null}
        {!needsFollowButton ? (
          <input
            type="hidden"
            name="followGateFollowLabel"
            defaultValue={
              initial?.followGateFollowLabel ?? DEFAULT_FOLLOW_LABEL
            }
          />
        ) : null}

        {needsCheck ? (
          <div>
            <Label
              htmlFor="followGateText"
              hint={
                followMode === "locked"
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
        ) : null}

        {followMode === "optional" ? (
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
        ) : null}

        {followMode === "direct" ? (
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
              defaultValue={
                initial?.followDirectText ?? DEFAULT_FOLLOW_DIRECT_TEXT
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            />
            <FieldError message={errors.followDirectText} />
          </div>
        ) : null}

        {needsFollowButton ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="followGateFollowLabel" hint="Até 20 caracteres.">
                Botão para seguir
              </Label>
              <input
                id="followGateFollowLabel"
                name="followGateFollowLabel"
                maxLength={20}
                defaultValue={
                  initial?.followGateFollowLabel ?? DEFAULT_FOLLOW_LABEL
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
              <FieldError message={errors.followGateFollowLabel} />
            </div>
            {needsCheck ? (
              <div>
                <Label
                  htmlFor="followGateConfirmLabel"
                  hint="Até 20 caracteres."
                >
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

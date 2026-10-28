import type { ReactNode } from "react";

import type { FollowMode } from "@/lib/follow-mode";
import { cn } from "@/lib/utils";

export type PreviewValues = {
  firstDmText: string;
  firstDmButtonLabel: string;
  secondDmText: string;
  linkButtonTitle: string;
  followMode: FollowMode;
  followDirectText: string;
  followOptionalText: string;
};

/** Texto que a segunda DM realmente usa em cada modo. */
function secondText(values: PreviewValues): string {
  if (values.followMode === "direct") return values.followDirectText;
  if (values.followMode === "optional") return values.followOptionalText;
  return values.secondDmText;
}

/**
 * Bolha de mensagem enviada pela conta.
 *
 * O Instagram mostra a mensagem em fundo claro e o botão como uma linha
 * separada, dentro da mesma bolha — é isso que a prévia imita.
 */
function Bubble({
  children,
  button,
  muted,
}: {
  children: ReactNode;
  button?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={cn(
        "ml-auto max-w-[88%] overflow-hidden rounded-xl rounded-br-sm",
        muted
          ? "border border-dashed border-line-subtle text-muted-soft"
          : "bg-accent text-foreground",
      )}
    >
      <div className="px-3 py-2 text-[0.8125rem] leading-5 break-words whitespace-pre-line">
        {children}
      </div>
      {button ? (
        <div className="mx-2 mb-2 rounded-sm border border-line-strong px-2 py-2 text-center text-[0.8125rem] font-medium text-foreground">
          {button}
        </div>
      ) : null}
    </div>
  );
}

/** R5: prévia aproximada da conversa, ao lado do formulário. */
export function DmPreview({ values }: { values: PreviewValues }) {
  const firstButton = values.firstDmButtonLabel.trim();
  const second = secondText(values);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h2 className="text-[0.875rem] font-semibold text-foreground">
        Prévia da DM
      </h2>
      <p className="text-[0.75rem] text-muted-soft">
        Como a conversa deve chegar.
      </p>

      <div className="mt-3 overflow-hidden rounded-lg border border-line-subtle">
        <div className="flex items-center gap-2.5 border-b border-line-subtle px-3 py-2.5">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-[0.6875rem] font-semibold text-background"
          >
            J
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.8125rem] font-medium text-foreground">
              @jotasx
            </p>
            <p className="text-[0.6875rem] text-muted-soft">Instagram</p>
          </div>
        </div>

        <div className="space-y-2.5 p-3">
          <p className="text-center text-[0.6875rem] text-muted-soft">
            Enviada como resposta ao comentário
          </p>

          {values.firstDmText.trim() ? (
            <Bubble button={firstButton || undefined}>
              {values.firstDmText}
            </Bubble>
          ) : (
            <Bubble muted>A primeira mensagem aparece aqui.</Bubble>
          )}

          {second.trim() ? (
            <Bubble button={values.linkButtonTitle.trim() || "Abrir link"}>
              {second}
            </Bubble>
          ) : (
            <Bubble button="Abrir link" muted>
              O texto da mensagem com o link aparece aqui.
            </Bubble>
          )}
        </div>
      </div>

      <p className="mt-3 text-[0.75rem] leading-[1.125rem] text-muted-soft">
        Prévia aproximada. O Instagram pode alterar a aparência e a ordem dos
        botões.
      </p>
    </div>
  );
}

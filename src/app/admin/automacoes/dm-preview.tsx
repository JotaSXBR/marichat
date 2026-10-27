import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PreviewValues = {
  firstDmText: string;
  firstDmButtonLabel: string;
  secondDmText: string;
  linkButtonTitle: string;
};

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
        "ml-auto max-w-[88%] overflow-hidden rounded-2xl rounded-br-md",
        muted
          ? "border border-dashed border-line-subtle text-muted-soft"
          : "bg-muted text-foreground",
      )}
    >
      <div className="px-3 py-2 text-body break-words whitespace-pre-line">
        {children}
      </div>
      {button ? (
        <div className="border-t border-line-subtle px-3 py-2 text-center text-label font-medium text-primary">
          {button}
        </div>
      ) : null}
    </div>
  );
}

/** R5: prévia aproximada da conversa, ao lado do formulário. */
export function DmPreview({ values }: { values: PreviewValues }) {
  const firstButton = values.firstDmButtonLabel.trim();

  return (
    <Card className="gap-4 p-5">
      <div>
        <h2 className="text-title text-foreground">Prévia da DM</h2>
        <p className="text-label text-muted-foreground">
          Como a conversa deve chegar.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line-subtle bg-background/40">
        <div className="flex items-center gap-3 border-b border-line-subtle px-4 py-3">
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-label font-semibold text-primary-foreground"
          >
            J
          </span>
          <div className="min-w-0">
            <p className="truncate text-label font-medium text-foreground">
              @jotasx
            </p>
            <p className="text-micro text-muted-soft">Instagram</p>
          </div>
        </div>

        <div className="space-y-3 p-4">
          <p className="text-center text-micro text-muted-soft">
            Enviada como resposta ao comentário
          </p>

          {values.firstDmText.trim() ? (
            <Bubble button={firstButton || undefined}>
              {values.firstDmText}
            </Bubble>
          ) : (
            <Bubble muted>A primeira mensagem aparece aqui.</Bubble>
          )}

          {values.secondDmText.trim() ? (
            <Bubble button={values.linkButtonTitle.trim() || "Abrir link"}>
              {values.secondDmText}
            </Bubble>
          ) : (
            <Bubble muted button="Abrir link">
              O texto da mensagem com o link aparece aqui.
            </Bubble>
          )}
        </div>
      </div>

      <p className="text-label text-muted-foreground">
        Prévia aproximada. O Instagram pode alterar a aparência e a ordem dos
        botões.
      </p>
    </Card>
  );
}

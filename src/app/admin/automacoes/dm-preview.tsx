import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type PreviewValues = {
  firstDmText: string;
  secondDmText: string;
  linkButtonTitle: string;
};

function Bubble({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <div
      className={cn(
        "ml-auto max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-body whitespace-pre-line",
        muted
          ? "border border-dashed border-line-subtle text-muted-soft"
          : "bg-primary text-primary-foreground",
      )}
    >
      {children}
    </div>
  );
}

/** R5: prévia aproximada das duas DMs, à direita do formulário. */
export function DmPreview({ values }: { values: PreviewValues }) {
  return (
    <Card className="gap-4 p-5">
      <div>
        <h2 className="text-title text-foreground">Prévia da DM</h2>
        <p className="text-label text-muted-foreground">
          A primeira mensagem e a do link.
        </p>
      </div>

      <div className="space-y-2 rounded-[32px] border border-line-subtle bg-background/40 p-4">
        {values.firstDmText.trim() ? (
          <Bubble>{values.firstDmText}</Bubble>
        ) : (
          <Bubble muted>Sua primeira mensagem aparece aqui.</Bubble>
        )}

        <Bubble>
          <span className="block">
            {values.secondDmText.trim() || "Texto da mensagem com o link"}
          </span>
          <span className="mt-2 block rounded-md border border-line-strong px-3 py-1.5 text-center text-label font-medium">
            {values.linkButtonTitle.trim() || "Texto do botão"}
          </span>
        </Bubble>
      </div>

      <p className="text-label text-muted-foreground">
        Prévia aproximada. O Instagram pode alterar a aparência.
      </p>
    </Card>
  );
}

import type { ReactNode } from "react";

/**
 * R2 da v7: título, uma linha de dado real e a ação primária na mesma régua.
 * `meta` é contagem ou transporte em mono — nunca um eyebrow decorativo.
 */
export function PageHeader({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="flex items-start gap-6 border-b border-border pb-5">
      <div className="min-w-0">
        <h1 className="text-display text-foreground text-balance">{title}</h1>
        {meta ? (
          <p className="mt-2 font-mono text-mono text-muted-foreground">
            {meta}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </header>
  );
}

/** Régua de seção: título, contagem em mono e link de saída à direita. */
export function SectionHeading({
  title,
  meta,
  action,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-border pb-2.5">
      <h2 className="text-section text-foreground">{title}</h2>
      {meta ? (
        <span className="font-mono text-[0.75rem] text-muted-soft">{meta}</span>
      ) : null}
      {action ? <div className="ml-auto">{action}</div> : null}
    </div>
  );
}

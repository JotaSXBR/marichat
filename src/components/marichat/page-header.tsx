import type { ReactNode } from "react";

/**
 * R2 da v6: título, uma linha de contexto e a ação primária na mesma régua.
 * `meta` é dado do produto (contagem, transporte), em mono, nunca um eyebrow.
 */
export function PageHeader({
  title,
  description,
  action,
  meta,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-5 border-b border-border pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="text-display text-foreground text-balance">{title}</h1>
          {meta ? (
            <span className="font-mono text-mono text-muted-foreground">
              {meta}
            </span>
          ) : null}
        </div>
        <p className="mt-2 max-w-[62ch] text-pretty text-body text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

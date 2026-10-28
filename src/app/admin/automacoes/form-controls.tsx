import type { ReactNode } from "react";

import {
  FieldDescription,
  FieldError as UiFieldError,
  FieldLabel,
} from "@/components/ui/field";

/** Bloco do formulário: régua, título, explicação e campos. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border py-5 first:pt-0 last:border-b-0">
      <h2 className="text-section text-foreground">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-[70ch] text-[0.8125rem] leading-5 text-muted-soft">
          {description}
        </p>
      ) : null}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/**
 * Erro do campo. `role="alert"` anuncia na hora; o vínculo
 * `aria-describedby` fica de fora porque são muitos campos.
 * shortcut: sem aria-describedby, ligar o campo ao erro se o axe acusar.
 */
export function FieldError({ message }: { message?: string }) {
  return <UiFieldError errors={message ? [{ message }] : undefined} />;
}

/** Rótulo com dica opcional. */
export function Label({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2 space-y-1">
      <FieldLabel htmlFor={htmlFor}>{children}</FieldLabel>
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </div>
  );
}

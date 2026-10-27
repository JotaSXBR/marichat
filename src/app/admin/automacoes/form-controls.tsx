import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import {
  FieldDescription,
  FieldError as UiFieldError,
  FieldLabel,
} from "@/components/ui/field";

/** Bloco do formulário: título, explicação e campos. */
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
    <Card className="gap-5">
      <div className="space-y-1">
        <h2 className="text-section text-foreground">{title}</h2>
        {description ? (
          <p className="text-label text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-5">{children}</div>
    </Card>
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

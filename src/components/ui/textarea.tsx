import * as React from "react";
import { cn } from "cn";

/** Área de texto — mesmo contrato visual do Input, sem altura fixa. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-24 w-full rounded-md border border-input bg-muted px-3 py-2.5 text-body text-foreground transition-[border-color,box-shadow,background-color] duration-150 ease-out outline-none placeholder:text-muted-soft focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/40 disabled:cursor-not-allowed disabled:border-line-subtle disabled:bg-muted disabled:text-muted-soft aria-disabled:cursor-not-allowed aria-disabled:border-line-subtle aria-disabled:bg-muted aria-disabled:text-muted-soft",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };

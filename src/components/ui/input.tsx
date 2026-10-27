import * as React from "react";
import { cn } from "cn";

/**
 * Campo de texto — §6.4.
 * Altura 40, raio de controle, borda `--input` (3,49:1) e foco lime.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-input bg-muted px-3 py-2 text-body text-foreground transition-[border-color,box-shadow,background-color] duration-150 ease-out outline-none placeholder:text-muted-soft focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-line-subtle disabled:bg-muted disabled:text-muted-soft aria-disabled:pointer-events-none aria-disabled:border-line-subtle aria-disabled:bg-muted aria-disabled:text-muted-soft file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-label file:font-medium file:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Input };

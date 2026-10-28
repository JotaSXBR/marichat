import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Alerta â€” regiÃ£o R3 (Â§9). No mÃ¡ximo 2 empilhados.
 * Fundo tintado a 12% do tom, borda do mesmo tom, Ã­cone + texto.
 */
const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-lg border px-4 py-3 text-left text-body has-data-[slot=alert-action]:pr-20 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-3 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        info: "border-info/25 bg-info/12 text-info",
        warning: "border-warning/25 bg-warning/12 text-warning",
        danger: "border-danger/25 bg-danger/12 text-danger",
        success: "border-success/25 bg-success/12 text-success",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "text-label font-medium text-foreground group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-label text-pretty text-current md:text-pretty [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-3 right-3", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants };

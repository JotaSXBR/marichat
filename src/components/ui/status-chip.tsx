import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Situação — DESIGN.md v7 §6.2.
 *
 * Estado nunca só por cor (§2.7): todo estado tem ponto e texto. O ponto usa
 * `currentColor`, então acompanha o tom sem classe extra. Sem pílula: é
 * leitura de instrumento, não badge de SaaS.
 */
const statusChipVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 text-label whitespace-nowrap [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        success: "text-success",
        warning: "text-warning",
        danger: "text-danger",
        info: "text-info",
        neutral: "text-muted-foreground",
        loading: "text-info",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

function StatusChip({
  className,
  tone = "neutral",
  children,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof statusChipVariants>) {
  return (
    <span
      data-slot="status-chip"
      data-tone={tone}
      className={cn(statusChipVariants({ tone }), className)}
      {...props}
    >
      {tone === "loading" ? (
        <Loader2Icon className="motion-safe:animate-spin" aria-hidden />
      ) : (
        <span className="size-1.5 rounded-full bg-current" aria-hidden />
      )}
      {children}
    </span>
  );
}

export { StatusChip, statusChipVariants };

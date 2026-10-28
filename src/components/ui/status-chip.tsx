import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chip de status â€” `badge` do shadcn adaptado (Â§6.2).
 *
 * Estado nunca sÃ³ por cor (Â§2.7): todo chip tem ponto ou spinner e texto.
 * O ponto usa `currentColor`, entÃ£o acompanha o tom sem classe extra.
 */
const statusChipVariants = cva(
  "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-sm border px-2 text-micro tracking-[0.04em] whitespace-nowrap uppercase [&>svg]:size-3 [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        success: "border-success/25 bg-success/12 text-success",
        warning: "border-warning/25 bg-warning/12 text-warning",
        danger: "border-danger/25 bg-danger/12 text-danger",
        info: "border-info/25 bg-info/12 text-info",
        neutral: "border-line-subtle bg-secondary text-muted-foreground",
        loading: "border-info/25 bg-info/12 text-info",
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

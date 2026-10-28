import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slot } from "radix-ui";

/**
 * BotÃ£o â€” DESIGN.md Â§6.4.
 * Variantes: primary (padrÃ£o), secondary, ghost, destructive.
 * Alturas: sm 32, md 40 (padrÃ£o), lg 48. Raio de controle: 12 px.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent text-label whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:border-line-subtle disabled:bg-muted disabled:text-muted-soft aria-disabled:pointer-events-none aria-disabled:border-line-subtle aria-disabled:bg-muted aria-disabled:text-muted-soft active:not-aria-[haspopup]:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-surface-hover",
        ghost: "text-foreground hover:bg-surface-hover hover:text-foreground",
        destructive:
          "border-danger/30 bg-danger/10 text-danger hover:border-danger/50 hover:bg-danger/20",
      },
      size: {
        sm: "h-8 px-3",
        default: "h-10 px-4",
        lg: "h-12 px-6",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** MantÃ©m a largura final e anuncia o estado (Â§7). */
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "button";

  // Em `loading` o conteÃºdo fica invisÃ­vel e o spinner entra por cima:
  // a largura final nÃ£o muda (Â§7, sem layout shift).
  const content = loading ? (
    <>
      <span className="absolute inset-0 grid place-items-center">
        <Loader2Icon className="size-4 animate-spin" aria-hidden />
      </span>
      <span className="invisible inline-flex items-center gap-2">
        {children}
      </span>
      <span className="sr-only">Carregando</span>
    </>
  ) : (
    children
  );

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        buttonVariants({ variant, size, className }),
        loading && "relative",
      )}
      {...props}
    >
      {content}
    </Comp>
  );
}

export { Button, buttonVariants };

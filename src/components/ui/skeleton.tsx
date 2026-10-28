import { cn } from "@/lib/utils";

/** Skeleton â€” Â§7: mesmo tamanho do conteÃºdo final, sem layout shift. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn("animate-pulse rounded-md bg-secondary", className)}
      {...props}
    />
  );
}

export { Skeleton };

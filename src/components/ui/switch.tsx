"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Switch as SwitchPrimitive } from "radix-ui";

/**
 * Toggle de automaÃ§Ã£o â€” Â§6.2.
 * Ligado = lime; desligado = `--input`. O estado tambÃ©m Ã© lido por
 * `aria-checked` (nunca sÃ³ cor).
 */
function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border border-transparent transition-colors duration-150 ease-out outline-none after:absolute after:-inset-3 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-invalid:border-danger aria-invalid:ring-2 aria-invalid:ring-danger/40 data-[size=default]:h-6 data-[size=default]:w-10 data-[size=sm]:h-5 data-[size=sm]:w-8 data-checked:bg-success data-unchecked:bg-input data-disabled:cursor-not-allowed data-disabled:border-line-subtle data-disabled:bg-muted",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block rounded-full bg-[var(--switch-thumb)] ring-0 transition-transform duration-150 ease-out group-data-[size=default]/switch:size-5 group-data-[size=sm]/switch:size-4 group-data-[size=default]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-checked:translate-x-[calc(100%-2px)] group-data-[size=default]/switch:data-unchecked:translate-x-0.5 group-data-[size=sm]/switch:data-unchecked:translate-x-0.5 group-data-disabled/switch:bg-muted-soft"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };

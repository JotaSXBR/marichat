import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Ação primária na zona do polegar: barra fixa acima das abas, só no mobile.
 * No desktop a mesma ação vive no cabeçalho (R2).
 */
export function MobileActionBar({ href }: { href: string }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-background p-3 md:hidden">
      <Button asChild className="w-full" size="lg">
        <Link href={href}>
          <PlusIcon aria-hidden />
          Nova automação
        </Link>
      </Button>
    </div>
  );
}

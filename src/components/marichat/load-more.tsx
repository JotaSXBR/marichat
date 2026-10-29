import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * Rodapé de lista truncada (§7): "Mostrando X de N" + "Carregar mais".
 * O href é opcional para o teto de leitura não virar um link que não avança.
 */
export function LoadMore({
  shown,
  total,
  href,
}: {
  shown: number;
  total: number;
  href?: string;
}) {
  if (shown >= total) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-subtle py-3">
      <p className="font-mono text-[0.75rem] text-muted-soft">
        Mostrando {shown} de {total}
      </p>
      {href ? (
        <Button asChild size="sm" variant="secondary">
          <Link href={href}>Carregar mais</Link>
        </Button>
      ) : null}
    </div>
  );
}

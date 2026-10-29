import { Skeleton } from "@/components/ui/skeleton";

/**
 * Fallback das telas do painel (§7): R2 + cinco linhas de tabela. Um único
 * arquivo porque todas as telas usam a mesma gramática de instrumento.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only">Carregando o painel</span>

      <div className="flex items-start gap-6 border-b border-border pb-5">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-[34px] w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-12 w-40 shrink-0" />
      </div>

      <div className="space-y-0">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            className="flex items-center gap-4 border-b border-line-subtle py-3.5"
            key={index}
          >
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

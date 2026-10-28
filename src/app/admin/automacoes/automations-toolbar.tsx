import Link from "next/link";

import { FilterSelect } from "@/components/marichat/filter-select";
import { Input } from "@/components/ui/input";

export type AutomationFilter = "ativa" | "pausada";

const SELECT_CLASS =
  "h-11 w-[180px] rounded-md border border-input bg-muted px-3 text-label text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:w-[200px] md:h-9";

/** Busca e filtro da lista; o estado vive na URL. */
export function AutomationsToolbar({
  q,
  situacao,
}: {
  q: string;
  situacao?: AutomationFilter;
}) {
  const filtering = Boolean(q || situacao);

  return (
    <form
      action="/admin/automacoes"
      className="flex flex-col gap-2 pt-5 sm:flex-row sm:flex-wrap sm:items-center"
      method="get"
    >
      <div className="min-w-0 sm:flex-1 sm:max-w-[320px]">
        <label className="sr-only" htmlFor="q">
          Buscar por nome ou palavra-chave
        </label>
        <Input
          className="h-11 md:h-9"
          defaultValue={q}
          id="q"
          name="q"
          placeholder="Buscar por nome ou palavra-chave"
          type="search"
        />
      </div>

      <label className="sr-only" htmlFor="situacao">
        Situação
      </label>
      <FilterSelect
        className={SELECT_CLASS}
        defaultValue={situacao ?? ""}
        id="situacao"
        name="situacao"
      >
        <option value="">Todas</option>
        <option value="ativa">Ativas</option>
        <option value="pausada">Pausadas</option>
      </FilterSelect>

      {filtering ? (
        <Link
          className="flex h-11 items-center px-2 text-label text-muted-foreground hover:text-foreground md:h-9"
          href="/admin/automacoes"
        >
          Limpar
        </Link>
      ) : null}
    </form>
  );
}

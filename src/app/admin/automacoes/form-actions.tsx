import Link from "next/link";

/** Botões de salvar e cancelar, com estado de envio. */
export function FormActions({ pending }: { pending: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar automação"}
      </button>
      <Link
        href="/admin/automacoes"
        className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm hover:bg-zinc-50"
      >
        Cancelar
      </Link>
    </div>
  );
}

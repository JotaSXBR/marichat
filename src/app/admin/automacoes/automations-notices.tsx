import Link from "next/link";

export function SavedNotice() {
  return (
    <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
      Automação salva. A primeira DM já agendada mantém o texto antigo; os
      demais textos valem para os próximos envios.
    </div>
  );
}

export function NoAccountNotice() {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      Conecte o Instagram antes de criar automações.{" "}
      <Link href="/admin/conexao" className="font-medium underline">
        Ir para Conexão
      </Link>
    </div>
  );
}

export function EmptyAutomations() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
      <p className="text-sm text-zinc-600">
        Nenhuma automação criada ainda. A primeira leva menos de dois minutos.
      </p>
      <Link
        href="/admin/automacoes/nova"
        className="mt-4 inline-block rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
      >
        Criar automação
      </Link>
    </div>
  );
}

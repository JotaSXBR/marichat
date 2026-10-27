import Link from "next/link";

/** Bloco exibido quando ainda não há conta conectada. */
export function ConnectAccountNotice() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Editar automação</h1>
      <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Conecte uma conta do Instagram primeiro.{" "}
        <Link href="/admin/conexao" className="font-medium underline">
          Ir para Conexão
        </Link>
      </p>
    </div>
  );
}

export function EditAutomationHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Editar automação</h1>
      <p className="mt-1 text-sm text-zinc-600">
        O texto da primeira DM fica congelado no comentário. O modo da porta e
        os textos da segunda mensagem valem para os próximos envios, inclusive
        de conversas em andamento.
      </p>
    </div>
  );
}

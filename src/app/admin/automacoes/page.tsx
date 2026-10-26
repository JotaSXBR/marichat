import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";

import { toggleAutomation } from "@/app/admin/actions";
import { getActiveAccount } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db/client";
import { automations } from "@/lib/db/schema";

export const instant = false;

export default async function AutomationsPage({
  searchParams,
}: PageProps<"/admin/automacoes">) {
  await connection();
  await requireAdmin();

  const params = await searchParams;
  const saved = params.ok === "1";

  const account = await getActiveAccount();
  const db = getDb();
  const rows = account
    ? await db
        .select()
        .from(automations)
        .where(eq(automations.accountId, account.id))
        .orderBy(desc(automations.createdAt))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Automações</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Cada automação escuta uma palavra-chave nos comentários e responde com
            uma DM.
          </p>
        </div>
        <Link
          href="/admin/automacoes/nova"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Nova automação
        </Link>
      </div>

      {saved ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          Automação salva. Alterações valem apenas para comentários novos.
        </div>
      ) : null}

      {!account ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Conecte o Instagram antes de criar automações.{" "}
          <Link href="/admin/conexao" className="font-medium underline">
            Ir para Conexão
          </Link>
        </div>
      ) : null}

      {account && rows.length === 0 ? (
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
      ) : null}

      {rows.length > 0 ? (
        <ul className="space-y-3">
          {rows.map((automation) => (
            <li
              key={automation.id}
              className="rounded-lg border border-zinc-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium">{automation.name}</h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        automation.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {automation.isActive ? "Ativa" : "Desativada"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-zinc-600">
                    Palavra-chave: <strong>{automation.keyword}</strong>
                  </p>
                  <p className="text-sm text-zinc-500">
                    Publicação:{" "}
                    {automation.mediaId
                      ? `específica (${automation.mediaId})`
                      : "qualquer publicação"}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    Link: {automation.linkUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <form action={toggleAutomation}>
                    <input type="hidden" name="id" value={automation.id} />
                    <input
                      type="hidden"
                      name="activate"
                      value={automation.isActive ? "0" : "1"}
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                    >
                      {automation.isActive ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  <Link
                    href={`/admin/automacoes/${automation.id}`}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

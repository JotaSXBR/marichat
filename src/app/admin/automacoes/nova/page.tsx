import Link from "next/link";
import { connection } from "next/server";

import { AutomationForm } from "@/app/admin/automacoes/automation-form";
import { loadMediaOptions } from "@/app/admin/automacoes/media-options";
import { getActiveAccount } from "@/lib/accounts";
import { requireAdmin } from "@/lib/auth";

export default async function NewAutomationPage() {
  await connection();
  await requireAdmin();

  const account = await getActiveAccount();
  const media = account ? await loadMediaOptions(account) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nova automação</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Defina o comentário que dispara a conversa e as duas mensagens.
        </p>
      </div>

      {!account || !media ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Conecte uma conta do Instagram antes de criar automações.{" "}
          <Link href="/admin/conexao" className="font-medium underline">
            Ir para Conexão
          </Link>
        </div>
      ) : (
        <AutomationForm
          mediaOptions={media.options}
          {...(media.error ? { mediaError: media.error } : {})}
        />
      )}
    </div>
  );
}

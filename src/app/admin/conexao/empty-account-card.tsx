import { ZernioAccountPicker } from "@/app/admin/conexao/zernio-account-picker";
import type { ZernioAccount } from "@/lib/zernio/client";

type Props = {
  isZernio: boolean;
  zernioAccounts: ZernioAccount[];
  zernioListError: string | null;
};

/** Estado sem conta vinculada: conectar pela Zernio ou pela Meta. */
export function EmptyAccountCard({
  isZernio,
  zernioAccounts,
  zernioListError,
}: Props) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-sm font-medium">Conta atual</h2>
      <div className="mt-3 space-y-4 text-sm">
        {isZernio ? (
          <>
            <p className="text-zinc-600">
              Nenhuma conta vinculada no MARICHAT. A conta do Instagram precisa
              estar conectada primeiro no painel da Zernio; depois escolha
              abaixo qual usar.
            </p>
            <ZernioAccountPicker
              accounts={zernioAccounts}
              listError={zernioListError}
            />
          </>
        ) : (
          <>
            <p className="text-zinc-600">
              Nenhuma conta conectada. Use uma conta profissional do Instagram
              (criador ou empresa) com acesso às mensagens.
            </p>
            <a
              href="/api/auth/instagram/start"
              className="inline-block rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            >
              Conectar Instagram
            </a>
          </>
        )}
      </div>
    </section>
  );
}

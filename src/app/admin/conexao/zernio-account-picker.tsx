import { connectZernio } from "@/app/admin/conexao/actions";
import type { ZernioAccount } from "@/lib/zernio/client";
import { isZernioConfigured } from "@/lib/zernio/config";

type Props = {
  accounts: ZernioAccount[];
  listError: string | null;
};

/** Escolha da conta quando o transporte é a Zernio. */
export function ZernioAccountPicker({ accounts, listError }: Props) {
  if (listError) {
    return (
      <p className="rounded-md border border-red-300 bg-red-50 p-3 text-red-900">
        Não foi possível consultar a Zernio: {listError}
      </p>
    );
  }

  if (accounts.length === 0) {
    if (!isZernioConfigured()) return null;
    return (
      <p className="text-zinc-600">
        A Zernio ainda não tem nenhuma conta do Instagram conectada. Conecte no
        painel dela e recarregue esta página.
      </p>
    );
  }

  return (
    <form action={connectZernio} className="space-y-3">
      <label className="block text-sm font-medium" htmlFor="accountId">
        Conta da Zernio
      </label>
      <select
        id="accountId"
        name="accountId"
        defaultValue={accounts[0]?.id}
        className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
      >
        {accounts.map((item) => (
          <option key={item.id} value={item.id}>
            @{item.username ?? item.id}
            {item.isActive ? "" : " (inativa)"}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-md bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
      >
        Conectar conta da Zernio
      </button>
    </form>
  );
}

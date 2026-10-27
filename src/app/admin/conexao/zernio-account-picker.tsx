import { connectZernio } from "@/app/admin/conexao/actions";
import type { ZernioAccount } from "@/lib/zernio/client";
import { isZernioConfigured } from "@/lib/zernio/config";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TriangleAlertIcon } from "lucide-react";

type Props = {
  accounts: ZernioAccount[];
  listError: string | null;
};

/** Escolha da conta quando o transporte é a Zernio. */
export function ZernioAccountPicker({ accounts, listError }: Props) {
  if (listError) {
    return (
      <Alert variant="danger">
        <TriangleAlertIcon aria-hidden />
        <AlertTitle>Não foi possível consultar a Zernio</AlertTitle>
        <AlertDescription>{listError}</AlertDescription>
      </Alert>
    );
  }

  if (accounts.length === 0) {
    if (!isZernioConfigured()) return null;
    return (
      <p className="text-body text-muted-foreground">
        A Zernio ainda não tem nenhuma conta do Instagram conectada. Conecte no
        painel dela e recarregue esta página.
      </p>
    );
  }

  return (
    <form action={connectZernio} className="w-full space-y-3">
      <div>
        <Label htmlFor="accountId">Conta da Zernio</Label>
        <select
          id="accountId"
          name="accountId"
          defaultValue={accounts[0]?.id}
          className="h-10 w-full rounded-md border border-input bg-muted px-3 text-body text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              @{item.username ?? item.id}
              {item.isActive ? "" : " (inativa)"}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit">Conectar conta da Zernio</Button>
    </form>
  );
}

import { ZernioAccountPicker } from "@/app/admin/conexao/zernio-account-picker";
import type { ZernioAccount } from "@/lib/zernio/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link2Icon } from "lucide-react";

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
    <Card className="items-start gap-4">
      <CardHeader>
        <CardTitle>Nenhuma conta conectada</CardTitle>
        <CardDescription>
          {isZernio
            ? "A conta do Instagram precisa estar conectada primeiro no painel da Zernio; depois escolha abaixo qual usar."
            : "Use uma conta profissional do Instagram (criador ou empresa) com acesso às mensagens."}
        </CardDescription>
      </CardHeader>

      {isZernio ? (
        <ZernioAccountPicker
          accounts={zernioAccounts}
          listError={zernioListError}
        />
      ) : (
        <Button asChild>
          <a href="/api/auth/instagram/start">
            <Link2Icon aria-hidden />
            Conectar Instagram
          </a>
        </Button>
      )}
    </Card>
  );
}
